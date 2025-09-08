const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testAPIPPC() {
  try {
    console.log('🔍 Probando API de Pauta Diaria...');
    
    // Simular la consulta que hace la API
    const fecha = '2025-09-08';
    const sql = `
      SELECT 
        pauta_id, 
        puesto_id, 
        fecha, 
        guardia_trabajo_id as guardia_id, 
        estado_ui as estado, 
        meta,
        instalacion_id, 
        instalacion_nombre, 
        guardia_trabajo_nombre as guardia_nombre,
        instalacion_telefono,
        estado_pauta_mensual,
        estado_ui,
        guardia_trabajo_id,
        guardia_trabajo_nombre,
        guardia_trabajo_telefono,
        guardia_titular_id,
        guardia_titular_nombre,
        guardia_titular_telefono,
        puesto_nombre,
        es_ppc,
        es_reemplazo,
        es_sin_cobertura,
        es_falta_sin_aviso,
        necesita_cobertura,
        hora_inicio,
        hora_fin,
        rol_id,
        rol_nombre,
        reemplazo_guardia_nombre,
        cobertura_guardia_nombre,
        cobertura_guardia_telefono
      FROM as_turnos_v_pauta_diaria_unificada
      WHERE fecha = $1
      ORDER BY instalacion_nombre, puesto_nombre
    `;
    
    const { rows } = await pool.query(sql, [fecha]);
    
    console.log(`📋 Registros encontrados: ${rows.length}`);
    
    // Filtrar solo Santa Amalia
    const santaAmalia = rows.filter(row => row.instalacion_nombre.includes('Santa Amalia'));
    
    console.log('\n📋 Registros de Santa Amalia:');
    santaAmalia.forEach(row => {
      console.log(`  - ${row.puesto_nombre}: EstadoUI=${row.estado_ui}, PPC=${row.es_ppc}, Trabajo=${row.guardia_trabajo_nombre || 'Sin asignar'}`);
    });
    
    // Simular la respuesta de la API
    const apiResponse = { data: rows };
    console.log('\n📋 Respuesta de API (primeros 2 registros):');
    console.log(JSON.stringify(apiResponse.data.slice(0, 2), null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testAPIPPC();
