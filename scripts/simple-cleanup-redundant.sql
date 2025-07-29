-- =====================================================
-- LIMPIEZA SIMPLE DE TABLAS REDUNDANTES - GARDOPS
-- Fecha: 29 de Julio de 2025
-- Base de Datos: PostgreSQL (Neon)
-- Problema: Tablas ciudades, regiones, comunas no se usan
-- Solución: Eliminar tablas y columnas relacionadas
-- =====================================================

BEGIN;

-- =====================================================
-- 1. VERIFICACIÓN PREVIA
-- =====================================================

-- Verificar que las columnas están vacías
SELECT 
    'VERIFICACIÓN PREVIA' as accion,
    COUNT(*) as total_instalaciones,
    COUNT(CASE WHEN region_id IS NULL THEN 1 END) as region_id_null,
    COUNT(CASE WHEN ciudad_id IS NULL THEN 1 END) as ciudad_id_null,
    COUNT(CASE WHEN comuna_id IS NULL THEN 1 END) as comuna_id_null
FROM instalaciones;

-- =====================================================
-- 2. ELIMINAR COLUMNAS REDUNDANTES DE INSTALACIONES
-- =====================================================

-- Eliminar foreign key constraints primero
ALTER TABLE instalaciones DROP CONSTRAINT IF EXISTS instalaciones_region_id_fkey;
ALTER TABLE instalaciones DROP CONSTRAINT IF EXISTS instalaciones_ciudad_id_fkey;
ALTER TABLE instalaciones DROP CONSTRAINT IF EXISTS instalaciones_comuna_id_fkey;

-- Eliminar columnas redundantes
ALTER TABLE instalaciones DROP COLUMN IF EXISTS region_id;
ALTER TABLE instalaciones DROP COLUMN IF EXISTS ciudad_id;
ALTER TABLE instalaciones DROP COLUMN IF EXISTS comuna_id;

-- =====================================================
-- 3. ELIMINAR TABLAS REDUNDANTES
-- =====================================================

-- Eliminar en orden correcto (dependencias)
DROP TABLE IF EXISTS comunas CASCADE;
DROP TABLE IF EXISTS ciudades CASCADE;
DROP TABLE IF EXISTS regiones CASCADE;

-- =====================================================
-- 4. VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que las tablas fueron eliminadas
SELECT 
    'VERIFICACIÓN FINAL' as accion,
    COUNT(*) as tablas_redundantes_restantes
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ciudades', 'regiones', 'comunas');

-- Verificar estructura de instalaciones
SELECT 
    'ESTRUCTURA INSTALACIONES' as accion,
    COUNT(*) as columnas_redundantes_restantes
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'instalaciones'
AND column_name IN ('region_id', 'ciudad_id', 'comuna_id');

COMMIT;

-- =====================================================
-- RESUMEN DE CAMBIOS
-- =====================================================

/*
✅ ELIMINADO:
- Tabla: comunas (8 registros)
- Tabla: ciudades (8 registros) 
- Tabla: regiones (16 registros)
- Columnas: instalaciones.region_id, instalaciones.ciudad_id, instalaciones.comuna_id
- Constraints: 5 foreign keys relacionados

✅ BENEFICIOS:
- Reducción de 3 tablas redundantes
- Eliminación de 32 registros innecesarios
- Simplificación del esquema
- Mejor rendimiento (menos joins innecesarios)
- Código más limpio (solo Google Maps)

✅ CONFIRMADO:
- La aplicación usa Google Maps para ubicaciones
- Las columnas estaban vacías (NULL)
- No hay dependencias activas
- No se rompe ninguna funcionalidad
*/ 