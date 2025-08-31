require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function verifyCentralMonitoringFix() {
  try {
    console.log('🔍 Verificación final de permisos Central de Monitoreo para Carlos\n');

    // 1. Verificar usuario Carlos
    const { rows: userRows } = await sql`
      SELECT id, email, nombre, apellido, activo, tenant_id
      FROM usuarios 
      WHERE email = 'carlos.irigoyen@gard.cl'
    `;
    
    const user = userRows[0];
    console.log('✅ Usuario Carlos:', user.email);

    // 2. Verificar roles asignados
    const { rows: roleRows } = await sql`
      SELECT r.nombre, r.descripcion
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${user.id}
      ORDER BY r.nombre
    `;
    
    console.log('\n📋 Roles asignados a Carlos:');
    roleRows.forEach(role => {
      console.log(`   ✅ ${role.nombre}: ${role.descripcion}`);
    });

    // 3. Verificar permisos de Central de Monitoreo a través de roles
    const { rows: permRows } = await sql`
      SELECT DISTINCT p.clave, p.descripcion, r.nombre as rol_nombre
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      JOIN roles_permisos rp ON rp.rol_id = r.id
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE ur.usuario_id = ${user.id}
      AND p.clave LIKE 'central_monitoring.%'
      ORDER BY p.clave
    `;
    
    console.log('\n🔐 Permisos de Central de Monitoreo disponibles:');
    if (permRows.length === 0) {
      console.log('   ❌ No tiene permisos de Central de Monitoreo');
    } else {
      permRows.forEach(perm => {
        console.log(`   ✅ ${perm.clave} (${perm.rol_nombre}): ${perm.descripcion}`);
      });
    }

    // 4. Verificar si tiene todos los permisos necesarios
    const requiredPerms = [
      'central_monitoring.view',
      'central_monitoring.record', 
      'central_monitoring.configure',
      'central_monitoring.export'
    ];
    
    const userPerms = permRows.map(p => p.clave);
    const missingPerms = requiredPerms.filter(p => !userPerms.includes(p));
    
    console.log('\n🎯 Estado de permisos requeridos:');
    requiredPerms.forEach(perm => {
      const hasPerm = userPerms.includes(perm);
      console.log(`   ${hasPerm ? '✅' : '❌'} ${perm}`);
    });

    if (missingPerms.length === 0) {
      console.log('\n🎉 ¡PERFECTO! Carlos tiene todos los permisos necesarios para Central de Monitoreo');
    } else {
      console.log('\n⚠️ Permisos faltantes:', missingPerms.join(', '));
    }

    // 5. Verificar tablas del Central de Monitoreo
    console.log('\n🗄️ Estado de las tablas del Central de Monitoreo:');
    const tables = ['central_config_instalacion', 'central_llamados', 'central_incidentes'];
    
    for (const table of tables) {
      const { rows: tableRows } = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        ) as exists
      `;
      console.log(`   ${tableRows[0].exists ? '✅' : '❌'} ${table}`);
    }

    // 6. Verificar vista de turnos activos
    const { rows: viewRows } = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'central_v_turnos_activos'
      ) as exists
    `;
    console.log(`   ${viewRows[0].exists ? '✅' : '❌'} central_v_turnos_activos (vista)`);

    // 7. Verificar datos disponibles
    console.log('\n📊 Datos disponibles:');
    const { rows: configRows } = await sql`
      SELECT COUNT(*) as total, 
             COUNT(*) FILTER (WHERE habilitado = true) as habilitadas
      FROM central_config_instalacion
    `;
    console.log(`   📍 Configuraciones: ${configRows[0].total} total, ${configRows[0].habilitadas} habilitadas`);

    const { rows: llamadosRows } = await sql`
      SELECT COUNT(*) as total
      FROM central_llamados
    `;
    console.log(`   📞 Llamados registrados: ${llamadosRows[0].total}`);

    // 8. Verificar turnos activos hoy
    const { rows: turnosRows } = await sql`
      SELECT COUNT(*) as total
      FROM central_v_turnos_activos
    `;
    console.log(`   👥 Turnos activos hoy: ${turnosRows[0].total}`);

    // 9. Resumen final
    console.log('\n📋 RESUMEN FINAL:');
    console.log(`   👤 Usuario: ${user.nombre} ${user.apellido} (${user.email})`);
    console.log(`   🔐 Roles: ${roleRows.length}`);
    console.log(`   🎯 Permisos Central de Monitoreo: ${permRows.length}/4`);
    console.log(`   📍 Instalaciones configuradas: ${configRows[0].habilitadas}`);
    console.log(`   👥 Turnos activos: ${turnosRows[0].total}`);

    if (permRows.length === 4 && roleRows.length > 0) {
      console.log('\n🎉 ¡EXITO! Carlos ahora tiene acceso completo al Central de Monitoreo');
      console.log('💡 Puede acceder a: /central-monitoreo');
    } else {
      console.log('\n⚠️ Aún hay problemas que resolver');
    }

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
  }
}

verifyCentralMonitoringFix();
