const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function debugNoRealizados() {
  console.log('🔍 DIAGNOSTICANDO KPI "NO REALIZADOS" vs BADGES\n');

  const client = await pool.connect();
  
  try {
    // 1. Verificar hora actual
    console.log('1️⃣ Hora actual...');
    const horaActual = await client.query(`
      SELECT 
        now() as ahora,
        now() AT TIME ZONE 'America/Santiago' as ahora_chile
    `);
    
    const hora = horaActual.rows[0];
    console.log(`🕐 Hora actual: ${hora.ahora}`);
    console.log(`🇨🇱 Hora Chile: ${hora.ahora_chile}`);

    // 2. Verificar lógica de "no realizados" en la vista
    console.log('\n2️⃣ Verificando lógica de "no realizados" en la vista...');
    
    const noRealizadosVista = await client.query(`
      SELECT 
        COUNT(*) as total_no_realizados_vista,
        COUNT(CASE WHEN estado_llamado = 'pendiente' AND programado_para < now() THEN 1 END) as pendientes_pasados,
        COUNT(CASE WHEN estado_llamado = 'pendiente' THEN 1 END) as todos_pendientes,
        COUNT(CASE WHEN programado_para < now() THEN 1 END) as todos_pasados
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') BETWEEN CURRENT_DATE - 1 AND CURRENT_DATE + 1
    `);
    
    const nr = noRealizadosVista.rows[0];
    console.log('📊 Lógica en la vista:');
    console.log(`  Total no realizados (vista): ${nr.total_no_realizados_vista}`);
    console.log(`  Pendientes + pasados: ${nr.pendientes_pasados}`);
    console.log(`  Todos pendientes: ${nr.todos_pendientes}`);
    console.log(`  Todos pasados: ${nr.todos_pasados}`);

    // 3. Verificar lógica en el API (como se calcula en el backend)
    console.log('\n3️⃣ Verificando lógica del API...');
    
    const noRealizadosAPI = await client.query(`
      SELECT 
        COUNT(CASE WHEN estado_llamado = 'pendiente' AND programado_para < now() THEN 1 END) as no_realizados_api
      FROM central_v_llamados_automaticos
      WHERE (
        (DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE 
         AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') >= 12)
        OR
        (DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE + 1 
         AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') < 12)
      )
    `);
    
    console.log(`📊 No realizados (API): ${noRealizadosAPI.rows[0].no_realizados_api}`);

    // 4. Verificar llamados específicos que deberían ser "no realizados"
    console.log('\n4️⃣ Llamados que deberían ser "no realizados"...');
    
    const llamadosNoRealizados = await client.query(`
      SELECT 
        id,
        instalacion_nombre,
        programado_para,
        programado_para AT TIME ZONE 'America/Santiago' as programado_chile,
        estado_llamado,
        programado_para < now() as es_pasado,
        estado_llamado = 'pendiente' as es_pendiente,
        (estado_llamado = 'pendiente' AND programado_para < now()) as deberia_ser_no_realizado
      FROM central_v_llamados_automaticos
      WHERE (
        (DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE 
         AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') >= 12)
        OR
        (DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE + 1 
         AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') < 12)
      )
      AND estado_llamado = 'pendiente' 
      AND programado_para < now()
      ORDER BY programado_para
      LIMIT 10
    `);
    
    console.log(`📊 Llamados "no realizados" encontrados: ${llamadosNoRealizados.rows.length}`);
    llamadosNoRealizados.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.instalacion_nombre}`);
      console.log(`     Programado: ${row.programado_chile}`);
      console.log(`     Estado: ${row.estado_llamado}`);
      console.log(`     Es pasado: ${row.es_pasado}`);
      console.log(`     Es pendiente: ${row.es_pendiente}`);
      console.log(`     Debería ser no realizado: ${row.deberia_ser_no_realizado}`);
    });

    // 5. Verificar todos los estados de llamados
    console.log('\n5️⃣ Distribución de estados...');
    
    const estados = await client.query(`
      SELECT 
        estado_llamado,
        COUNT(*) as cantidad,
        COUNT(CASE WHEN programado_para < now() THEN 1 END) as pasados,
        COUNT(CASE WHEN programado_para >= now() THEN 1 END) as futuros
      FROM central_v_llamados_automaticos
      WHERE (
        (DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE 
         AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') >= 12)
        OR
        (DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE + 1 
         AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') < 12)
      )
      GROUP BY estado_llamado
      ORDER BY cantidad DESC
    `);
    
    console.log('📊 Distribución de estados:');
    estados.rows.forEach(row => {
      console.log(`  ${row.estado_llamado}: ${row.cantidad} total (${row.pasados} pasados, ${row.futuros} futuros)`);
    });

    // 6. Verificar KPIs completos
    console.log('\n6️⃣ KPIs completos...');
    
    const kpis = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes,
        COUNT(CASE WHEN estado_llamado != 'pendiente' THEN 1 END) as completados,
        COUNT(CASE WHEN estado_llamado = 'pendiente' AND programado_para < now() THEN 1 END) as no_realizados
      FROM central_v_llamados_automaticos
      WHERE (
        (DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE 
         AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') >= 12)
        OR
        (DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE + 1 
         AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') < 12)
      )
    `);
    
    const k = kpis.rows[0];
    console.log('📊 KPIs calculados:');
    console.log(`  Total: ${k.total}`);
    console.log(`  Actuales: ${k.actuales}`);
    console.log(`  Próximos: ${k.proximos}`);
    console.log(`  Urgentes: ${k.urgentes}`);
    console.log(`  Completados: ${k.completados}`);
    console.log(`  No realizados: ${k.no_realizados}`);

    console.log('\n🎯 DIAGNÓSTICO COMPLETADO');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
debugNoRealizados()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

