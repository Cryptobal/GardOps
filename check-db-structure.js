require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkDBStructure() {
  try {
    console.log('🔍 Verificando estructura de la base de datos...\n');

    // 1. Verificar tabla rbac_permisos
    console.log('1. Verificando tabla rbac_permisos...');
    try {
      const permisosStructure = await sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'rbac_permisos'
        ORDER BY ordinal_position;
      `;
      console.log('   Columnas de rbac_permisos:');
      permisosStructure.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

    // 2. Verificar tabla rbac_roles
    console.log('\n2. Verificando tabla rbac_roles...');
    try {
      const rolesStructure = await sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'rbac_roles'
        ORDER BY ordinal_position;
      `;
      console.log('   Columnas de rbac_roles:');
      rolesStructure.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

    // 3. Verificar tabla rbac_roles_permisos
    console.log('\n3. Verificando tabla rbac_roles_permisos...');
    try {
      const rolesPermisosStructure = await sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'rbac_roles_permisos'
        ORDER BY ordinal_position;
      `;
      console.log('   Columnas de rbac_roles_permisos:');
      rolesPermisosStructure.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

    // 4. Verificar tabla central_llamados
    console.log('\n4. Verificando tabla central_llamados...');
    try {
      const llamadosStructure = await sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'central_llamados'
        ORDER BY ordinal_position;
      `;
      console.log('   Columnas de central_llamados:');
      llamadosStructure.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

    // 5. Verificar datos de ejemplo
    console.log('\n5. Verificando datos de ejemplo...');
    try {
      const permisosCount = await sql`SELECT COUNT(*) as total FROM rbac_permisos;`;
      const rolesCount = await sql`SELECT COUNT(*) as total FROM rbac_roles;`;
      const llamadosCount = await sql`SELECT COUNT(*) as total FROM central_llamados;`;
      
      console.log(`   rbac_permisos: ${permisosCount.rows[0].total} registros`);
      console.log(`   rbac_roles: ${rolesCount.rows[0].total} registros`);
      console.log(`   central_llamados: ${llamadosCount.rows[0].total} registros`);
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkDBStructure();
