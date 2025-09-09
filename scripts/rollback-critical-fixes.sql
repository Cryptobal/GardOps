-- =====================================================
-- SCRIPT DE ROLLBACK - CORRECCIONES CRÍTICAS GARDOPS
-- Fecha: 29 de Julio de 2025
-- Base de Datos: PostgreSQL (Neon)
-- =====================================================

-- ⚠️  IMPORTANTE: 
-- 1. SOLO ejecutar si es necesario revertir los cambios
-- 2. Este script puede causar pérdida de datos
-- 3. Hacer backup antes de ejecutar

BEGIN;

-- =====================================================
-- 1. VERIFICACIÓN PREVIA DE ROLLBACK
-- =====================================================

-- Verificar el estado actual antes del rollback
DO $$
DECLARE
    guardia_id_type TEXT;
    index_count INTEGER;
    timestamp_count INTEGER;
BEGIN
    -- Verificar tipo de guardia_id
    SELECT data_type INTO guardia_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'asignaciones_guardias' 
        AND column_name = 'guardia_id';
    
    RAISE NOTICE 'Estado actual de guardia_id: %', guardia_id_type;
    
    -- Contar índices creados
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE indexname LIKE 'idx_%' 
        AND tablename IN ('guardias', 'clientes', 'usuarios', 'instalaciones', 'documentos_clientes', 'pautas_diarias');
    
    RAISE NOTICE 'Índices que serán eliminados: %', index_count;
    
    -- Contar timestamps normalizados
    SELECT COUNT(*) INTO timestamp_count
    FROM information_schema.columns 
    WHERE table_schema = 'public'
        AND column_name IN ('created_at', 'updated_at')
        AND table_name IN ('tipos_documentos', 'planillas', 'pautas_diarias', 'pautas_mensuales');
    
    RAISE NOTICE 'Timestamps normalizados que serán revertidos: %', timestamp_count;
    
    RAISE NOTICE '⚠️  ADVERTENCIA: Este rollback puede causar pérdida de datos!';
END $$;

-- =====================================================
-- 2. ROLLBACK DE ÍNDICES CREADOS
-- =====================================================

-- Eliminar índices creados por el script de correcciones
DO $$
DECLARE
    index_record RECORD;
BEGIN
    FOR index_record IN 
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE indexname LIKE 'idx_%' 
            AND tablename IN (
                'guardias', 'clientes', 'usuarios', 'instalaciones', 
                'documentos_clientes', 'pautas_diarias'
            )
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', index_record.indexname);
        RAISE NOTICE '✅ Índice eliminado: %', index_record.indexname;
    END LOOP;
END $$;

-- =====================================================
-- 3. ROLLBACK DE NORMALIZACIÓN DE TIMESTAMPS
-- =====================================================

-- Función para revertir timestamps en una tabla
CREATE OR REPLACE FUNCTION revert_timestamps(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Revertir updated_at → modificado_en
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = revert_timestamps.table_name 
            AND column_name = 'updated_at'
    ) THEN
        EXECUTE format('ALTER TABLE %I RENAME COLUMN updated_at TO modificado_en', table_name);
        RAISE NOTICE '✅ %: updated_at → modificado_en', table_name;
    END IF;
    
    -- Revertir created_at → creado_en
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = revert_timestamps.table_name 
            AND column_name = 'created_at'
    ) THEN
        EXECUTE format('ALTER TABLE %I RENAME COLUMN created_at TO creado_en', table_name);
        RAISE NOTICE '✅ %: created_at → creado_en', table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar reversión a todas las tablas afectadas
SELECT revert_timestamps(table_name) 
FROM (
    VALUES 
        ('tipos_documentos'),
        ('planillas'),
        ('pautas_diarias'),
        ('pautas_mensuales'),
        ('turnos_extras'),
        ('documentos'),
        ('rondas'),
        ('usuarios_permisos'),
        ('planillas_pago')
) AS tables(table_name);

-- Limpiar función temporal
DROP FUNCTION revert_timestamps(TEXT);

-- =====================================================
-- 4. ROLLBACK DE TIPO DE DATOS (PELIGROSO)
-- =====================================================

-- ⚠️  ADVERTENCIA: Esta sección puede causar pérdida de datos
-- Solo ejecutar si es absolutamente necesario

DO $$
DECLARE
    current_type TEXT;
BEGIN
    -- Verificar el tipo actual
    SELECT data_type INTO current_type 
    FROM information_schema.columns 
    WHERE table_name = 'asignaciones_guardias' 
        AND column_name = 'guardia_id';
    
    IF current_type = 'uuid' THEN
        RAISE NOTICE '🔄 Revertiendo tipo de datos de UUID a integer...';
        RAISE NOTICE '⚠️  ADVERTENCIA: Esto puede causar pérdida de datos!';
        
        -- Verificar si hay datos que se perderían
        IF EXISTS (
            SELECT 1 FROM asignaciones_guardias 
            WHERE guardia_id IS NOT NULL
        ) THEN
            RAISE NOTICE '❌ NO SE PUEDE REVERTIR: Hay datos en la tabla que se perderían';
            RAISE NOTICE '💡 Recomendación: Hacer backup de los datos antes de continuar';
        ELSE
            -- Solo revertir si no hay datos
            ALTER TABLE asignaciones_guardias 
            ALTER COLUMN guardia_id TYPE integer USING guardia_id::text::integer;
            
            RAISE NOTICE '✅ Tipo de datos revertido exitosamente';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  El tipo de datos ya es integer o no existe';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error al revertir tipo de datos: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- 5. RESTAURAR CAMPOS LEGACY (SI ES NECESARIO)
-- =====================================================

-- Agregar campo legacy_id de vuelta si fue eliminado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guardias' 
            AND column_name = 'legacy_id'
    ) THEN
        ALTER TABLE guardias ADD COLUMN legacy_id integer;
        RAISE NOTICE '✅ Campo legacy_id restaurado en guardias';
    ELSE
        RAISE NOTICE 'ℹ️  Campo legacy_id ya existe en guardias';
    END IF;
END $$;

-- =====================================================
-- 6. LIMPIEZA DE DATOS DE PRUEBA
-- =====================================================

-- Eliminar documento de prueba si fue insertado
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM documentos_instalacion 
        WHERE nombre LIKE '%Documento de prueba%'
    ) THEN
        DELETE FROM documentos_instalacion 
        WHERE nombre LIKE '%Documento de prueba%';
        
        RAISE NOTICE '✅ Documentos de prueba eliminados';
    ELSE
        RAISE NOTICE 'ℹ️  No se encontraron documentos de prueba';
    END IF;
END $$;

-- =====================================================
-- 7. VERIFICACIÓN POST-ROLLBACK
-- =====================================================

-- Verificar que los cambios se revirtieron correctamente
DO $$
DECLARE
    guardia_id_type TEXT;
    index_count INTEGER;
    timestamp_count INTEGER;
BEGIN
    -- Verificar tipo de guardia_id
    SELECT data_type INTO guardia_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'asignaciones_guardias' 
        AND column_name = 'guardia_id';
    
    RAISE NOTICE 'Tipo final de guardia_id: %', guardia_id_type;
    
    -- Contar índices restantes
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE indexname LIKE 'idx_%' 
        AND tablename IN ('guardias', 'clientes', 'usuarios', 'instalaciones', 'documentos_clientes', 'pautas_diarias');
    
    RAISE NOTICE 'Índices restantes: %', index_count;
    
    -- Contar timestamps revertidos
    SELECT COUNT(*) INTO timestamp_count
    FROM information_schema.columns 
    WHERE table_schema = 'public'
        AND column_name IN ('creado_en', 'modificado_en')
        AND table_name IN ('tipos_documentos', 'planillas', 'pautas_diarias', 'pautas_mensuales');
    
    RAISE NOTICE 'Timestamps revertidos: %', timestamp_count;
END $$;

-- =====================================================
-- 8. RESUMEN DE ROLLBACK
-- =====================================================

SELECT 
    'RESUMEN DE ROLLBACK' as seccion,
    'Cambios revertidos exitosamente' as estado

UNION ALL

SELECT 
    'Tipo de datos revertido',
    COUNT(*)::text
FROM information_schema.columns 
WHERE table_name = 'asignaciones_guardias' 
    AND column_name = 'guardia_id' 
    AND data_type = 'integer'

UNION ALL

SELECT 
    'Índices eliminados',
    (SELECT COUNT(*) FROM pg_indexes 
     WHERE indexname LIKE 'idx_%' 
         AND tablename IN ('guardias', 'clientes', 'usuarios', 'instalaciones', 'documentos_clientes', 'pautas_diarias')
    )::text

UNION ALL

SELECT 
    'Timestamps revertidos',
    COUNT(*)::text
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND column_name IN ('creado_en', 'modificado_en')
    AND table_name IN ('tipos_documentos', 'planillas', 'pautas_diarias', 'pautas_mensuales');

-- =====================================================
-- 9. RECOMENDACIONES POST-ROLLBACK
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'ROLLBACK COMPLETADO';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ Los cambios han sido revertidos';
    RAISE NOTICE '📊 La base de datos está en su estado anterior';
    RAISE NOTICE '💡 Considerar:';
    RAISE NOTICE '   - Revisar por qué fue necesario el rollback';
    RAISE NOTICE '   - Identificar y corregir problemas antes de reintentar';
    RAISE NOTICE '   - Hacer backup antes de futuras correcciones';
    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- FIN DE ROLLBACK
-- =====================================================

COMMIT;

RAISE NOTICE '🔄 Rollback completado exitosamente!';
RAISE NOTICE '📊 Revisar el resumen anterior para verificar los cambios revertidos.'; 