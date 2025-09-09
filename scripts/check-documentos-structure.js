const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkDocumentosStructure() {
  try {
    console.log('🔍 Verificando estructura de la tabla documentos...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'documentos' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columnas de la tabla documentos:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Verificar algunos registros de ejemplo
    console.log('\n📄 Registros de ejemplo:');
    const sampleResult = await pool.query(`
      SELECT id, url, tipo, fecha_vencimiento, creado_en
      FROM documentos 
      LIMIT 3
    `);
    
    sampleResult.rows.forEach((row, index) => {
      console.log(`  Registro ${index + 1}:`);
      console.log(`    ID: ${row.id}`);
      console.log(`    URL: ${row.url}`);
      console.log(`    Tipo: ${row.tipo}`);
      console.log(`    Vencimiento: ${row.fecha_vencimiento}`);
      console.log(`    Creado: ${row.creado_en}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkDocumentosStructure(); 