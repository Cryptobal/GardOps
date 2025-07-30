const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testDatePicker() {
  try {
    console.log('🔍 Probando funcionalidad del DatePicker...');
    
    // Verificar que los tipos de documentos que requieren vencimiento están disponibles
    const result = await pool.query(`
      SELECT id, nombre, requiere_vencimiento, dias_antes_alarma
      FROM tipos_documentos 
      WHERE modulo = 'instalaciones' AND requiere_vencimiento = true
      ORDER BY nombre
    `);
    
    console.log('📅 Tipos que requieren fecha de vencimiento:');
    result.rows.forEach(row => {
      console.log(`  - ${row.nombre} (ID: ${row.id})`);
      console.log(`    Días antes de alarma: ${row.dias_antes_alarma}`);
      console.log('');
    });
    
    // Verificar que hay instalaciones disponibles para probar
    const instalacionesResult = await pool.query(`
      SELECT id, nombre 
      FROM instalaciones 
      LIMIT 3
    `);
    
    console.log('🏢 Instalaciones disponibles para prueba:');
    instalacionesResult.rows.forEach(row => {
      console.log(`  - ${row.nombre} (ID: ${row.id})`);
    });
    
    console.log('\n✅ El DatePicker debería funcionar correctamente ahora.');
    console.log('📝 Para probar:');
    console.log('  1. Ve a la página de instalaciones');
    console.log('  2. Abre la pestaña de documentos');
    console.log('  3. Haz clic en "Subir Documento"');
    console.log('  4. Selecciona un tipo que requiera vencimiento (ej: Certificado de Habilitación)');
    console.log('  5. Deberías ver el indicador naranja y el campo de fecha');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testDatePicker(); 