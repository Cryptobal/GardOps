const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkRequiereVencimiento() {
  try {
    console.log('🔍 Verificando qué tipos de documentos requieren fecha de vencimiento...');
    
    const result = await pool.query(`
      SELECT id, nombre, requiere_vencimiento, dias_antes_alarma
      FROM tipos_documentos 
      ORDER BY nombre
    `);
    
    console.log('📋 Tipos de documentos y sus requisitos de vencimiento:');
    result.rows.forEach(row => {
      const requiere = row.requiere_vencimiento ? '✅ SÍ' : '❌ NO';
      const dias = row.dias_antes_alarma || 'N/A';
      console.log(`  - ${row.nombre}:`);
      console.log(`    Requiere vencimiento: ${requiere}`);
      console.log(`    Días antes de alarma: ${dias}`);
      console.log(`    ID: ${row.id}`);
      console.log('');
    });
    
    // Mostrar solo los que requieren vencimiento
    const requiereVencimiento = result.rows.filter(row => row.requiere_vencimiento);
    console.log('📅 Tipos que SÍ requieren fecha de vencimiento:');
    requiereVencimiento.forEach(row => {
      console.log(`  - ${row.nombre} (ID: ${row.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkRequiereVencimiento(); 