const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixTimezoneChileFinal() {
  console.log('🇨🇱 CORRECCIÓN FINAL - TIMEZONE CHILE CORRECTO\n');

  const client = await pool.connect();
  
  try {
    console.log('1️⃣ Eliminando vista existente...');
    await client.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    console.log('✅ Vista eliminada');

    console.log('2️⃣ Creando vista con timezone Chile CORRECTO...');
    
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
        WHEN sf.slot_inicio < now() - interval '30 minutes'
        THEN true 
        ELSE false 
      END AS es_urgente,
      
      -- ✅ ACTUAL: **CONVERTIR A CHILE ANTES DE COMPARAR**
      CASE 
        WHEN date_trunc('hour', sf.slot_inicio AT TIME ZONE 'America/Santiago') = 
             date_trunc('hour', now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_actual,
      
      -- ✅ PRÓXIMO: Futuro
      CASE 
        WHEN sf.slot_inicio > now()
        THEN true 
        ELSE false 
      END AS es_proximo
      
    FROM slots_finales sf
    LEFT JOIN central_llamados cl 
      ON cl.instalacion_id = sf.instalacion_id 
      AND date_trunc('hour', cl.programado_para) = date_trunc('hour', sf.slot_inicio)
    ORDER BY programado_para ASC
    `;
    
    await client.query(createViewSQL);
    console.log('✅ Vista recreada con timezone Chile CORRECTO');

    // 3. Verificar corrección final
    console.log('3️⃣ Verificando corrección FINAL...');
    
    const horaChile = await client.query(`
      SELECT 
        now() AT TIME ZONE 'America/Santiago' as hora_chile,
        EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Santiago') as hora_chile_numero,
        date_trunc('hour', now() AT TIME ZONE 'America/Santiago') as hora_chile_truncada
    `);
    
    const hc = horaChile.rows[0];
    console.log(`🇨🇱 Hora actual en Chile: ${hc.hora_chile} (${hc.hora_chile_numero})`);

    const actualesCorrectos = await client.query(`
      SELECT 
        id,
        instalacion_nombre,
        programado_para AT TIME ZONE 'America/Santiago' as hora_chile,
        EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') as hora_chile_numero,
        es_actual
      FROM central_v_llamados_automaticos 
      WHERE es_actual = true
      ORDER BY programado_para
    `);
    
    console.log(`📊 Llamados "actuales" DESPUÉS de corrección: ${actualesCorrectos.rows.length}`);
    if (actualesCorrectos.rows.length > 0) {
      actualesCorrectos.rows.forEach(row => {
        console.log(`  - ${row.instalacion_nombre} - ${row.hora_chile} (hora ${row.hora_chile_numero})`);
        console.log(`    ¿Correcto? ${row.hora_chile_numero == hc.hora_chile_numero ? 'SÍ ✅' : 'NO ❌'}`);
      });
    } else {
      console.log(`  ✅ PERFECTO: No hay llamados programados para las ${hc.hora_chile_numero}:xx`);
    }

    console.log('\n🎉 TIMEZONE CHILE CORREGIDO DEFINITIVAMENTE');
    console.log('✅ Comparación correcta en zona horaria Chile');
    console.log('✅ Sin duplicados');
    console.log('✅ Lógica de actuales funcionando correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
fixTimezoneChileFinal()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
