-- =====================================================
-- CORRECCIÓN VISTA CENTRAL - Campo estado correcto
-- =====================================================

-- Eliminar vista existente
DROP VIEW IF EXISTS central_v_llamados_automaticos;

-- Crear nueva vista con el campo correcto pm.estado = 'planificado'
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
  WHERE pm.estado = 'planificado'  -- CORREGIDO: usar pm.estado en lugar de pm.estado_operacion
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
-- Colapsar por hora local de Santiago y hacer LEFT JOIN a estados reales
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
    date_trunc('hour', (su.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')
),
unidos_con_estado AS (
  SELECT 
    gen_random_uuid() AS id,
    ch.instalacion_id,
    NULL::uuid AS guardia_id,
    NULL::uuid AS pauta_id,
    NULL::uuid AS puesto_id,
    -- Programado en UTC guardando el slot representativo, pero calculando flags por hora local
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
    -- Flags por hora local America/Santiago
    CASE 
      WHEN (ch.hora_local::date = (now() AT TIME ZONE 'America/Santiago')::date)
       AND (ch.hora_local < (now() AT TIME ZONE 'America/Santiago') - interval '30 minutes')
      THEN true ELSE false END AS es_urgente,
    CASE 
      WHEN (ch.hora_local::date = (now() AT TIME ZONE 'America/Santiago')::date)
       AND (date_trunc('hour', ch.hora_local) = date_trunc('hour', now() AT TIME ZONE 'America/Santiago'))
      THEN true ELSE false END AS es_actual,
    CASE 
      WHEN (ch.hora_local::date = (now() AT TIME ZONE 'America/Santiago')::date)
      THEN ch.hora_local > (now() AT TIME ZONE 'America/Santiago')
      ELSE ch.hora_local::date > (now() AT TIME ZONE 'America/Santiago')::date
    END AS es_proximo
  FROM colapsado_hora ch
  LEFT JOIN central_llamados cl
    ON cl.instalacion_id = ch.instalacion_id
   AND date_trunc('hour', (cl.programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') = ch.hora_local
)
SELECT *
FROM unidos_con_estado
ORDER BY programado_para ASC;

-- Comentarios para documentación
COMMENT ON VIEW central_v_llamados_automaticos IS 'Vista automática que calcula llamados de monitoreo desde pauta mensual en tiempo real - CORREGIDA para usar pm.estado = planificado';
COMMENT ON COLUMN central_v_llamados_automaticos.es_urgente IS 'Indica si el llamado está atrasado más de 30 minutos';
COMMENT ON COLUMN central_v_llamados_automaticos.es_actual IS 'Indica si el llamado es para la hora actual';
COMMENT ON COLUMN central_v_llamados_automaticos.es_proximo IS 'Indica si el llamado es para el resto del día';

-- Verificar que la vista funciona
SELECT 
  'Vista corregida exitosamente' as status,
  COUNT(*) as total_llamados_hoy
FROM central_v_llamados_automaticos 
WHERE DATE(programado_para) = CURRENT_DATE;


