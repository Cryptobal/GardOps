-- Script para limpiar las tablas principales antes de reimportación
-- ⚠️ ADVERTENCIA: Este script eliminará TODOS los datos de estas tablas

-- Eliminar en orden correcto (respetando foreign keys)
DELETE FROM guardias;
DELETE FROM instalaciones;
DELETE FROM clientes;

-- Verificar que las tablas estén vacías
SELECT 
  'clientes' as tabla, COUNT(*) as registros FROM clientes
UNION ALL
SELECT 
  'instalaciones' as tabla, COUNT(*) as registros FROM instalaciones  
UNION ALL
SELECT 
  'guardias' as tabla, COUNT(*) as registros FROM guardias;

-- Mensaje de confirmación
SELECT '✅ Tablas limpiadas correctamente. Listas para reimportación.' as mensaje;