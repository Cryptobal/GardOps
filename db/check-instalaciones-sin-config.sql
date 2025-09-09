-- Verificar instalaciones sin configuración de monitoreo
SELECT 
  'Instalaciones sin config de monitoreo:' as info;
SELECT 
  i.id,
  i.nombre,
  i.estado,
  cci.habilitado,
  cci.intervalo_minutos,
  cci.ventana_inicio,
  cci.ventana_fin
FROM instalaciones i
LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
WHERE cci.habilitado IS NULL OR cci.habilitado = false
ORDER BY i.nombre;

-- Verificar cuántas instalaciones tienen turnos planificados hoy
SELECT 
  'Instalaciones con turnos planificados hoy:' as info;
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

-- Verificar qué devuelve la vista actual
SELECT 
  'Llamados en vista central_v_llamados_automaticos:' as info;
SELECT 
  COUNT(*) as total_llamados,
  COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
  COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
  COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes
FROM central_v_llamados_automaticos
WHERE DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')) = CURRENT_DATE;
