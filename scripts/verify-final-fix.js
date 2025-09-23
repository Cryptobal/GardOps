const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function verifyFinalFix() {
  console.log('✅ VERIFICANDO CORRECCIÓN FINAL\n');

  const client = await pool.connect();
  
  try {
    // 1. Verificar hora actual
    console.log('1️⃣ Hora actual del sistema...');
    const horaActual = await client.query(`
      SELECT 
        now() as utc_now,
        EXTRACT(HOUR FROM now()) as hora_utc,
        date_trunc('hour', now()) as hora_truncada_utc
    `);
    
    const hora = horaActual.rows[0];
    console.log(`🕐 Hora UTC: ${hora.utc_now} (${hora.hora_utc})`);
    console.log(`🕐 Hora truncada: ${hora.hora_truncada_utc}`);

    // 2. Verificar llamados actuales
    console.log('\n2️⃣ Verificando llamados "actuales"...');
    const actuales = await client.query(`
      SELECT 
        id,
        instalacion_nombre,
        programado_para,
        EXTRACT(HOUR FROM programado_para) as hora_programada,
        date_trunc('hour', programado_para) as hora_programada_truncada,
        es_actual,
        -- Verificar manualmente la lógica
        CASE 
          WHEN date_trunc('hour', programado_para) = date_trunc('hour', now())
          THEN true 
          ELSE false 
        END as deberia_ser_actual
      FROM central_v_llamados_automaticos 
      WHERE es_actual = true
      ORDER BY programado_para
    `);
    
    console.log(`📊 Llamados marcados como "actuales": ${actuales.rows.length}`);
    actuales.rows.forEach(row => {
      console.log(`  - ${row.instalacion_nombre}`);
      console.log(`    Programado: ${row.programado_para} (hora ${row.hora_programada})`);
      console.log(`    Hora truncada: ${row.hora_programada_truncada}`);
      console.log(`    vs Actual: ${hora.hora_truncada_utc}`);
      console.log(`    es_actual: ${row.es_actual}, debería_ser: ${row.deberia_ser_actual}`);
      console.log(`    ¿Correcto? ${row.es_actual === row.deberia_ser_actual ? 'SÍ' : 'NO'}`);
    });

    // 3. Verificar estadísticas completas
    console.log('\n3️⃣ Estadísticas completas...');
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes,
        COUNT(CASE WHEN estado_llamado != 'pendiente' THEN 1 END) as completados,
        COUNT(CASE WHEN estado_llamado = 'pendiente' AND programado_para < now() THEN 1 END) as no_realizados,
        -- Verificar manualmente cuántos DEBERÍAN ser actuales
        COUNT(CASE WHEN date_trunc('hour', programado_para) = date_trunc('hour', now()) THEN 1 END) as deberian_ser_actuales
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) BETWEEN CURRENT_DATE - 1 AND CURRENT_DATE + 1
    `);
    
    const s = stats.rows[0];
    console.log('📊 Estadísticas:');
    console.log(`  Total: ${s.total}`);
    console.log(`  Actuales: ${s.actuales} (deberían ser: ${s.deberian_ser_actuales})`);
    console.log(`  Próximos: ${s.proximos}`);
    console.log(`  Urgentes: ${s.urgentes}`);
    console.log(`  Completados: ${s.completados}`);
    console.log(`  No realizados: ${s.no_realizados}`);

    // 4. Mostrar muestra de llamados por hora
    console.log('\n4️⃣ Muestra de llamados por hora...');
    
    const porHora = await client.query(`
      SELECT 
        EXTRACT(HOUR FROM programado_para) as hora,
        COUNT(*) as cantidad,
        COUNT(CASE WHEN es_actual THEN 1 END) as marcados_actuales
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM programado_para)
      ORDER BY hora
    `);
    
    console.log('📊 Llamados por hora del día actual:');
    porHora.rows.forEach(row => {
      const esHoraActual = row.hora == hora.hora_utc;
      console.log(`  ${row.hora}:00 - ${row.cantidad} llamados, ${row.marcados_actuales} marcados como actuales ${esHoraActual ? '← HORA ACTUAL' : ''}`);
    });

    console.log('\n🎯 VERIFICACIÓN COMPLETADA');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
verifyFinalFix()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

