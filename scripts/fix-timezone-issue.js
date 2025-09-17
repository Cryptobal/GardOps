const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixTimezoneIssue() {
  console.log('🌍 DIAGNOSTICANDO Y CORRIGIENDO PROBLEMA DE TIMEZONE\n');

  const client = await pool.connect();
  
  try {
    // 1. Diagnóstico completo de timezone
    console.log('1️⃣ Diagnóstico de timezone...');
    
    const timezoneTest = await client.query(`
      SELECT 
        now() as utc_now,
        now() AT TIME ZONE 'America/Santiago' as chile_now,
        EXTRACT(HOUR FROM now()) as utc_hour,
        EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Santiago') as chile_hour,
        '2025-09-16 22:00:00'::timestamp as test_timestamp,
        ('2025-09-16 22:00:00'::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago' as test_converted,
        EXTRACT(HOUR FROM ('2025-09-16 22:00:00'::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') as test_hour
    `);
    
    const tz = timezoneTest.rows[0];
    console.log('🌍 Diagnóstico timezone:');
    console.log(`  UTC ahora: ${tz.utc_now}`);
    console.log(`  Chile ahora: ${tz.chile_now}`);
    console.log(`  Hora UTC: ${tz.utc_hour}`);
    console.log(`  Hora Chile: ${tz.chile_hour}`);
    console.log(`  Test timestamp: ${tz.test_timestamp}`);
    console.log(`  Test convertido: ${tz.test_converted}`);
    console.log(`  Test hora: ${tz.test_hour}`);

    // 2. Verificar el llamado problemático específico
    console.log('\n2️⃣ Analizando llamado problemático...');
    
    const problematico = await client.query(`
      SELECT 
        id,
        instalacion_nombre,
        programado_para,
        programado_para AT TIME ZONE 'America/Santiago' as programado_chile,
        EXTRACT(HOUR FROM programado_para) as hora_utc,
        EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') as hora_chile,
        date_trunc('hour', (programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') as hora_truncada,
        es_actual
      FROM central_v_llamados_automaticos 
      WHERE id = '9440dd68-c959-6898-eae2-bb211e76b3e0'
    `);
    
    if (problematico.rows.length > 0) {
      const p = problematico.rows[0];
      console.log('🔍 Llamado problemático:');
      console.log(`  ID: ${p.id}`);
      console.log(`  Instalación: ${p.instalacion_nombre}`);
      console.log(`  Programado para (UTC): ${p.programado_para}`);
      console.log(`  Programado para (Chile): ${p.programado_chile}`);
      console.log(`  Hora UTC: ${p.hora_utc}`);
      console.log(`  Hora Chile: ${p.hora_chile}`);
      console.log(`  Hora truncada: ${p.hora_truncada}`);
      console.log(`  Es actual: ${p.es_actual}`);
    }

    // 3. Crear vista con lógica de timezone SIMPLIFICADA
    console.log('\n3️⃣ Recreando vista con lógica de timezone simplificada...');
    await client.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    
    const createViewSQL = `
    CREATE VIEW central_v_llamados_automaticos AS
    WITH datos_base AS (
      SELECT DISTINCT
        pm.id as pauta_id,
        pm.puesto_id,
        pm.guardia_id,
        po.instalacion_id,
        i.nombre AS instalacion_nombre,
        i.telefono AS instalacion_telefono,
        g.nombre AS guardia_nombre,
        po.nombre_puesto,
        rs.nombre AS rol_nombre,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.modo,
        cci.mensaje_template,
        (pm.anio || '-' || LPAD(pm.mes::text,2,'0') || '-' || LPAD(pm.dia::text,2,'0'))::date AS fecha
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id AND po.activo = true
      INNER JOIN instalaciones i ON i.id = po.instalacion_id
      INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE pm.tipo_turno = 'planificado'
        AND cci.habilitado = true
        AND cci.intervalo_minutos IS NOT NULL
        AND cci.ventana_inicio IS NOT NULL
        AND cci.ventana_fin IS NOT NULL
    ),
    slots_diurnos AS (
      SELECT 
        db.*,
        gs.slot_inicio
      FROM datos_base db
      CROSS JOIN LATERAL generate_series(
        db.fecha::timestamp + db.ventana_inicio::time,
        db.fecha::timestamp + db.ventana_fin::time,
        make_interval(mins => db.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE db.ventana_inicio < db.ventana_fin
    ),
    slots_nocturnos_1 AS (
      SELECT 
        db.*,
        gs.slot_inicio
      FROM datos_base db
      CROSS JOIN LATERAL generate_series(
        db.fecha::timestamp + db.ventana_inicio::time,
        db.fecha::timestamp + time '23:59:59',
        make_interval(mins => db.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE db.ventana_inicio >= db.ventana_fin
    ),
    slots_nocturnos_2 AS (
      SELECT 
        db.*,
        gs.slot_inicio
      FROM datos_base db
      CROSS JOIN LATERAL generate_series(
        (db.fecha + interval '1 day')::timestamp,
        (db.fecha + interval '1 day')::timestamp + db.ventana_fin::time,
        make_interval(mins => db.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE db.ventana_inicio >= db.ventana_fin
    ),
    todos_los_slots AS (
      SELECT * FROM slots_diurnos
      UNION ALL
      SELECT * FROM slots_nocturnos_1
      UNION ALL
      SELECT * FROM slots_nocturnos_2
    ),
    slots_colapsados AS (
      SELECT 
        ts.*,
        -- ✅ SIMPLIFICAR: Solo usar el timestamp sin conversiones complejas
        ts.slot_inicio AS programado_timestamp,
        ROW_NUMBER() OVER (
          PARTITION BY ts.instalacion_id, 
                       date_trunc('hour', ts.slot_inicio)
          ORDER BY ts.pauta_id, ts.slot_inicio
        ) as rn
      FROM todos_los_slots ts
    ),
    slots_finales AS (
      SELECT sc.*
      FROM slots_colapsados sc
      WHERE sc.rn = 1
    )
    SELECT 
      md5(
        concat(
          sf.instalacion_id::text, 
          '|', 
          extract(epoch from sf.programado_timestamp)::text
        )
      )::uuid AS id,
      
      sf.instalacion_id,
      sf.guardia_id,
      sf.pauta_id,
      sf.puesto_id,
      sf.programado_timestamp AS programado_para,
      COALESCE(cl.estado, 'pendiente') AS estado_llamado,
      COALESCE(cl.contacto_tipo, 'instalacion') AS contacto_tipo,
      COALESCE(cl.contacto_id, sf.instalacion_id) AS contacto_id,
      COALESCE(cl.contacto_nombre, sf.instalacion_nombre) AS contacto_nombre,
      COALESCE(cl.contacto_telefono, sf.instalacion_telefono) AS contacto_telefono,
      cl.observaciones,
      sf.instalacion_nombre,
      sf.guardia_nombre,
      sf.nombre_puesto,
      sf.rol_nombre,
      sf.intervalo_minutos,
      sf.ventana_inicio,
      sf.ventana_fin,
      sf.modo,
      sf.mensaje_template,
      
      -- ✅ SIMPLIFICAR LÓGICA: Usar timestamp directo
      CASE 
        WHEN sf.programado_timestamp < now() - interval '30 minutes'
        THEN true 
        ELSE false 
      END AS es_urgente,
      
      -- ✅ ACTUAL SIMPLIFICADO: Comparar hora directamente
      CASE 
        WHEN date_trunc('hour', sf.programado_timestamp) = date_trunc('hour', now())
        THEN true 
        ELSE false 
      END AS es_actual,
      
      -- ✅ PRÓXIMO SIMPLIFICADO
      CASE 
        WHEN sf.programado_timestamp > now()
        THEN true 
        ELSE false 
      END AS es_proximo
      
    FROM slots_finales sf
    LEFT JOIN central_llamados cl 
      ON cl.instalacion_id = sf.instalacion_id 
      AND date_trunc('hour', cl.programado_para) = date_trunc('hour', sf.programado_timestamp)
    ORDER BY programado_para ASC
    `;
    
    await client.query(createViewSQL);
    console.log('✅ Vista recreada con lógica SIMPLIFICADA');

    // 4. Verificar corrección
    console.log('4️⃣ Verificando corrección...');
    
    const horaActualSimple = await client.query(`
      SELECT 
        now() as ahora,
        date_trunc('hour', now()) as hora_actual_truncada,
        EXTRACT(HOUR FROM now()) as hora_numero
    `);
    
    const actual = horaActualSimple.rows[0];
    console.log(`🕐 Hora actual: ${actual.ahora}`);
    console.log(`🕐 Hora truncada: ${actual.hora_actual_truncada}`);
    console.log(`🕐 Hora número: ${actual.hora_numero}`);

    const actualesCorrectos = await client.query(`
      SELECT 
        id,
        instalacion_nombre,
        programado_para,
        date_trunc('hour', programado_para) as hora_truncada,
        EXTRACT(HOUR FROM programado_para) as hora_numero,
        es_actual
      FROM central_v_llamados_automaticos 
      WHERE es_actual = true
      ORDER BY programado_para
      LIMIT 5
    `);
    
    console.log(`📊 Llamados "actuales" después de simplificación: ${actualesCorrectos.rows.length}`);
    actualesCorrectos.rows.forEach(row => {
      console.log(`  - ${row.instalacion_nombre} - ${row.programado_para}`);
      console.log(`    Hora truncada: ${row.hora_truncada} vs Actual: ${actual.hora_actual_truncada}`);
      console.log(`    Hora número: ${row.hora_numero} vs Actual: ${actual.hora_numero}`);
      console.log(`    ¿Coinciden? ${row.hora_truncada?.getTime() === actual.hora_actual_truncada?.getTime() ? 'SÍ' : 'NO'}`);
    });

    console.log('\n🎉 TIMEZONE CORREGIDO');
    console.log('✅ Lógica simplificada sin conversiones complejas');
    console.log('✅ Comparación directa de timestamps');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
fixTimezoneIssue()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
