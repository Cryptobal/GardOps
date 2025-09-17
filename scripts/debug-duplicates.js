const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function debugDuplicates() {
  console.log('🔍 DIAGNOSTICANDO DUPLICADOS EN LA VISTA\n');

  const client = await pool.connect();
  
  try {
    // 1. Verificar duplicados por ID
    console.log('1️⃣ Verificando duplicados por ID...');
    const duplicateIds = await client.query(`
      SELECT 
        id, 
        COUNT(*) as cantidad,
        array_agg(instalacion_nombre || ' - ' || programado_para::text) as detalles
      FROM central_v_llamados_automaticos 
      GROUP BY id 
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC
      LIMIT 10
    `);
    
    console.log(`📊 IDs duplicados encontrados: ${duplicateIds.rows.length}`);
    duplicateIds.rows.forEach(row => {
      console.log(`  - ID: ${row.id} (${row.cantidad} veces)`);
      console.log(`    Detalles: ${row.detalles.join(', ')}`);
    });

    // 2. Verificar lógica de "actuales"
    console.log('\n2️⃣ Verificando lógica de actuales...');
    const horaActual = new Date().toISOString();
    console.log(`🕐 Hora actual del sistema: ${horaActual}`);
    console.log(`🕐 Hora actual en Santiago: ${new Date().toLocaleString('es-CL', {timeZone: 'America/Santiago'})}`);
    
    const actuales = await client.query(`
      SELECT 
        instalacion_nombre,
        programado_para AT TIME ZONE 'America/Santiago' as hora_santiago,
        es_actual,
        date_trunc('hour', (programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') as hora_truncada,
        date_trunc('hour', now() AT TIME ZONE 'America/Santiago') as hora_actual_truncada
      FROM central_v_llamados_automaticos 
      WHERE es_actual = true
      ORDER BY programado_para
      LIMIT 10
    `);
    
    console.log(`📊 Llamados marcados como "actuales": ${actuales.rows.length}`);
    actuales.rows.forEach(row => {
      console.log(`  - ${row.instalacion_nombre} - ${row.hora_santiago}`);
      console.log(`    Hora truncada: ${row.hora_truncada} vs Actual: ${row.hora_actual_truncada}`);
      console.log(`    ¿Son iguales? ${row.hora_truncada?.getTime() === row.hora_actual_truncada?.getTime()}`);
    });

    // 3. Verificar estructura de colapsado_hora
    console.log('\n3️⃣ Verificando estructura interna...');
    const estructura = await client.query(`
      WITH colapsado_hora AS (
        SELECT 
          instalacion_id,
          instalacion_nombre,
          date_trunc('hour', (slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') AS hora_local,
          COUNT(*) as slots_por_hora,
          array_agg(slot_inicio::text) as slots
        FROM (
          SELECT 
            i.id AS instalacion_id,
            i.nombre AS instalacion_nombre,
            gs.slot_inicio
          FROM as_turnos_pauta_mensual pm
          INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id AND po.activo = true
          INNER JOIN instalaciones i ON i.id = po.instalacion_id
          INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
          CROSS JOIN LATERAL generate_series(
            ((pm.anio || '-' || LPAD(pm.mes::text,2,'0') || '-' || LPAD(pm.dia::text,2,'0'))::date::timestamp + cci.ventana_inicio::time),
            ((pm.anio || '-' || LPAD(pm.mes::text,2,'0') || '-' || LPAD(pm.dia::text,2,'0'))::date::timestamp + cci.ventana_fin::time),
            make_interval(mins => cci.intervalo_minutos)
          ) AS gs(slot_inicio)
          WHERE pm.tipo_turno = 'planificado'
            AND cci.habilitado = true
            AND cci.intervalo_minutos IS NOT NULL
            AND cci.ventana_inicio IS NOT NULL
            AND cci.ventana_fin IS NOT NULL
            AND cci.ventana_inicio < cci.ventana_fin
            AND DATE(pm.anio || '-' || LPAD(pm.mes::text,2,'0') || '-' || LPAD(pm.dia::text,2,'0')) = CURRENT_DATE
        ) slots
        GROUP BY instalacion_id, instalacion_nombre, date_trunc('hour', (slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')
      )
      SELECT * FROM colapsado_hora 
      WHERE slots_por_hora > 1
      ORDER BY slots_por_hora DESC
      LIMIT 5
    `);
    
    console.log(`📊 Horas con múltiples slots: ${estructura.rows.length}`);
    estructura.rows.forEach(row => {
      console.log(`  - ${row.instalacion_nombre} - ${row.hora_local}: ${row.slots_por_hora} slots`);
    });

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
debugDuplicates()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
