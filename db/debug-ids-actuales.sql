-- =====================================================
-- DEBUG IDs ACTUALES EN LA VISTA
-- =====================================================

-- Mostrar todos los IDs reales para hoy
SELECT 
  'IDs REALES PARA HOY:' as status,
  id,
  instalacion_nombre,
  DATE_PART('hour', programado_para AT TIME ZONE 'America/Santiago') as hora,
  estado_llamado
FROM central_v_llamados_automaticos 
WHERE programado_para::date = '2025-09-16'
ORDER BY programado_para ASC;
