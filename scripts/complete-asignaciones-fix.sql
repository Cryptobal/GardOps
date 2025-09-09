-- =====================================================
-- COMPLETAR CORRECCIÓN: asignaciones_guardias.guardia_id
-- Fecha: 29 de Julio de 2025
-- Base de Datos: PostgreSQL (Neon)
-- Estado: Datos corruptos ya eliminados, solo cambiar tipo
-- =====================================================

BEGIN;

-- =====================================================
-- 1. VERIFICAR ESTADO ACTUAL
-- =====================================================

DO $$
DECLARE
    current_count INTEGER;
    guardia_id_type TEXT;
BEGIN
    SELECT COUNT(*) INTO current_count FROM asignaciones_guardias;
    
    SELECT data_type INTO guardia_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'asignaciones_guardias' 
    AND column_name = 'guardia_id';
    
    RAISE NOTICE '📊 ESTADO ACTUAL:';
    RAISE NOTICE '   - Asignaciones en la tabla: %', current_count;
    RAISE NOTICE '   - Tipo de guardia_id: %', guardia_id_type;
    
    IF current_count = 0 THEN
        RAISE NOTICE '✅ Tabla limpia - procediendo con cambio de tipo';
    ELSE
        RAISE NOTICE '⚠️  Aún hay datos - verificando...';
    END IF;
END $$;

-- =====================================================
-- 2. CAMBIAR TIPO DE COLUMNA A UUID
-- =====================================================

-- Como la tabla está vacía, podemos cambiar el tipo directamente
ALTER TABLE asignaciones_guardias 
ALTER COLUMN guardia_id TYPE UUID USING guardia_id::uuid;

RAISE NOTICE '✅ Tipo de guardia_id cambiado a UUID';

-- =====================================================
-- 3. VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    final_type TEXT;
BEGIN
    SELECT data_type INTO final_type 
    FROM information_schema.columns 
    WHERE table_name = 'asignaciones_guardias' 
    AND column_name = 'guardia_id';
    
    RAISE NOTICE '🔍 VERIFICACIÓN FINAL:';
    RAISE NOTICE '   - Tipo final de guardia_id: %', final_type;
    
    IF final_type = 'uuid' THEN
        RAISE NOTICE '✅ CORRECCIÓN COMPLETADA EXITOSAMENTE';
    ELSE
        RAISE EXCEPTION '❌ ERROR: El tipo no se cambió correctamente';
    END IF;
END $$;

COMMIT;

RAISE NOTICE '🎉 asignaciones_guardias.guardia_id ahora es UUID'; 