-- =====================================================
-- CORRECCIÓN ESPECÍFICA: asignaciones_guardias.guardia_id
-- Fecha: 29 de Julio de 2025
-- Base de Datos: PostgreSQL (Neon)
-- Problema: guardia_id es integer pero debería ser UUID
-- =====================================================

-- ⚠️  IMPORTANTE: 
-- 1. Los guardia_id actuales (16, 114) no corresponden a guardias reales
-- 2. Necesitamos limpiar datos huérfanos y corregir la estructura
-- 3. Este script es seguro y no romperá la lógica existente

BEGIN;

-- =====================================================
-- 1. ANÁLISIS DEL PROBLEMA
-- =====================================================

DO $$
DECLARE
    orphan_count INTEGER;
    total_asignaciones INTEGER;
    valid_guardias INTEGER;
BEGIN
    -- Contar asignaciones totales
    SELECT COUNT(*) INTO total_asignaciones FROM asignaciones_guardias;
    
    -- Contar asignaciones con guardia_id huérfanos
    SELECT COUNT(*) INTO orphan_count 
    FROM asignaciones_guardias ag
    LEFT JOIN guardias g ON ag.guardia_id::text = g.id::text
    WHERE g.id IS NULL;
    
    -- Contar guardias válidos
    SELECT COUNT(*) INTO valid_guardias FROM guardias;
    
    RAISE NOTICE '🔍 ANÁLISIS DEL PROBLEMA:';
    RAISE NOTICE '   - Total asignaciones: %', total_asignaciones;
    RAISE NOTICE '   - Asignaciones con guardia_id huérfano: %', orphan_count;
    RAISE NOTICE '   - Guardias válidos en la base de datos: %', valid_guardias;
    
    IF orphan_count > 0 THEN
        RAISE NOTICE '⚠️  ADVERTENCIA: Se encontraron % asignaciones con guardia_id huérfanos', orphan_count;
        RAISE NOTICE '   - Estos registros serán eliminados para mantener integridad de datos';
    END IF;
END $$;

-- =====================================================
-- 2. LIMPIEZA DE DATOS HUÉRFANOS
-- =====================================================

-- Eliminar asignaciones con guardia_id que no corresponden a guardias reales
DELETE FROM asignaciones_guardias 
WHERE guardia_id::text NOT IN (
    SELECT id::text FROM guardias
);

DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count FROM asignaciones_guardias;
    RAISE NOTICE '🧹 LIMPIEZA COMPLETADA:';
    RAISE NOTICE '   - Asignaciones restantes después de limpieza: %', remaining_count;
END $$;

-- =====================================================
-- 3. CREAR COLUMNA TEMPORAL Y MIGRAR DATOS
-- =====================================================

-- Agregar columna temporal para la migración
ALTER TABLE asignaciones_guardias 
ADD COLUMN guardia_id_new UUID;

-- Migrar datos existentes (si los hay)
UPDATE asignaciones_guardias 
SET guardia_id_new = guardia_id::uuid 
WHERE guardia_id IS NOT NULL;

RAISE NOTICE '✅ Datos migrados a columna temporal';

-- =====================================================
-- 4. ELIMINAR COLUMNA ANTIGUA Y RENOMBRAR NUEVA
-- =====================================================

-- Eliminar la columna antigua
ALTER TABLE asignaciones_guardias 
DROP COLUMN guardia_id;

-- Renombrar la nueva columna
ALTER TABLE asignaciones_guardias 
RENAME COLUMN guardia_id_new TO guardia_id;

-- Hacer la columna NOT NULL
ALTER TABLE asignaciones_guardias 
ALTER COLUMN guardia_id SET NOT NULL;

RAISE NOTICE '✅ Columna guardia_id migrada a UUID';

-- =====================================================
-- 5. RECREAR ÍNDICES Y CONSTRAINTS
-- =====================================================

-- Eliminar índices que dependen de la columna antigua
DROP INDEX IF EXISTS idx_asignaciones_guardia_activa;
DROP INDEX IF EXISTS unique_active_assignment;

-- Recrear índices con la nueva columna UUID
CREATE INDEX idx_asignaciones_guardia_activa 
ON asignaciones_guardias (guardia_id) 
WHERE estado = 'Activa';

-- Recrear constraint de exclusión
ALTER TABLE asignaciones_guardias 
ADD CONSTRAINT unique_active_assignment 
EXCLUDE USING btree (guardia_id WITH =) 
WHERE (estado = 'Activa');

RAISE NOTICE '✅ Índices y constraints recreados';

-- =====================================================
-- 6. VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    guardia_id_type TEXT;
    final_count INTEGER;
    valid_assignments INTEGER;
BEGIN
    -- Verificar tipo de columna
    SELECT data_type INTO guardia_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'asignaciones_guardias' 
    AND column_name = 'guardia_id';
    
    -- Contar asignaciones finales
    SELECT COUNT(*) INTO final_count FROM asignaciones_guardias;
    
    -- Verificar asignaciones válidas
    SELECT COUNT(*) INTO valid_assignments
    FROM asignaciones_guardias ag
    INNER JOIN guardias g ON ag.guardia_id = g.id;
    
    RAISE NOTICE '🔍 VERIFICACIÓN FINAL:';
    RAISE NOTICE '   - Tipo de guardia_id: %', guardia_id_type;
    RAISE NOTICE '   - Total asignaciones: %', final_count;
    RAISE NOTICE '   - Asignaciones válidas: %', valid_assignments;
    
    IF guardia_id_type = 'uuid' AND final_count = valid_assignments THEN
        RAISE NOTICE '✅ MIGRACIÓN EXITOSA: Todos los datos son válidos';
    ELSE
        RAISE EXCEPTION '❌ ERROR: Problemas en la migración';
    END IF;
END $$;

COMMIT;

RAISE NOTICE '🎉 CORRECCIÓN DE asignaciones_guardias COMPLETADA EXITOSAMENTE'; 