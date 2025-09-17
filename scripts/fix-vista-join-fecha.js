#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixVistaJoinFecha() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 CORRIGIENDO LEFT JOIN PARA INCLUIR FECHA...\n');
    
    // 1. Eliminar vista existente
    console.log('1. Eliminando vista existente...');
    await client.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    console.log('✅ Vista eliminada');
    
    // 2. Crear vista con LEFT JOIN corregido
    console.log('2. Creando vista con LEFT JOIN por instalación + hora + fecha...');
    
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
        (pm.anio || '-' || LPAD(pm.mes::text,2,'0') || '-' || LPAD(pm.dia::text,2,'0'))::date AS fecha
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
        icp.fecha,
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
        icp.fecha,
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
        icp.fecha,
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
        su.fecha,
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
        su.fecha,
        date_trunc('hour', (su.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')
    ),
    unidos_con_estado AS (
      SELECT 
        -- ID CONSISTENTE: usar ID real si existe, sino generar uno basado en instalación + fecha + hora
        COALESCE(cl.id, 
          md5(concat(ch.instalacion_id::text, '|', ch.fecha::text, '|', ch.hora_local::text))::uuid
        ) AS id,
        ch.instalacion_id,
        COALESCE(cl.guardia_id, NULL::uuid) AS guardia_id,
        COALESCE(cl.pauta_id, NULL::bigint) AS pauta_id,
        COALESCE(cl.puesto_id, NULL::uuid) AS puesto_id,
        ch.slot_representativo AS programado_para,
        COALESCE(cl.estado, 'pendiente') AS estado_llamado,
        COALESCE(cl.contacto_tipo, 'instalacion') AS contacto_tipo,
        COALESCE(cl.contacto_id, ch.instalacion_id) AS contacto_id,
        COALESCE(cl.contacto_nombre, ch.instalacion_nombre) AS contacto_nombre,
        COALESCE(cl.contacto_telefono, ch.instalacion_telefono) AS contacto_telefono,
        cl.observaciones,
        ch.instalacion_nombre,
        NULL::text AS guardia_nombre,
        NULL::text AS nombre_puesto,
        NULL::text AS rol_nombre,
        ch.intervalo_minutos,
        ch.ventana_inicio,
        ch.ventana_fin,
        ch.modo,
        ch.mensaje_template,
        CASE 
          WHEN (ch.hora_local::date = (now() AT TIME ZONE 'America/Santiago')::date) 
               AND (ch.hora_local < (now() AT TIME ZONE 'America/Santiago') - interval '30 minutes') 
          THEN true 
          ELSE false 
        END AS es_urgente,
        CASE 
          WHEN (ch.hora_local::date = (now() AT TIME ZONE 'America/Santiago')::date) 
               AND (date_trunc('hour', ch.hora_local) = date_trunc('hour', now() AT TIME ZONE 'America/Santiago')) 
          THEN true 
          ELSE false 
        END AS es_actual,
        CASE 
          WHEN (ch.hora_local::date = (now() AT TIME ZONE 'America/Santiago')::date) 
          THEN ch.hora_local > (now() AT TIME ZONE 'America/Santiago') 
          ELSE ch.hora_local::date > (now() AT TIME ZONE 'America/Santiago')::date 
        END AS es_proximo
      FROM colapsado_hora ch
      LEFT JOIN central_llamados cl ON cl.instalacion_id = ch.instalacion_id 
        AND date_trunc('hour', (cl.programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') = ch.hora_local
        AND DATE(cl.programado_para AT TIME ZONE 'America/Santiago') = ch.fecha  -- ¡ESTA ES LA CORRECCIÓN!
    )
    SELECT * FROM unidos_con_estado
    ORDER BY programado_para ASC
    `;
    
    await client.query(createViewSQL);
    console.log('✅ Vista creada con LEFT JOIN corregido');
    
    // 3. Verificar que funciona
    console.log('3. Verificando que los estados ya no se repiten...');
    
    const test16 = await client.query(`
      SELECT COUNT(*) as total, COUNT(CASE WHEN estado_llamado = 'exitoso' THEN 1 END) as exitosos
      FROM central_v_llamados_automaticos 
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16'
    `);
    
    const test18 = await client.query(`
      SELECT COUNT(*) as total, COUNT(CASE WHEN estado_llamado = 'exitoso' THEN 1 END) as exitosos
      FROM central_v_llamados_automaticos 
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-18'
    `);
    
    console.log(`16/09: ${test16.rows[0].total} total, ${test16.rows[0].exitosos} exitosos`);
    console.log(`18/09: ${test18.rows[0].total} total, ${test18.rows[0].exitosos} exitosos`);
    
    if (test18.rows[0].exitosos === 0) {
      console.log('\\n🎉 ¡PROBLEMA SOLUCIONADO!');
      console.log('Ya no aparecen llamados exitosos en fechas futuras.');
    } else {
      console.log('\\n❌ Aún hay problema...');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixVistaJoinFecha();
