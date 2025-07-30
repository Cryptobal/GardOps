const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkConstraints() {
  try {
    console.log('🔍 Verificando restricciones de la tabla documentos...');
    
    const result = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'documentos'::regclass AND contype = 'c'
    `);
    
    console.log('📋 Restricciones encontradas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.conname}: ${row.definition}`);
    });
    
    // También verificar qué valores están permitidos en la columna tipo
    console.log('\n🔍 Verificando valores únicos en columna tipo:');
    const tipos = await pool.query('SELECT DISTINCT tipo FROM documentos WHERE tipo IS NOT NULL');
    console.log('📋 Tipos existentes:', tipos.rows.map(r => r.tipo));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkConstraints(); 