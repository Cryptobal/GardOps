require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function fixPermissions() {
  try {
    console.log('🔧 Verificando y corrigiendo permisos de Central Monitoring...\n');

    // 1. Verificar si la tabla central_llamados existe
    console.log('1. Verificando tabla central_llamados...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'central_llamados'
      );
    `;
    console.log('   Tabla existe:', tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log('   ❌ La tabla central_llamados no existe. Ejecuta el script create-central-monitoring.sql');
      return;
    }

    // 2. Verificar permisos existentes
    console.log('\n2. Verificando permisos existentes...');
    const permissions = await sql`
      SELECT code, description 
      FROM rbac_permisos 
      WHERE code LIKE 'central_monitoring.%';
    `;
    console.log('   Permisos encontrados:', permissions.rows.length);
    permissions.rows.forEach(row => {
      console.log(`   - ${row.code}: ${row.description}`);
    });

    // 3. Insertar permisos si no existen
    console.log('\n3. Insertando permisos...');
    await sql`
      INSERT INTO rbac_permisos (code, description) VALUES
        ('central_monitoring.view', 'Ver Central de Monitoreo'),
        ('central_monitoring.record', 'Registrar estados de llamados'),
        ('central_monitoring.configure', 'Configurar cadencia/ventanas por instalación'),
        ('central_monitoring.export', 'Exportar y ver reportes de monitoreo')
      ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
    `;
    console.log('   ✅ Permisos insertados/actualizados');

    // 4. Verificar rol de operador
    console.log('\n4. Verificando rol de operador...');
    const roles = await sql`
      SELECT code, name, description 
      FROM rbac_roles 
      WHERE code = 'central_monitoring.operator';
    `;
    console.log('   Roles encontrados:', roles.rows.length);

    // 5. Crear rol si no existe
    if (roles.rows.length === 0) {
      console.log('   Creando rol de operador...');
      await sql`
        INSERT INTO rbac_roles (tenant_id, code, name, description, is_system)
        VALUES (NULL, 'central_monitoring.operator', 'Central Monitoring Operator', 'Operador de Central de Monitoreo', false);
      `;
      console.log('   ✅ Rol creado');
    } else {
      console.log('   ✅ Rol ya existe');
    }

    // 6. Asignar permisos al rol
    console.log('\n5. Asignando permisos al rol...');
    await sql`
      INSERT INTO rbac_roles_permisos (rol_id, permiso_id)
      SELECT r.id, p.id
      FROM rbac_roles r
      CROSS JOIN rbac_permisos p
      WHERE r.code = 'central_monitoring.operator'
      AND p.code LIKE 'central_monitoring.%'
      ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    `;
    console.log('   ✅ Permisos asignados');

    // 7. Verificar asignaciones
    console.log('\n6. Verificando asignaciones...');
    const assignments = await sql`
      SELECT 
        r.name as rol,
        p.code as permiso,
        p.description as descripcion_permiso
      FROM rbac_roles r
      JOIN rbac_roles_permisos rp ON r.id = rp.rol_id
      JOIN rbac_permisos p ON rp.permiso_id = p.id
      WHERE r.code = 'central_monitoring.operator';
    `;
    console.log('   Asignaciones encontradas:', assignments.rows.length);
    assignments.rows.forEach(row => {
      console.log(`   - ${row.rol}: ${row.permiso}`);
    });

    // 8. Verificar datos de ejemplo
    console.log('\n7. Verificando datos de ejemplo...');
    const dataCount = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'exitoso' THEN 1 END) as exitosos
      FROM central_llamados;
    `;
    console.log('   Datos en central_llamados:', dataCount.rows[0]);

    // 9. Generar datos de prueba si no hay datos
    if (dataCount.rows[0].total === 0) {
      console.log('\n8. Generando datos de prueba...');
      await sql`
        INSERT INTO central_llamados (
          instalacion_id,
          programado_para,
          estado,
          contacto_tipo,
          contacto_nombre,
          contacto_telefono,
          tenant_id
        )
        SELECT 
          i.id as instalacion_id,
          (CURRENT_DATE + INTERVAL '6 hours' + (generate_series(0, 7) * INTERVAL '2 hours')) as programado_para,
          'pendiente' as estado,
          'instalacion' as contacto_tipo,
          i.nombre as contacto_nombre,
          i.telefono as contacto_telefono,
          i.tenant_id
        FROM instalaciones i
        WHERE i.tenant_id IS NOT NULL
        LIMIT 10
        ON CONFLICT DO NOTHING;
      `;
      console.log('   ✅ Datos de prueba generados');
    }

    console.log('\n✅ Permisos verificados y corregidos exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPermissions();
