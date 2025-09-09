const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkInstalaciones() {
  try {
    console.log('🔍 Verificando instalaciones existentes...');
    
    const result = await pool.query(`
      SELECT id, nombre, cliente_id 
      FROM instalaciones 
      LIMIT 5
    `);
    
    console.log('📋 Instalaciones encontradas:');
    result.rows.forEach(row => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    Nombre: ${row.nombre}`);
      console.log(`    Cliente ID: ${row.cliente_id}`);
      console.log('');
    });
    
    // También verificar clientes
    console.log('🔍 Verificando clientes existentes...');
    const clientes = await pool.query(`
      SELECT id, nombre 
      FROM clientes 
      LIMIT 5
    `);
    
    console.log('📋 Clientes encontrados:');
    clientes.rows.forEach(row => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    Nombre: ${row.nombre}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkInstalaciones(); 