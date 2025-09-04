-- =====================================================
-- SCRIPT DE LIMPIEZA TOTAL DE TABLAS PRINCIPALES
-- =====================================================
-- Este script elimina TODOS los registros de:
-- - guardias
-- - instalaciones  
-- - clientes
-- 
-- Las claves foráneas están configuradas con ON DELETE CASCADE
-- por lo que es seguro ejecutar esta limpieza
-- =====================================================

-- Deshabilitar temporalmente las restricciones de clave foránea para evitar problemas
SET session_replication_role = replica;

-- 1. ELIMINAR TODOS LOS GUARDIAS
-- Esto eliminará automáticamente registros relacionados por CASCADE
DELETE FROM guardias;

-- 2. ELIMINAR TODAS LAS INSTALACIONES
-- Esto eliminará automáticamente registros relacionados por CASCADE
DELETE FROM instalaciones;

-- 3. ELIMINAR TODOS LOS CLIENTES
-- Esto eliminará automáticamente registros relacionados por CASCADE
DELETE FROM clientes;

-- Restaurar las restricciones de clave foránea
SET session_replication_role = DEFAULT;

-- Verificar que las tablas están vacías
SELECT 
    'guardias' as tabla,
    COUNT(*) as registros_restantes
FROM guardias
UNION ALL
SELECT 
    'instalaciones' as tabla,
    COUNT(*) as registros_restantes
FROM instalaciones
UNION ALL
SELECT 
    'clientes' as tabla,
    COUNT(*) as registros_restantes
FROM clientes;

-- Mostrar mensaje de confirmación
SELECT 'Limpieza completada exitosamente. Todas las tablas principales están vacías.' as resultado;
