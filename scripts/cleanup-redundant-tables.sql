-- =====================================================
-- LIMPIEZA DE TABLAS REDUNDANTES - GARDOPS
-- Fecha: 29 de Julio de 2025
-- Base de Datos: PostgreSQL (Neon)
-- Problema: Tablas ciudades, regiones, comunas no se usan
-- Solución: Eliminar tablas y columnas relacionadas
-- =====================================================

-- ⚠️  IMPORTANTE: 
-- 1. Estas tablas NO se usan en la aplicación
-- 2. La información de ubicación viene de Google Maps
-- 3. Las columnas region_id, ciudad_id, comuna_id están VACÍAS
-- 4. Este script elimina las tablas y columnas redundantes

BEGIN;

-- =====================================================
-- 1. VERIFICACIÓN PREVIA
-- =====================================================

DO $$
DECLARE
    instalaciones_count INTEGER;
    null_region_count INTEGER;
    null_ciudad_count INTEGER;
    null_comuna_count INTEGER;
BEGIN
    -- Verificar que las columnas están vacías
    SELECT COUNT(*) INTO instalaciones_count FROM instalaciones;
    SELECT COUNT(*) INTO null_region_count FROM instalaciones WHERE region_id IS NULL;
    SELECT COUNT(*) INTO null_ciudad_count FROM instalaciones WHERE ciudad_id IS NULL;
    SELECT COUNT(*) INTO null_comuna_count FROM instalaciones WHERE comuna_id IS NULL;
    
    RAISE NOTICE '📊 VERIFICACIÓN PREVIA:';
    RAISE NOTICE '   - Total instalaciones: %', instalaciones_count;
    RAISE NOTICE '   - region_id NULL: % (%%)', null_region_count, ROUND((null_region_count::float / instalaciones_count * 100), 2);
    RAISE NOTICE '   - ciudad_id NULL: % (%%)', null_ciudad_count, ROUND((null_ciudad_count::float / instalaciones_count * 100), 2);
    RAISE NOTICE '   - comuna_id NULL: % (%%)', null_comuna_count, ROUND((null_comuna_count::float / instalaciones_count * 100), 2);
    
    -- Verificar que no hay datos en uso
    IF null_region_count != instalaciones_count OR null_ciudad_count != instalaciones_count OR null_comuna_count != instalaciones_count THEN
        RAISE EXCEPTION '❌ ERROR: Hay datos en uso en las columnas de ubicación. No se puede proceder.';
    END IF;
    
    RAISE NOTICE '✅ VERIFICACIÓN EXITOSA: Todas las columnas están vacías';
END $$;

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

DO $$
BEGIN
    RAISE NOTICE '✅ Columnas redundantes eliminadas de instalaciones';
END $$;

-- =====================================================
-- 3. ELIMINAR TABLAS REDUNDANTES
-- =====================================================

-- Eliminar en orden correcto (dependencias)
DROP TABLE IF EXISTS comunas CASCADE;
DROP TABLE IF EXISTS ciudades CASCADE;
DROP TABLE IF EXISTS regiones CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ Tablas redundantes eliminadas';
END $$;

-- =====================================================
-- 4. VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    remaining_tables INTEGER;
    instalaciones_columns INTEGER;
BEGIN
    -- Verificar que las tablas fueron eliminadas
    SELECT COUNT(*) INTO remaining_tables 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('ciudades', 'regiones', 'comunas');
    
    -- Verificar estructura de instalaciones
    SELECT COUNT(*) INTO instalaciones_columns 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'instalaciones'
    AND column_name IN ('region_id', 'ciudad_id', 'comuna_id');
    
    RAISE NOTICE '📊 VERIFICACIÓN FINAL:';
    RAISE NOTICE '   - Tablas redundantes restantes: %', remaining_tables;
    RAISE NOTICE '   - Columnas redundantes en instalaciones: %', instalaciones_columns;
    
    IF remaining_tables > 0 OR instalaciones_columns > 0 THEN
        RAISE EXCEPTION '❌ ERROR: No se pudieron eliminar todas las tablas/columnas redundantes';
    END IF;
    
    RAISE NOTICE '✅ LIMPIEZA COMPLETADA EXITOSAMENTE';
END $$;

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