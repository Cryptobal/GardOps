require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function fixCarlosCentralMonitoring() {
  try {
    console.log('🔧 Corrigiendo permisos de Central de Monitoreo para Carlos Irigoyen\n');

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

    // 2. Verificar si existe el rol Super Admin
    console.log('\n2. Verificando rol Super Admin...');
    const { rows: superAdminRows } = await sql`
      SELECT id, nombre, descripcion
      FROM roles 
      WHERE nombre IN ('Super Admin', 'admin', 'super_admin')
      ORDER BY nombre
    `;
    
    let superAdminRole = null;
    if (superAdminRows.length > 0) {
      superAdminRole = superAdminRows[0];
      console.log('✅ Rol Super Admin encontrado:', superAdminRole.nombre);
    } else {
      console.log('❌ No se encontró rol Super Admin');
    }

    // 3. Crear rol Super Admin si no existe
    if (!superAdminRole) {
      console.log('\n3. Creando rol Super Admin...');
      const { rows: newRoleRows } = await sql`
        INSERT INTO roles (nombre, descripcion)
        VALUES ('Super Admin', 'Administrador del sistema con control total')
        RETURNING id, nombre, descripcion
      `;
      superAdminRole = newRoleRows[0];
      console.log('✅ Rol Super Admin creado:', superAdminRole.nombre);
    }

    // 4. Asignar rol Super Admin a Carlos
    console.log('\n4. Asignando rol Super Admin a Carlos...');
    const { rows: assignRoleRows } = await sql`
      INSERT INTO usuarios_roles (usuario_id, rol_id)
      VALUES (${user.id}, ${superAdminRole.id})
      ON CONFLICT (usuario_id, rol_id) DO NOTHING
      RETURNING usuario_id, rol_id
    `;
    
    if (assignRoleRows.length > 0) {
      console.log('✅ Rol Super Admin asignado a Carlos');
    } else {
      console.log('ℹ️ Rol Super Admin ya estaba asignado a Carlos');
    }

    // 5. Verificar permisos de Central de Monitoreo
    console.log('\n5. Verificando permisos de Central de Monitoreo...');
    const { rows: permRows } = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos 
      WHERE clave LIKE 'central_monitoring.%'
      ORDER BY clave
    `;
    
    console.log('Permisos de Central de Monitoreo encontrados:', permRows.length);
    permRows.forEach(perm => {
      console.log(`   - ${perm.clave}: ${perm.descripcion}`);
    });

    // 6. Asignar permisos de Central de Monitoreo al rol Super Admin
    console.log('\n6. Asignando permisos de Central de Monitoreo al rol Super Admin...');
    for (const perm of permRows) {
      const { rows: assignPermRows } = await sql`
        INSERT INTO roles_permisos (rol_id, permiso_id)
        VALUES (${superAdminRole.id}, ${perm.id})
        ON CONFLICT (rol_id, permiso_id) DO NOTHING
        RETURNING rol_id, permiso_id
      `;
      
      if (assignPermRows.length > 0) {
        console.log(`   ✅ Permiso ${perm.clave} asignado al rol Super Admin`);
      } else {
        console.log(`   ℹ️ Permiso ${perm.clave} ya estaba asignado al rol Super Admin`);
      }
    }

    // 7. Verificar que Carlos tenga acceso directo a los permisos
    console.log('\n7. Verificando acceso directo a permisos...');
    const { rows: directPermRows } = await sql`
      SELECT p.clave, p.descripcion
      FROM usuarios_permisos up
      JOIN permisos p ON p.id = up.permiso_id
      WHERE up.usuario_id = ${user.id}
      AND p.clave LIKE 'central_monitoring.%'
      ORDER BY p.clave
    `;
    
    console.log('Permisos directos de Central de Monitoreo:', directPermRows.length);
    directPermRows.forEach(perm => {
      console.log(`   - ${perm.clave}: ${perm.descripcion}`);
    });

    // 8. Asignar permisos directamente a Carlos si no los tiene
    console.log('\n8. Asignando permisos directamente a Carlos...');
    for (const perm of permRows) {
      const { rows: assignDirectRows } = await sql`
        INSERT INTO usuarios_permisos (usuario_id, permiso_id)
        VALUES (${user.id}, ${perm.id})
        ON CONFLICT (usuario_id, permiso_id) DO NOTHING
        RETURNING usuario_id, permiso_id
      `;
      
      if (assignDirectRows.length > 0) {
        console.log(`   ✅ Permiso ${perm.clave} asignado directamente a Carlos`);
      } else {
        console.log(`   ℹ️ Permiso ${perm.clave} ya estaba asignado directamente a Carlos`);
      }
    }

    // 9. Verificar tablas del Central de Monitoreo
    console.log('\n9. Verificando tablas del Central de Monitoreo...');
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

    // 10. Verificar vista de turnos activos
    console.log('\n10. Verificando vista de turnos activos...');
    const { rows: viewRows } = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'central_v_turnos_activos'
      ) as exists
    `;
    console.log(`   Vista central_v_turnos_activos: ${viewRows[0].exists ? '✅ Existe' : '❌ No existe'}`);

    // 11. Verificar configuración de instalaciones
    console.log('\n11. Verificando configuración de instalaciones...');
    const { rows: configRows } = await sql`
      SELECT COUNT(*) as total, 
             COUNT(*) FILTER (WHERE habilitado = true) as habilitadas
      FROM central_config_instalacion
    `;
    console.log(`   Configuraciones totales: ${configRows[0].total}`);
    console.log(`   Configuraciones habilitadas: ${configRows[0].habilitadas}`);

    // 12. Verificar roles finales de Carlos
    console.log('\n12. Verificando roles finales de Carlos...');
    const { rows: finalRoleRows } = await sql`
      SELECT r.nombre, r.descripcion
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${user.id}
      ORDER BY r.nombre
    `;
    
    console.log('Roles finales de Carlos:', finalRoleRows.length);
    finalRoleRows.forEach(role => {
      console.log(`   - ${role.nombre}: ${role.descripcion}`);
    });

    // 13. Verificar permisos finales de Central de Monitoreo
    console.log('\n13. Verificando permisos finales de Central de Monitoreo...');
    const { rows: finalPermRows } = await sql`
      SELECT DISTINCT p.clave, p.descripcion
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      JOIN roles_permisos rp ON rp.rol_id = r.id
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE ur.usuario_id = ${user.id}
      AND p.clave LIKE 'central_monitoring.%'
      ORDER BY p.clave
    `;
    
    console.log('Permisos finales de Central de Monitoreo:', finalPermRows.length);
    finalPermRows.forEach(perm => {
      console.log(`   - ${perm.clave}: ${perm.descripcion}`);
    });

    console.log('\n✅ Corrección completada exitosamente');
    console.log('🎯 Carlos ahora debería tener acceso completo al Central de Monitoreo');

  } catch (error) {
    console.error('❌ Error en la corrección:', error);
  }
}

fixCarlosCentralMonitoring();
