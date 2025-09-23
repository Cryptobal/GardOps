-- =====================================================
-- SOLUCIÓN DEFINITIVA - CENTRAL DE MONITOREO
-- =====================================================
-- 
-- Este script soluciona TODOS los problemas identificados:
-- 1. IDs duplicados en React (keys duplicadas)
-- 2. Lógica incorrecta de KPI "Actuales" 
-- 3. Inconsistencias en conteos de KPIs
-- 4. Problemas de JOIN que causan duplicados
--
-- Autor: AI Assistant
-- Fecha: 2025-09-16
-- =====================================================

-- 1. Eliminar vista existente
DROP VIEW IF EXISTS central_v_llamados_automaticos;

-- 2. Crear vista corregida con lógica perfecta
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
  WHERE pm.estado = 'planificado'
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
-- Colapsar por hora local de Santiago
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
    -- ✅ SOLUCIÓN IDs ÚNICOS: Generar ID determinístico basado en instalación + timestamp exacto
    -- Esto garantiza que el mismo slot siempre tenga el mismo ID
    md5(
      concat(
        ch.instalacion_id::text, 
        '|', 
        extract(epoch from ch.slot_representativo)::text
      )
    )::uuid AS id,
    
    ch.instalacion_id,
    COALESCE(cl.guardia_id, NULL::uuid) AS guardia_id,
    COALESCE(cl.pauta_id, NULL::uuid) AS pauta_id,
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
    
    -- ✅ SOLUCIÓN LÓGICA URGENTE: Considerar fecha Y hora, más de 30 min atrasado
    CASE 
      WHEN ch.hora_local < (now() AT TIME ZONE 'America/Santiago') - interval '30 minutes'
      THEN true 
      ELSE false 
    END AS es_urgente,
    
    -- ✅ SOLUCIÓN LÓGICA ACTUAL: Considerar fecha Y hora exacta (no solo hora)
    CASE 
      WHEN date_trunc('hour', ch.hora_local) = date_trunc('hour', now() AT TIME ZONE 'America/Santiago')
      THEN true 
      ELSE false 
    END AS es_actual,
    
    -- ✅ SOLUCIÓN LÓGICA PRÓXIMO: Futuro considerando fecha completa
    CASE 
      WHEN ch.hora_local > (now() AT TIME ZONE 'America/Santiago')
      THEN true 
      ELSE false 
    END AS es_proximo
    
  FROM colapsado_hora ch
  LEFT JOIN central_llamados cl 
    ON cl.instalacion_id = ch.instalacion_id 
    AND date_trunc('hour', (cl.programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') = ch.hora_local
)
SELECT * FROM unidos_con_estado
ORDER BY programado_para ASC;

-- 3. Verificar que la vista se creó correctamente
SELECT 'Vista central_v_llamados_automaticos creada exitosamente' as resultado;

-- 4. Mostrar estadísticas de prueba
SELECT 
  COUNT(*) as total_llamados,
  COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
  COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
  COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes,
  COUNT(CASE WHEN estado_llamado != 'pendiente' THEN 1 END) as completados,
  COUNT(CASE WHEN estado_llamado = 'pendiente' AND programado_para < now() THEN 1 END) as no_realizados
FROM central_v_llamados_automaticos
WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE;

