const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function debugTimestampComparison() {
  console.log('🕐 DIAGNOSTICANDO COMPARACIÓN DE TIMESTAMPS\n');

  const client = await pool.connect();
  
  try {
    // 1. Verificar timestamps exactos
    console.log('1️⃣ Timestamps exactos...');
    
    const timestamps = await client.query(`
      SELECT 
        now() as ahora_utc,
        now() AT TIME ZONE 'America/Santiago' as ahora_chile,
        '2025-09-16 19:00:00'::timestamp as test_19_00,
        '2025-09-16 20:00:00'::timestamp as test_20_00,
        '2025-09-16 21:00:00'::timestamp as test_21_00,
        '2025-09-16 22:00:00'::timestamp as test_22_00,
        '2025-09-16 19:00:00'::timestamp < now() as test_19_pasado,
        '2025-09-16 20:00:00'::timestamp < now() as test_20_pasado,
        '2025-09-16 21:00:00'::timestamp < now() as test_21_pasado,
        '2025-09-16 22:00:00'::timestamp < now() as test_22_pasado
    `);
    
    const ts = timestamps.rows[0];
    console.log(`🕐 Ahora UTC: ${ts.ahora_utc}`);
    console.log(`🇨🇱 Ahora Chile: ${ts.ahora_chile}`);
    console.log(`📅 Test 19:00: ${ts.test_19_00} - ¿Pasado? ${ts.test_19_pasado}`);
    console.log(`📅 Test 20:00: ${ts.test_20_00} - ¿Pasado? ${ts.test_20_pasado}`);
    console.log(`📅 Test 21:00: ${ts.test_21_00} - ¿Pasado? ${ts.test_21_pasado}`);
    console.log(`📅 Test 22:00: ${ts.test_22_00} - ¿Pasado? ${ts.test_22_pasado}`);

    // 2. Verificar los timestamps reales de los llamados
    console.log('\n2️⃣ Timestamps reales de los llamados...');
    
    const llamadosReales = await client.query(`
      SELECT 
        id,
        instalacion_nombre,
        programado_para,
        programado_para AT TIME ZONE 'America/Santiago' as programado_chile,
        programado_para < now() as es_pasado_utc,
        (programado_para AT TIME ZONE 'America/Santiago') < (now() AT TIME ZONE 'America/Santiago') as es_pasado_chile,
        EXTRACT(HOUR FROM programado_para) as hora_utc,
        EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') as hora_chile,
        EXTRACT(HOUR FROM now()) as hora_actual_utc,
        EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Santiago') as hora_actual_chile
      FROM central_v_llamados_automaticos
      WHERE (
        (DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE 
         AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') >= 12)
        OR
        (DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE + 1 
         AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') < 12)
      )
      AND estado_llamado = 'pendiente'
      ORDER BY programado_para
      LIMIT 10
    `);
    
    console.log(`📊 Llamados pendientes encontrados: ${llamadosReales.rows.length}`);
    llamadosReales.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.instalacion_nombre}`);
      console.log(`     Programado UTC: ${row.programado_para}`);
      console.log(`     Programado Chile: ${row.programado_chile}`);
      console.log(`     Hora UTC: ${row.hora_utc} vs Actual UTC: ${row.hora_actual_utc}`);
      console.log(`     Hora Chile: ${row.hora_chile} vs Actual Chile: ${row.hora_actual_chile}`);
      console.log(`     ¿Pasado UTC? ${row.es_pasado_utc}`);
      console.log(`     ¿Pasado Chile? ${row.es_pasado_chile}`);
      console.log(`     ---`);
    });

    // 3. Verificar la lógica correcta
    console.log('\n3️⃣ Verificando lógica correcta...');
    
    const logicaCorrecta = await client.query(`
      SELECT 
        COUNT(CASE WHEN estado_llamado = 'pendiente' 
                   AND (programado_para AT TIME ZONE 'America/Santiago') < (now() AT TIME ZONE 'America/Santiago') 
              THEN 1 END) as no_realizados_correctos
      FROM central_v_llamados_automaticos
      WHERE (
        (DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE 
         AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') >= 12)
        OR
        (DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE + 1 
         AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') < 12)
      )
    `);
    
    console.log(`📊 No realizados con lógica correcta: ${logicaCorrecta.rows[0].no_realizados_correctos}`);

    console.log('\n🎯 DIAGNÓSTICO DE TIMESTAMPS COMPLETADO');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
debugTimestampComparison()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

