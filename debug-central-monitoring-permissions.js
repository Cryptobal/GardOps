require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function debugCentralMonitoringPermissions() {
  try {
    console.log('🔍 Diagnóstico de permisos Central de Monitoreo para Carlos Irigoyen\n');

    // 1. Verificar usuario Carlos
    console.log('1. Verificando usuario Carlos...');
    const { rows: userRows } = await sql`
      SELECT id, email, nombre, apellido, activo, tenant_id
      FROM usuarios 
      WHERE email = 'carlos.irigoyen@gard.cl'
    `;
    
    if (userRows.length === 0) {
      console.log('❌ Usuario Carlos no encontrado');
      return;
    }
    
    const user = userRows[0];
    console.log('✅ Usuario encontrado:', user);

    // 2. Verificar roles asignados
    console.log('\n2. Verificando roles asignados...');
    const { rows: roleRows } = await sql`
      SELECT r.nombre, r.descripcion, ur.created_at
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${user.id}
      ORDER BY r.nombre
    `;
    
    console.log('Roles asignados:', roleRows.length);
    roleRows.forEach(role => {
      console.log(`   - ${role.nombre}: ${role.descripcion}`);
    });

    // 3. Verificar permisos específicos del Central de Monitoreo
    console.log('\n3. Verificando permisos de Central de Monitoreo...');
    const { rows: permRows } = await sql`
      SELECT p.clave, p.descripcion, p.categoria
      FROM permisos p
      WHERE p.clave LIKE 'central_monitoring.%'
      ORDER BY p.clave
    `;
    
    console.log('Permisos de Central de Monitoreo encontrados:', permRows.length);
    permRows.forEach(perm => {
      console.log(`   - ${perm.clave}: ${perm.descripcion}`);
    });

    // 4. Verificar permisos asignados al usuario (corregido)
    console.log('\n4. Verificando permisos asignados al usuario...');
    const { rows: userPermRows } = await sql`
      SELECT p.clave, p.descripcion, p.categoria
      FROM usuarios_permisos up
      JOIN permisos p ON p.id = up.permiso_id
      WHERE up.usuario_id = ${user.id}
      AND p.clave LIKE 'central_monitoring.%'
      ORDER BY p.clave
    `;
    
    console.log('Permisos de Central de Monitoreo asignados al usuario:', userPermRows.length);
    userPermRows.forEach(perm => {
      console.log(`   - ${perm.clave}: ${perm.descripcion}`);
    });

    // 5. Verificar permisos a través de roles
    console.log('\n5. Verificando permisos a través de roles...');
    const { rows: rolePermRows } = await sql`
      SELECT p.clave, p.descripcion, p.categoria, r.nombre as rol_nombre
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      JOIN roles_permisos rp ON rp.rol_id = r.id
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE ur.usuario_id = ${user.id}
      AND p.clave LIKE 'central_monitoring.%'
      ORDER BY r.nombre, p.clave
    `;
    
    console.log('Permisos de Central de Monitoreo a través de roles:', rolePermRows.length);
    rolePermRows.forEach(perm => {
      console.log(`   - ${perm.clave} (${perm.rol_nombre}): ${perm.descripcion}`);
    });

    // 6. Verificar si el usuario es super admin
    console.log('\n6. Verificando si es super admin...');
    const { rows: adminRows } = await sql`
      SELECT r.nombre, r.descripcion
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${user.id}
      AND r.nombre IN ('admin', 'super_admin', 'Super Admin')
    `;
    
    if (adminRows.length > 0) {
      console.log('✅ Usuario tiene rol de administrador:', adminRows[0].nombre);
    } else {
      console.log('❌ Usuario NO tiene rol de administrador');
    }

    // 7. Verificar tablas del Central de Monitoreo
    console.log('\n7. Verificando tablas del Central de Monitoreo...');
    const tables = ['central_config_instalacion', 'central_llamados', 'central_incidentes'];
    
    for (const table of tables) {
      const { rows: tableRows } = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        ) as exists
      `;
      console.log(`   - ${table}: ${tableRows[0].exists ? '✅ Existe' : '❌ No existe'}`);
    }

    // 8. Verificar vista de turnos activos
    console.log('\n8. Verificando vista de turnos activos...');
    const { rows: viewRows } = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'central_v_turnos_activos'
      ) as exists
    `;
    console.log(`   Vista central_v_turnos_activos: ${viewRows[0].exists ? '✅ Existe' : '❌ No existe'}`);

    // 9. Verificar datos en las tablas
    console.log('\n9. Verificando datos en las tablas...');
    const { rows: configRows } = await sql`
      SELECT COUNT(*) as count FROM central_config_instalacion WHERE habilitado = true
    `;
    console.log(`   Configuraciones habilitadas: ${configRows[0].count}`);

    const { rows: llamadosRows } = await sql`
      SELECT COUNT(*) as count FROM central_llamados
    `;
    console.log(`   Llamados registrados: ${llamadosRows[0].count}`);

    // 10. Verificar estructura de la tabla usuarios_permisos
    console.log('\n10. Verificando estructura de usuarios_permisos...');
    const { rows: structureRows } = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios_permisos' 
      ORDER BY ordinal_position
    `;
    console.log('Columnas de usuarios_permisos:');
    structureRows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n🔍 Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error en el diagnóstico:', error);
  }
}

debugCentralMonitoringPermissions();
