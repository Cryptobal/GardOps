-- 1. Crear configuración de monitoreo para todas las instalaciones con turnos planificados hoy
INSERT INTO central_config_instalacion (
  instalacion_id,
  habilitado,
  intervalo_minutos,
  ventana_inicio,
  ventana_fin,
  modo,
  mensaje_template,
  created_at,
  updated_at
)
SELECT DISTINCT
  i.id as instalacion_id,
  true as habilitado,
  60 as intervalo_minutos,
  '21:00'::time as ventana_inicio,
  '07:00'::time as ventana_fin,
  'whatsapp' as modo,
  'Hola, soy de la central de monitoreo. ¿Todo bien en la instalación?' as mensaje_template,
  NOW() as created_at,
  NOW() as updated_at
FROM instalaciones i
INNER JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id
INNER JOIN as_turnos_pauta_mensual pm ON pm.puesto_id = po.id
WHERE pm.estado = 'planificado'
  AND po.activo = true
  AND pm.anio = EXTRACT(YEAR FROM CURRENT_DATE)
  AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE)
  AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE)
  AND NOT EXISTS (
    SELECT 1 FROM central_config_instalacion cci 
    WHERE cci.instalacion_id = i.id
  );

-- 2. Habilitar monitoreo para instalaciones que ya tienen configuración pero están deshabilitadas
UPDATE central_config_instalacion 
SET habilitado = true, updated_at = NOW()
WHERE habilitado = false;

-- 3. Verificar qué instalaciones tienen configuración ahora
SELECT 
  'Configuraciones de monitoreo creadas:' as info;
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

-- 4. Verificar qué devuelve la vista ahora
SELECT 
  'Llamados en vista central_v_llamados_automaticos:' as info;
SELECT 
  COUNT(*) as total_llamados,
  COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
  COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
  COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes
FROM central_v_llamados_automaticos
WHERE DATE(((programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')) = CURRENT_DATE;
