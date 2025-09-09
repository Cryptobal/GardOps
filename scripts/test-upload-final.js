const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testUpload() {
  try {
    console.log('🔍 Probando inserción con tipo correcto...');
    
    const testData = {
      tipo: 'contrato', // Usar un tipo válido
      url: 'test/test.pdf',
      instalacion_id: '8d24d353-375c-41e1-b54c-f07437a98c3e',
      tipo_documento_id: '506fa109-8721-4626-99d8-b0c698f04137',
      contenido_archivo: Buffer.from('test pdf content'),
      fecha_vencimiento: '2025-12-31',
      creado_en: new Date()
    };
    
    const query = `
      INSERT INTO documentos (
        tipo, url, instalacion_id, tipo_documento_id, 
        contenido_archivo, fecha_vencimiento, creado_en
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, url as nombre, fecha_vencimiento
    `;
    
    const params = [
      testData.tipo,
      testData.url,
      testData.instalacion_id,
      testData.tipo_documento_id,
      testData.contenido_archivo,
      testData.fecha_vencimiento,
      testData.creado_en
    ];
    
    console.log('🔍 Query:', query);
    console.log('📋 Parámetros:', params.map(p => typeof p === 'object' ? '[Buffer]' : p));
    
    const result = await pool.query(query, params);
    console.log('✅ Inserción exitosa:', result.rows[0]);
    
    // Verificar que se insertó correctamente
    const verifyQuery = `
      SELECT id, tipo, url, fecha_vencimiento 
      FROM documentos 
      WHERE id = $1
    `;
    const verifyResult = await pool.query(verifyQuery, [result.rows[0].id]);
    console.log('✅ Verificación:', verifyResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error en inserción:', error);
    console.error('❌ Detalles:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
  } finally {
    await pool.end();
  }
}

testUpload(); 