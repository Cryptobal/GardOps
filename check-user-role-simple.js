require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkUserRoleSimple() {
  try {
    console.log('🔍 Verificando rol del usuario de desarrollo...\n');

    const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
    console.log('Email de desarrollo:', devEmail);

    // 1. Verificar usuario y su rol
    console.log('\n1. Verificando usuario y rol...');
    const user = await sql`
      SELECT id, email, nombre, tenant_id, rol
      FROM usuarios 
      WHERE lower(email) = lower(${devEmail})
      LIMIT 1;
    `;
    
    if (user.rows.length === 0) {
      console.log('   ❌ Usuario no encontrado');
      return;
    }
    
    console.log('   ✅ Usuario encontrado:', user.rows[0]);

    // 2. Verificar si el rol existe en rbac_roles
    if (user.rows[0].rol) {
      console.log('\n2. Verificando rol en rbac_roles...');
      const role = await sql`
        SELECT codigo, nombre, descripcion
        FROM rbac_roles 
        WHERE codigo = ${user.rows[0].rol}
        LIMIT 1;
      `;
      
      if (role.rows.length > 0) {
        console.log('   ✅ Rol encontrado:', role.rows[0]);
      } else {
        console.log('   ❌ Rol no encontrado en rbac_roles');
      }
    } else {
      console.log('\n2. Usuario no tiene rol asignado');
    }

    // 3. Asignar rol de operador si no tiene
    if (!user.rows[0].rol) {
      console.log('\n3. Asignando rol de operador...');
      await sql`
        UPDATE usuarios 
        SET rol = 'central_monitoring.operator'
        WHERE id = ${user.rows[0].id};
      `;
      console.log('   ✅ Rol asignado');
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserRoleSimple();
