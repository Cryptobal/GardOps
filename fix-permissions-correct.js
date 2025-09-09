require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function fixPermissionsCorrect() {
  try {
    console.log('🔧 Verificando y corrigiendo permisos de Central Monitoring...\n');

    // 1. Verificar permisos existentes
    console.log('1. Verificando permisos existentes...');
    const permissions = await sql`
      SELECT codigo, nombre, descripcion 
      FROM rbac_permisos 
      WHERE codigo LIKE 'central_monitoring.%';
    `;
    console.log('   Permisos encontrados:', permissions.rows.length);
    permissions.rows.forEach(row => {
      console.log(`   - ${row.codigo}: ${row.nombre}`);
    });

    // 2. Insertar permisos si no existen
    console.log('\n2. Insertando permisos...');
    await sql`
      INSERT INTO rbac_permisos (codigo, nombre, descripcion) VALUES
        ('central_monitoring.view', 'Ver Central de Monitoreo', 'Permite ver la Central de Monitoreo y sus datos'),
        ('central_monitoring.record', 'Registrar Llamados', 'Permite registrar el resultado de llamados de monitoreo'),
        ('central_monitoring.configure', 'Configurar Monitoreo', 'Permite configurar la cadencia y ventanas de monitoreo'),
        ('central_monitoring.export', 'Exportar Reportes', 'Permite exportar reportes y datos de monitoreo')
      ON CONFLICT (codigo) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion;
    `;
    console.log('   ✅ Permisos insertados/actualizados');

    // 3. Verificar rol de operador
    console.log('\n3. Verificando rol de operador...');
    const roles = await sql`
      SELECT codigo, nombre, descripcion 
      FROM rbac_roles 
      WHERE codigo = 'central_monitoring.operator';
    `;
    console.log('   Roles encontrados:', roles.rows.length);

    // 4. Crear rol si no existe
    if (roles.rows.length === 0) {
      console.log('   Creando rol de operador...');
      await sql`
        INSERT INTO rbac_roles (codigo, nombre, descripcion)
        VALUES ('central_monitoring.operator', 'Central Monitoring Operator', 'Operador de Central de Monitoreo');
      `;
      console.log('   ✅ Rol creado');
    } else {
      console.log('   ✅ Rol ya existe');
    }

    // 5. Obtener IDs para asignar permisos
    console.log('\n4. Obteniendo IDs para asignaciones...');
    const roleId = await sql`
      SELECT id FROM rbac_roles WHERE codigo = 'central_monitoring.operator' LIMIT 1;
    `;
    
    const permissionIds = await sql`
      SELECT id FROM rbac_permisos WHERE codigo LIKE 'central_monitoring.%';
    `;
    
    console.log('   ID del rol:', roleId.rows[0]?.id);
    console.log('   IDs de permisos:', permissionIds.rows.map(p => p.id));

    // 6. Asignar permisos al rol
    if (roleId.rows[0] && permissionIds.rows.length > 0) {
      console.log('\n5. Asignando permisos al rol...');
      
      for (const perm of permissionIds.rows) {
        await sql`
          INSERT INTO rbac_roles_permisos (role_id, permission_id, rol_codigo, permiso_cod, granted)
          VALUES (${roleId.rows[0].id}, ${perm.id}, 'central_monitoring.operator', ${perm.id}, true)
          ON CONFLICT (role_id, permission_id) DO UPDATE SET 
            granted = true,
            rol_codigo = 'central_monitoring.operator',
            permiso_cod = ${perm.id};
        `;
      }
      console.log('   ✅ Permisos asignados');
    }

    // 7. Verificar asignaciones
    console.log('\n6. Verificando asignaciones...');
    const assignments = await sql`
      SELECT 
        r.nombre as rol,
        p.codigo as permiso,
        p.nombre as nombre_permiso,
        rp.granted
      FROM rbac_roles r
      JOIN rbac_roles_permisos rp ON r.id = rp.role_id
      JOIN rbac_permisos p ON rp.permission_id = p.id
      WHERE r.codigo = 'central_monitoring.operator';
    `;
    console.log('   Asignaciones encontradas:', assignments.rows.length);
    assignments.rows.forEach(row => {
      console.log(`   - ${row.rol}: ${row.permiso} (${row.nombre_permiso}) - Granted: ${row.granted}`);
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

fixPermissionsCorrect();
