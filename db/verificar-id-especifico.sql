-- =====================================================
-- VERIFICAR ID ESPECÍFICO DEL FRONTEND
-- =====================================================

-- 1. Verificar si el ID existe en la vista
SELECT 
  'ID DEL FRONTEND EN VISTA:' as tipo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM central_v_llamados_automaticos WHERE id = '6a45acce-309d-4cfe-b2a4-02d34c97042c') 
    THEN '6a45acce-309d-4cfe-b2a4-02d34c97042c - EXISTE EN VISTA'
    ELSE '6a45acce-309d-4cfe-b2a4-02d34c97042c - NO EXISTE EN VISTA'
  END as resultado;

-- 2. Verificar si el ID existe en la tabla central_llamados
SELECT 
  'ID DEL FRONTEND EN TABLA:' as tipo,
  CASE 
    WHEN EXISTS (SELECT 1 FROM central_llamados WHERE id = '6a45acce-309d-4cfe-b2a4-02d34c97042c') 
    THEN '6a45acce-309d-4cfe-b2a4-02d34c97042c - EXISTE EN TABLA'
    ELSE '6a45acce-309d-4cfe-b2a4-02d34c97042c - NO EXISTE EN TABLA'
  END as resultado;

-- 3. Mostrar todos los IDs actuales en la vista para hoy
SELECT 
  'IDs ACTUALES EN VISTA:' as tipo,
  id,
  instalacion_nombre,
  DATE_PART('hour', programado_para AT TIME ZONE 'America/Santiago') as hora,
  estado_llamado
FROM central_v_llamados_automaticos 
WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16'
ORDER BY programado_para ASC
LIMIT 5;

-- 4. Mostrar todos los IDs actuales en la tabla para hoy
SELECT 
  'IDs ACTUALES EN TABLA:' as tipo,
  id,
  instalacion_id,
  DATE_PART('hour', programado_para AT TIME ZONE 'America/Santiago') as hora,
  estado
FROM central_llamados 
WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16'
ORDER BY programado_para ASC
LIMIT 5;

