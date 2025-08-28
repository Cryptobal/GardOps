require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkRBACTables() {
  try {
    console.log('🔍 Verificando tablas de RBAC...\n');

    // 1. Listar todas las tablas que contengan 'rbac'
    console.log('1. Tablas RBAC existentes:');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%rbac%'
      ORDER BY table_name;
    `;
    
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // 2. Verificar estructura de cada tabla
    console.log('\n2. Estructura de tablas RBAC:');
    for (const table of tables.rows) {
      console.log(`\n   Tabla: ${table.table_name}`);
      try {
        const structure = await sql`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = ${table.table_name}
          ORDER BY ordinal_position;
        `;
        
        structure.rows.forEach(col => {
          console.log(`     - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
      }
    }

    // 3. Verificar datos de ejemplo
    console.log('\n3. Datos de ejemplo:');
    for (const table of tables.rows) {
      try {
        const count = await sql`SELECT COUNT(*) as total FROM "${table.table_name}";`;
        console.log(`   ${table.table_name}: ${count.rows[0].total} registros`);
      } catch (error) {
        console.log(`   ${table.table_name}: ❌ Error - ${error.message}`);
      }
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRBACTables();
