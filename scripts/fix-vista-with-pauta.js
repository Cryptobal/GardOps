const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixVistaWithPauta() {
  console.log('🔧 CORRIGIENDO VISTA CON DATOS DE PAUTA MENSUAL\n');

  const client = await pool.connect();
  
  try {
    console.log('1️⃣ Eliminando vista existente...');
    await client.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    console.log('✅ Vista eliminada');

    console.log('2️⃣ Creando vista corregida con datos de pauta mensual...');
    
    const createViewSQL = `
    CREATE VIEW central_v_llamados_automaticos AS
    WITH instalaciones_con_plan AS (
      SELECT DISTINCT
        i.id AS instalacion_id,
        i.nombre AS instalacion_nombre,
        i.telefono AS instalacion_telefono,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.modo,
        cci.mensaje_template,
        (pm.anio || '-' || LPAD(pm.mes::text,2,'0') || '-' || LPAD(pm.dia::text,2,'0'))::date AS fecha,
        pm.guardia_id,
        pm.puesto_id,
        pm.id as pauta_id
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id AND po.activo = true
      INNER JOIN instalaciones i ON i.id = po.instalacion_id
      INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE pm.tipo_turno = 'planificado'
        AND cci.habilitado = true
        AND cci.intervalo_minutos IS NOT NULL
        AND cci.ventana_inicio IS NOT NULL
        AND cci.ventana_fin IS NOT NULL
    ),
    slots_diurnos AS (
      SELECT
        icp.instalacion_id,
        icp.instalacion_nombre,
        icp.instalacion_telefono,
        icp.intervalo_minutos,
        icp.ventana_inicio,
        icp.ventana_fin,
        icp.modo,
        icp.mensaje_template,
        icp.guardia_id,
        icp.puesto_id,
        icp.pauta_id,
        gs.slot_inicio
      FROM instalaciones_con_plan icp
      CROSS JOIN LATERAL generate_series(
        (icp.fecha::timestamp + icp.ventana_inicio::time),
        (icp.fecha::timestamp + icp.ventana_fin::time),
        make_interval(mins => icp.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE icp.ventana_inicio < icp.ventana_fin
    ),
    slots_cruce_dia1 AS (
      SELECT
        icp.instalacion_id,
        icp.instalacion_nombre,
        icp.instalacion_telefono,
        icp.intervalo_minutos,
        icp.ventana_inicio,
        icp.ventana_fin,
        icp.modo,
        icp.mensaje_template,
        icp.guardia_id,
        icp.puesto_id,
        icp.pauta_id,
        gs.slot_inicio
      FROM instalaciones_con_plan icp
      CROSS JOIN LATERAL generate_series(
        (icp.fecha::timestamp + icp.ventana_inicio::time),
        (icp.fecha::timestamp + interval '1 day' - interval '1 second'),
        make_interval(mins => icp.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE icp.ventana_inicio >= icp.ventana_fin
    ),
    slots_cruce_dia2 AS (
      SELECT
        icp.instalacion_id,
        icp.instalacion_nombre,
        icp.instalacion_telefono,
        icp.intervalo_minutos,
        icp.ventana_inicio,
        icp.ventana_fin,
        icp.modo,
        icp.mensaje_template,
        icp.guardia_id,
        icp.puesto_id,
        icp.pauta_id,
        gs.slot_inicio
      FROM instalaciones_con_plan icp
      CROSS JOIN LATERAL generate_series(
        ((icp.fecha + 1)::timestamp),
        (((icp.fecha + 1)::date + icp.ventana_fin::time)::timestamp),
        make_interval(mins => icp.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE icp.ventana_inicio >= icp.ventana_fin
    ),
    slots_unidos AS (
      SELECT * FROM slots_diurnos
      UNION ALL
      SELECT * FROM slots_cruce_dia1
      UNION ALL
      SELECT * FROM slots_cruce_dia2
    ),
    colapsado_hora AS (
      SELECT 
        su.instalacion_id,
        su.instalacion_nombre,
        su.instalacion_telefono,
        su.intervalo_minutos,
        su.ventana_inicio,
        su.ventana_fin,
        su.modo,
        su.mensaje_template,
        su.guardia_id,
        su.puesto_id,
        su.pauta_id,
        date_trunc('hour', (su.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') AS hora_local,
        MIN(su.slot_inicio) AS slot_representativo
      FROM slots_unidos su
      GROUP BY 
        su.instalacion_id,
        su.instalacion_nombre,
        su.instalacion_telefono,
        su.intervalo_minutos,
        su.ventana_inicio,
        su.ventana_fin,
        su.modo,
        su.mensaje_template,
        su.guardia_id,
        su.puesto_id,
        su.pauta_id,
        date_trunc('hour', (su.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')
    )
    SELECT 
      -- ✅ ID único basado en instalación + timestamp
      md5(
        concat(
          ch.instalacion_id::text, 
          '|', 
          extract(epoch from ch.slot_representativo)::text
        )
      )::uuid AS id,
      
      ch.instalacion_id,
      ch.guardia_id,
      ch.pauta_id,
      ch.puesto_id,
      ch.slot_representativo AS programado_para,
      COALESCE(cl.estado, 'pendiente') AS estado_llamado,
      COALESCE(cl.contacto_tipo, 'instalacion') AS contacto_tipo,
      COALESCE(cl.contacto_id, ch.instalacion_id) AS contacto_id,
      COALESCE(cl.contacto_nombre, ch.instalacion_nombre) AS contacto_nombre,
      COALESCE(cl.contacto_telefono, ch.instalacion_telefono) AS contacto_telefono,
      cl.observaciones,
      ch.instalacion_nombre,
      g.nombre AS guardia_nombre,
      po.nombre_puesto,
      rs.nombre AS rol_nombre,
      ch.intervalo_minutos,
      ch.ventana_inicio,
      ch.ventana_fin,
      ch.modo,
      ch.mensaje_template,
      
      -- ✅ LÓGICA CORREGIDA: Urgente (más de 30 min atrasado)
      CASE 
        WHEN ch.hora_local < (now() AT TIME ZONE 'America/Santiago') - interval '30 minutes'
        THEN true 
        ELSE false 
      END AS es_urgente,
      
      -- ✅ LÓGICA CORREGIDA: Actual (hora exacta actual)
      CASE 
        WHEN date_trunc('hour', ch.hora_local) = date_trunc('hour', now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_actual,
      
      -- ✅ LÓGICA CORREGIDA: Próximo (futuro)
      CASE 
        WHEN ch.hora_local > (now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_proximo
      
    FROM colapsado_hora ch
    LEFT JOIN central_llamados cl 
      ON cl.instalacion_id = ch.instalacion_id 
      AND date_trunc('hour', (cl.programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') = ch.hora_local
    LEFT JOIN guardias g ON ch.guardia_id = g.id
    LEFT JOIN as_turnos_puestos_operativos po ON ch.puesto_id = po.id
    LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
    ORDER BY programado_para ASC
    `;
    
    await client.query(createViewSQL);
    console.log('✅ Vista creada exitosamente con datos de pauta mensual');

    // 3. Verificar estadísticas
    console.log('3️⃣ Verificando estadísticas...');
    
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
    
    console.log('📊 Estadísticas (últimos 3 días):', stats.rows[0]);

    // 4. Mostrar algunos registros de ejemplo
    console.log('4️⃣ Mostrando registros de ejemplo...');
    
    const examples = await client.query(`
      SELECT 
        instalacion_nombre,
        guardia_nombre,
        programado_para AT TIME ZONE 'America/Santiago' as hora_local,
        estado_llamado,
        es_actual,
        es_proximo,
        es_urgente
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE
      ORDER BY programado_para
      LIMIT 5
    `);
    
    console.log('📋 Ejemplos de llamados del día actual:');
    examples.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.instalacion_nombre} - ${row.guardia_nombre || 'Sin guardia'} - ${row.hora_local} - ${row.estado_llamado} - Actual:${row.es_actual} Próximo:${row.es_proximo} Urgente:${row.es_urgente}`);
    });

    console.log('\n🎉 VISTA CORREGIDA EXITOSAMENTE');
    console.log('✅ Vista conectada con pauta mensual');
    console.log('✅ IDs únicos implementados');
    console.log('✅ Lógica de KPIs corregida');
    console.log('✅ Datos de guardias y puestos incluidos');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
fixVistaWithPauta()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

