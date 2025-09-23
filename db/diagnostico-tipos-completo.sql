-- =====================================================
-- DIAGNÓSTICO COMPLETO DE TIPOS DE DATOS
-- =====================================================

-- 1. Verificar todos los tipos de datos en central_llamados
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'central_llamados'
ORDER BY ordinal_position;

-- 2. Verificar todos los tipos de datos en instalaciones
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'instalaciones'
ORDER BY ordinal_position;

-- 3. Verificar si hay datos en central_llamados
SELECT 
  COUNT(*) as total_registros
FROM central_llamados;

-- 4. Verificar si hay datos en instalaciones
SELECT 
  COUNT(*) as total_registros
FROM instalaciones;

-- 5. Verificar si hay datos en as_turnos_pauta_mensual
SELECT 
  COUNT(*) as total_registros
FROM as_turnos_pauta_mensual
WHERE tipo_turno = 'planificado';

-- 6. Verificar si hay datos en central_config_instalacion
SELECT 
  COUNT(*) as total_registros
FROM central_config_instalacion
WHERE habilitado = true;

