-- =====================================================
-- VERIFICAR LLAMADOS EN LA VISTA
-- =====================================================

-- 1. Verificar si hay llamados en la vista
SELECT 'LLAMADOS EN VISTA:' as status;
SELECT 
  id,
  instalacion_nombre,
  estado_llamado,
  programado_para
FROM central_v_llamados_automaticos 
WHERE estado_llamado = 'pendiente'
ORDER BY programado_para ASC
LIMIT 5;

-- 2. Verificar el ID específico del error
SELECT 'ID DEL ERROR:' as status;
SELECT 
  id,
  instalacion_nombre,
  estado_llamado,
  programado_para
FROM central_v_llamados_automaticos 
WHERE id = '846b76fb-e02f-4c2e-8205-46936648c132';

-- 3. Verificar si hay datos en las tablas base
SELECT 'DATOS EN TABLAS BASE:' as status;
SELECT 
  'as_turnos_pauta_mensual' as tabla,
  COUNT(*) as total
FROM as_turnos_pauta_mensual 
WHERE tipo_turno = 'planificado'
UNION ALL
SELECT 
  'central_config_instalacion' as tabla,
  COUNT(*) as total
FROM central_config_instalacion 
WHERE habilitado = true
UNION ALL
SELECT 
  'instalaciones' as tabla,
  COUNT(*) as total
FROM instalaciones;

-- 4. Verificar instalaciones con configuración activa
SELECT 'INSTALACIONES CON MONITOREO:' as status;
SELECT 
  i.id,
  i.nombre,
  cci.habilitado,
  cci.intervalo_minutos,
  cci.ventana_inicio,
  cci.ventana_fin
FROM instalaciones i
INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
WHERE cci.habilitado = true;
