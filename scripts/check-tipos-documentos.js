const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTiposDocumentos() {
  try {
    console.log('🔍 Verificando tipos de documentos existentes...');
    
    const result = await pool.query(`
      SELECT id, nombre 
      FROM tipos_documentos 
      ORDER BY nombre
    `);
    
    console.log('📋 Tipos de documentos encontrados:');
    result.rows.forEach(row => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    Nombre: ${row.nombre}`);
      console.log('');
    });
    
    console.log(`Total: ${result.rows.length} tipos de documentos`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkTiposDocumentos(); 