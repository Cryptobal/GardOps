require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkDevUser() {
  try {
    console.log('🔍 Verificando usuario de desarrollo...\n');

    const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
    console.log('Email de desarrollo:', devEmail);

    // 1. Verificar si el usuario existe
    console.log('\n1. Verificando si el usuario existe...');
    const user = await sql`
      SELECT id, email, nombre, tenant_id
      FROM usuarios 
      WHERE lower(email) = lower(${devEmail})
      LIMIT 1;
    `;
    
    if (user.rows.length === 0) {
      console.log('   ❌ Usuario no encontrado');
      return;
    }
    
    console.log('   ✅ Usuario encontrado:', user.rows[0]);

    // 2. Verificar roles del usuario
    console.log('\n2. Verificando roles del usuario...');
    const userRoles = await sql`
      SELECT r.codigo, r.nombre, r.descripcion
      FROM rbac_usuarios_roles ur
      JOIN rbac_roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${user.rows[0].id};
    `;
    
    console.log('   Roles encontrados:', userRoles.rows.length);
    userRoles.rows.forEach(row => {
      console.log(`   - ${row.codigo}: ${row.nombre}`);
    });

    // 3. Verificar permisos del usuario
    console.log('\n3. Verificando permisos del usuario...');
    const userPermissions = await sql`
      SELECT DISTINCT p.codigo, p.nombre, p.descripcion
      FROM rbac_usuarios_roles ur
      JOIN rbac_roles r ON ur.role_id = r.id
      JOIN rbac_roles_permisos rp ON r.id = rp.role_id
      JOIN rbac_permisos p ON rp.permission_id = p.id
      WHERE ur.user_id = ${user.rows[0].id}
      AND rp.granted = true;
    `;
    
    console.log('   Permisos encontrados:', userPermissions.rows.length);
    userPermissions.rows.forEach(row => {
      console.log(`   - ${row.codigo}: ${row.nombre}`);
    });

    // 4. Verificar permisos específicos de central_monitoring
    console.log('\n4. Verificando permisos de central_monitoring...');
    const centralMonitoringPerms = userPermissions.rows.filter(p => 
      p.codigo.startsWith('central_monitoring.')
    );
    
    console.log('   Permisos de central_monitoring:', centralMonitoringPerms.length);
    centralMonitoringPerms.forEach(row => {
      console.log(`   - ${row.codigo}: ${row.nombre}`);
    });

    // 5. Si no tiene permisos, asignar el rol de operador
    if (centralMonitoringPerms.length === 0) {
      console.log('\n5. Asignando rol de operador al usuario...');
      
      // Obtener el rol de operador
      const operatorRole = await sql`
        SELECT id FROM rbac_roles WHERE codigo = 'central_monitoring.operator' LIMIT 1;
      `;
      
      if (operatorRole.rows.length > 0) {
        await sql`
          INSERT INTO rbac_usuarios_roles (user_id, role_id)
          VALUES (${user.rows[0].id}, ${operatorRole.rows[0].id})
          ON CONFLICT (user_id, role_id) DO NOTHING;
        `;
        console.log('   ✅ Rol asignado');
      } else {
        console.log('   ❌ Rol de operador no encontrado');
      }
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDevUser();
