require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkUserRoles() {
  try {
    console.log('🔍 Verificando relación usuario-roles...\n');

    const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
    console.log('Email de desarrollo:', devEmail);

    // 1. Verificar si el usuario existe
    console.log('\n1. Verificando usuario...');
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

    // 2. Verificar si hay alguna tabla que relacione usuarios con roles
    console.log('\n2. Buscando tabla de relación usuario-roles...');
    const relationTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%user%role%' OR table_name LIKE '%usuario%rol%' OR table_name LIKE '%user%rol%')
      ORDER BY table_name;
    `;
    
    console.log('   Tablas de relación encontradas:', relationTables.rows.length);
    relationTables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // 3. Verificar si el usuario tiene algún rol asignado directamente
    console.log('\n3. Verificando roles directos del usuario...');
    try {
      const directRoles = await sql`
        SELECT rol_id, rol_nombre, rol_codigo
        FROM usuarios_roles 
        WHERE usuario_id = ${user.rows[0].id};
      `;
      console.log('   Roles directos:', directRoles.rows.length);
      directRoles.rows.forEach(row => {
        console.log(`   - ${row.rol_codigo}: ${row.rol_nombre}`);
      });
    } catch (error) {
      console.log('   ❌ Error verificando roles directos:', error.message);
    }

    // 4. Verificar si hay algún campo de rol en la tabla usuarios
    console.log('\n4. Verificando campos de rol en tabla usuarios...');
    const userColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      AND (column_name LIKE '%rol%' OR column_name LIKE '%role%')
      ORDER BY column_name;
    `;
    
    console.log('   Columnas de rol en usuarios:', userColumns.rows.length);
    userColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // 5. Si hay campo de rol, verificar el valor
    if (userColumns.rows.length > 0) {
      console.log('\n5. Verificando valor de rol del usuario...');
      const roleColumns = userColumns.rows.map(col => col.column_name).join(', ');
      const userWithRole = await sql`
        SELECT ${sql(roleColumns)}
        FROM usuarios 
        WHERE id = ${user.rows[0].id};
      `;
      console.log('   Valores de rol:', userWithRole.rows[0]);
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserRoles();
