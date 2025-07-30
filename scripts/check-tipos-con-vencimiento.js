const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTiposConVencimiento() {
  try {
    console.log('🔍 Verificando tipos de documentos que requieren fecha de vencimiento...');
    
    // Verificar si hay una columna que indique si requiere vencimiento
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tipos_documentos' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columnas de la tabla tipos_documentos:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Verificar los tipos de documentos existentes
    const tiposResult = await pool.query(`
      SELECT id, nombre 
      FROM tipos_documentos 
      ORDER BY nombre
    `);
    
    console.log('\n📋 Tipos de documentos disponibles:');
    tiposResult.rows.forEach(row => {
      console.log(`  - ${row.nombre} (ID: ${row.id})`);
    });
    
    // Verificar si hay documentos con fecha de vencimiento para inferir qué tipos la requieren
    const vencimientoResult = await pool.query(`
      SELECT td.nombre, COUNT(*) as total, 
             COUNT(d.fecha_vencimiento) as con_vencimiento,
             COUNT(*) - COUNT(d.fecha_vencimiento) as sin_vencimiento
      FROM tipos_documentos td
      LEFT JOIN documentos d ON td.id = d.tipo_documento_id
      GROUP BY td.id, td.nombre
      ORDER BY td.nombre
    `);
    
    console.log('\n📅 Análisis de fechas de vencimiento por tipo:');
    vencimientoResult.rows.forEach(row => {
      const porcentaje = row.total > 0 ? Math.round((row.con_vencimiento / row.total) * 100) : 0;
      console.log(`  - ${row.nombre}:`);
      console.log(`    Total: ${row.total}, Con vencimiento: ${row.con_vencimiento}, Sin vencimiento: ${row.sin_vencimiento}`);
      console.log(`    Porcentaje con vencimiento: ${porcentaje}%`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkTiposConVencimiento(); 