-- =====================================================
-- DIAGNÓSTICO DE TIPOS DE DATOS
-- =====================================================

-- 1. Verificar el tipo de dato de la columna id en central_llamados
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'central_llamados' 
  AND column_name = 'id';

-- 2. Verificar si hay datos en central_llamados
SELECT 
  COUNT(*) as total_registros,
  MIN(id) as id_minimo,
  MAX(id) as id_maximo
FROM central_llamados;

-- 3. Verificar el tipo de dato de la columna id en instalaciones
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'instalaciones' 
  AND column_name = 'id';

-- 4. Verificar si hay datos en instalaciones
SELECT 
  COUNT(*) as total_registros,
  MIN(id) as id_minimo,
  MAX(id) as id_maximo
FROM instalaciones;

