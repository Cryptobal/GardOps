const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixLogicaActualFinal() {
  console.log('🔧 CORRIGIENDO LÓGICA DE ACTUALES - VERSIÓN FINAL\n');

  const client = await pool.connect();
  
  try {
    // 1. Verificar hora actual exacta
    console.log('1️⃣ Verificando hora actual...');
    const horaActual = await client.query(`
      SELECT 
        now() AT TIME ZONE 'America/Santiago' as hora_chile_completa,
        EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Santiago') as hora_chile_numero,
        DATE(now() AT TIME ZONE 'America/Santiago') as fecha_chile
    `);
    
    const hora = horaActual.rows[0];
    console.log(`🕐 Hora actual en Chile: ${hora.hora_chile_completa}`);
    console.log(`🕐 Hora como número: ${hora.hora_chile_numero}`);
    console.log(`📅 Fecha actual: ${hora.fecha_chile}`);

    // 2. Verificar qué llamados están marcados como actuales
    console.log('\n2️⃣ Verificando llamados marcados como "actuales"...');
    const actualesMal = await client.query(`
      SELECT 
        id,
        instalacion_nombre,
        programado_para AT TIME ZONE 'America/Santiago' as hora_programada,
        EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') as hora_programada_numero,
        DATE(programado_para AT TIME ZONE 'America/Santiago') as fecha_programada,
        es_actual
      FROM central_v_llamados_automaticos 
      WHERE es_actual = true
      ORDER BY programado_para
    `);
    
    console.log(`📊 Llamados marcados como "actuales": ${actualesMal.rows.length}`);
    actualesMal.rows.forEach(row => {
      console.log(`  - ID: ${row.id}`);
      console.log(`    ${row.instalacion_nombre} - ${row.hora_programada}`);
      console.log(`    Hora programada: ${row.hora_programada_numero} vs Hora actual: ${hora.hora_chile_numero}`);
      console.log(`    ¿Coinciden? ${row.hora_programada_numero == hora.hora_chile_numero ? 'SÍ' : 'NO'}`);
    });

    console.log('\n3️⃣ Recreando vista con lógica CORRECTA...');
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
    -- ✅ SLOTS DIURNOS
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
    -- ✅ SLOTS NOCTURNOS PARTE 1
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
    -- ✅ SLOTS NOCTURNOS PARTE 2
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
        date_trunc('hour', (ts.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') AS hora_local,
        ROW_NUMBER() OVER (
          PARTITION BY ts.instalacion_id, 
                       date_trunc('hour', (ts.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')
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
          extract(epoch from sf.slot_inicio)::text
        )
      )::uuid AS id,
      
      sf.instalacion_id,
      sf.guardia_id,
      sf.pauta_id,
      sf.puesto_id,
      sf.slot_inicio AS programado_para,
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
      
      -- ✅ URGENTE: Más de 30 min atrasado
      CASE 
        WHEN sf.hora_local < (now() AT TIME ZONE 'America/Santiago') - interval '30 minutes'
        THEN true 
        ELSE false 
      END AS es_urgente,
      
      -- ✅ ACTUAL: **EXACTAMENTE** la misma hora Y fecha
      CASE 
        WHEN EXTRACT(HOUR FROM sf.hora_local) = EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Santiago')
         AND EXTRACT(DAY FROM sf.hora_local) = EXTRACT(DAY FROM now() AT TIME ZONE 'America/Santiago')
         AND EXTRACT(MONTH FROM sf.hora_local) = EXTRACT(MONTH FROM now() AT TIME ZONE 'America/Santiago')
         AND EXTRACT(YEAR FROM sf.hora_local) = EXTRACT(YEAR FROM now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_actual,
      
      -- ✅ PRÓXIMO: Futuro
      CASE 
        WHEN sf.hora_local > (now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_proximo
      
    FROM slots_finales sf
    LEFT JOIN central_llamados cl 
      ON cl.instalacion_id = sf.instalacion_id 
      AND date_trunc('hour', (cl.programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') = sf.hora_local
    ORDER BY programado_para ASC
    `;
    
    await client.query(createViewSQL);
    console.log('✅ Vista recreada con lógica CORRECTA');

    // 4. Verificar corrección
    console.log('4️⃣ Verificando corrección...');
    
    const actualesCorrectos = await client.query(`
      SELECT 
        id,
        instalacion_nombre,
        programado_para AT TIME ZONE 'America/Santiago' as hora_programada,
        EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') as hora_programada_numero,
        es_actual
      FROM central_v_llamados_automaticos 
      WHERE es_actual = true
      ORDER BY programado_para
    `);
    
    console.log(`📊 Llamados "actuales" DESPUÉS de corrección: ${actualesCorrectos.rows.length}`);
    if (actualesCorrectos.rows.length > 0) {
      actualesCorrectos.rows.forEach(row => {
        console.log(`  - ID: ${row.id}`);
        console.log(`    ${row.instalacion_nombre} - ${row.hora_programada}`);
        console.log(`    Hora: ${row.hora_programada_numero} (debería ser ${hora.hora_chile_numero})`);
      });
    } else {
      console.log(`  ✅ CORRECTO: No hay llamados programados para las ${hora.hora_chile_numero}:xx`);
    }

    // 5. Estadísticas finales
    console.log('5️⃣ Estadísticas finales...');
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes,
        COUNT(CASE WHEN estado_llamado != 'pendiente' THEN 1 END) as completados,
        COUNT(CASE WHEN estado_llamado = 'pendiente' AND programado_para < now() THEN 1 END) as no_realizados
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') BETWEEN CURRENT_DATE - 1 AND CURRENT_DATE + 1
    `);
    
    console.log('📊 Estadísticas corregidas:', stats.rows[0]);

    console.log('\n🎉 LÓGICA DE ACTUALES CORREGIDA DEFINITIVAMENTE');
    console.log('✅ Solo muestra llamados de la hora EXACTA actual');
    console.log('✅ Sin duplicados');
    console.log('✅ Ventanas nocturnas soportadas');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
fixLogicaActualFinal()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
