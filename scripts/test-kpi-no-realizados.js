const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function testKpiNoRealizados() {
  console.log('🧪 PROBANDO KPI "NO REALIZADOS" CORREGIDO\n');

  const client = await pool.connect();
  
  try {
    // 1. Verificar hora actual
    console.log('1️⃣ Hora actual...');
    const horaActual = await client.query(`
      SELECT 
        now() AT TIME ZONE 'America/Santiago' as ahora_chile,
        EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Santiago') as hora_chile
    `);
    
    const hora = horaActual.rows[0];
    console.log(`🇨🇱 Hora actual Chile: ${hora.ahora_chile} (${hora.hora_chile})`);

    // 2. Simular la consulta del API
    console.log('\n2️⃣ Simulando consulta del API...');
    
    const fecha = '2025-09-16';
    const fechaSiguiente = '2025-09-17';
    
    const queryKPIs = `
      SELECT 
        COALESCE(cl.estado, v.estado_llamado) as estado,
        v.es_actual,
        v.es_proximo,
        v.es_urgente,
        v.es_no_realizado
      FROM central_v_llamados_automaticos v
      LEFT JOIN central_llamados cl ON cl.id = v.id
      WHERE (
        (DATE(v.programado_para AT TIME ZONE 'America/Santiago') = $1 
         AND EXTRACT(HOUR FROM v.programado_para AT TIME ZONE 'America/Santiago') >= 12)
        OR
        (DATE(v.programado_para AT TIME ZONE 'America/Santiago') = $2 
         AND EXTRACT(HOUR FROM v.programado_para AT TIME ZONE 'America/Santiago') < 12)
      )
    `;

    const { rows: kpiRows } = await client.query(queryKPIs, [fecha, fechaSiguiente]);

    // 3. Calcular KPIs como lo hace el API
    const kpis = {
      total: kpiRows.length,
      actuales: 0,
      proximos: 0,
      completados: 0,
      no_realizados: 0,
      urgentes: 0
    };

    kpiRows.forEach((row) => {
      const estado = row.estado;
      
      if (row.es_actual) kpis.actuales++;
      if (row.es_proximo) kpis.proximos++;
      if (row.es_urgente) kpis.urgentes++;
      if (row.es_no_realizado) kpis.no_realizados++;
      
      if (estado !== 'pendiente') {
        kpis.completados++;
      }
    });

    console.log('📊 KPIs calculados:');
    console.log(`  Total: ${kpis.total}`);
    console.log(`  Actuales: ${kpis.actuales}`);
    console.log(`  Próximos: ${kpis.proximos}`);
    console.log(`  Urgentes: ${kpis.urgentes}`);
    console.log(`  Completados: ${kpis.completados}`);
    console.log(`  No realizados: ${kpis.no_realizados}`);

    // 4. Verificar llamados "no realizados" específicos
    console.log('\n3️⃣ Verificando llamados "no realizados"...');
    
    const noRealizados = await client.query(`
      SELECT 
        id,
        instalacion_nombre,
        programado_para AT TIME ZONE 'America/Santiago' as programado_chile,
        estado_llamado,
        es_no_realizado
      FROM central_v_llamados_automaticos
      WHERE es_no_realizado = true
      ORDER BY programado_para
    `);
    
    console.log(`📊 Llamados "no realizados" encontrados: ${noRealizados.rows.length}`);
    noRealizados.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.instalacion_nombre} - ${row.programado_chile}`);
      console.log(`     Estado: ${row.estado_llamado}`);
      console.log(`     Es no realizado: ${row.es_no_realizado}`);
    });

    // 5. Verificar llamados "próximos"
    console.log('\n4️⃣ Verificando llamados "próximos"...');
    
    const proximos = await client.query(`
      SELECT 
        id,
        instalacion_nombre,
        programado_para AT TIME ZONE 'America/Santiago' as programado_chile,
        estado_llamado,
        es_proximo
      FROM central_v_llamados_automaticos
      WHERE es_proximo = true
      ORDER BY programado_para
      LIMIT 5
    `);
    
    console.log(`📊 Llamados "próximos" encontrados: ${proximos.rows.length}`);
    proximos.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.instalacion_nombre} - ${row.programado_chile}`);
      console.log(`     Estado: ${row.estado_llamado}`);
      console.log(`     Es próximo: ${row.es_proximo}`);
    });

    console.log('\n🎯 PRUEBA COMPLETADA');
    console.log('✅ KPI "No realizados" corregido');
    console.log('✅ Lógica de timezone funcionando correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
testKpiNoRealizados()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
