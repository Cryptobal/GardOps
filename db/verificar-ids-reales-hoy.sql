-- =====================================================
-- VERIFICAR IDs REALES PARA HOY
-- =====================================================

-- 1. Mostrar TODOS los IDs reales para hoy (16/09/2025)
SELECT 
  'IDs REALES PARA HOY (16/09/2025):' as status,
  id,
  instalacion_nombre,
  DATE_PART('hour', programado_para AT TIME ZONE 'America/Santiago') as hora,
  estado_llamado,
  programado_para
FROM central_v_llamados_automaticos 
WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16'
ORDER BY programado_para ASC;

-- 2. Verificar específicamente los IDs que están fallando
SELECT 'VERIFICAR IDS QUE FALLAN:' as status;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM central_v_llamados_automaticos WHERE id = 'f4d58ea3-bd4b-440b-ba50-9e9bb042dd16') 
    THEN 'f4d58ea3-bd4b-440b-ba50-9e9bb042dd16 - EXISTE'
    ELSE 'f4d58ea3-bd4b-440b-ba50-9e9bb042dd16 - NO EXISTE'
  END as id_1,
  CASE 
    WHEN EXISTS (SELECT 1 FROM central_v_llamados_automaticos WHERE id = '1780ca7c-8293-4cab-8bf1-8c79ff1088b1') 
    THEN '1780ca7c-8293-4cab-8bf1-8c79ff1088b1 - EXISTE'
    ELSE '1780ca7c-8293-4cab-8bf1-8c79ff1088b1 - NO EXISTE'
  END as id_2;