-- Verificación final del Central de Monitoreo

-- 1. Verificar configuraciones de monitoreo
SELECT 
  'Configuraciones de monitoreo habilitadas:' as info;
SELECT 
  i.nombre,
  cci.habilitado,
  cci.intervalo_minutos,
  cci.ventana_inicio,
  cci.ventana_fin
FROM instalaciones i
INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
WHERE cci.habilitado = true
ORDER BY i.nombre;

-- 2. Verificar turnos planificados hoy
SELECT 
  'Turnos planificados hoy:' as info;
SELECT 
  i.nombre,
  COUNT(*) as turnos_planificados
FROM as_turnos_pauta_mensual pm
INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
INNER JOIN instalaciones i ON po.instalacion_id = i.id
WHERE pm.estado = 'planificado'
  AND po.activo = true
  AND pm.anio = EXTRACT(YEAR FROM CURRENT_DATE)
  AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE)
  AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE)
GROUP BY i.id, i.nombre
ORDER BY i.nombre;

-- 3. Verificar llamados en la vista
SELECT 
  'Llamados en vista central_v_llamados_automaticos:' as info;
SELECT 
  COUNT(*) as total_llamados,
  COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
  COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
  COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes,
  COUNT(CASE WHEN estado_llamado != 'pendiente' THEN 1 END) as completados
FROM central_v_llamados_automaticos
WHERE DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')) = CURRENT_DATE;

-- 4. Verificar algunos llamados específicos
SELECT 
  'Ejemplos de llamados programados:' as info;
SELECT 
  instalacion_nombre,
  programado_para,
  estado_llamado,
  es_actual,
  es_proximo,
  es_urgente
FROM central_v_llamados_automaticos
WHERE DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')) = CURRENT_DATE
ORDER BY programado_para
LIMIT 10;

-- 5. Verificar hora actual del sistema
SELECT 
  'Hora actual del sistema:' as info;
SELECT 
  NOW() as hora_utc,
  NOW() AT TIME ZONE 'America/Santiago' as hora_santiago,
  EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/Santiago') as hora_actual_santiago;
