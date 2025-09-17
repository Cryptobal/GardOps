-- =====================================================
-- DEBUG COMPLETO DE IDs - VISTA VS TABLA
-- =====================================================

-- 1. IDs en la VISTA para hoy
SELECT 
  'VISTA - IDs para hoy:' as tipo,
  id,
  instalacion_nombre,
  DATE_PART('hour', programado_para AT TIME ZONE 'America/Santiago') as hora,
  estado_llamado
FROM central_v_llamados_automaticos 
WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16'
ORDER BY programado_para ASC;

-- 2. IDs en la TABLA central_llamados para hoy
SELECT 
  'TABLA - IDs para hoy:' as tipo,
  id,
  instalacion_id,
  DATE_PART('hour', programado_para AT TIME ZONE 'America/Santiago') as hora,
  estado
FROM central_llamados 
WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16'
ORDER BY programado_para ASC;

-- 3. Verificar si los IDs de la vista existen en la tabla
SELECT 
  'COMPARACION - IDs de vista que NO existen en tabla:' as tipo,
  v.id,
  v.instalacion_nombre,
  DATE_PART('hour', v.programado_para AT TIME ZONE 'America/Santiago') as hora
FROM central_v_llamados_automaticos v
LEFT JOIN central_llamados cl ON cl.id = v.id
WHERE DATE(v.programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16'
  AND cl.id IS NULL
ORDER BY v.programado_para ASC;

-- 4. Verificar el ID específico que está fallando
SELECT 
  'ID ESPECIFICO FALLANDO:' as tipo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM central_v_llamados_automaticos WHERE id = 'b40a5099-0398-4d59-98b9-2ca2fa8e2eb6') 
    THEN 'b40a5099-0398-4d59-98b9-2ca2fa8e2eb6 - EXISTE EN VISTA'
    ELSE 'b40a5099-0398-4d59-98b9-2ca2fa8e2eb6 - NO EXISTE EN VISTA'
  END as resultado;
