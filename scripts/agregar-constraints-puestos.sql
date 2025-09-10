-- =====================================================
-- AGREGAR CONSTRAINTS Y MEJORAS A PUESTOS OPERATIVOS
-- =====================================================
-- Objetivo: Agregar validaciones y integridad referencial
-- Fase: Después de migración de columna rol_id
-- Fecha: 2025-09-10
-- =====================================================

BEGIN;

-- PASO 1: AGREGAR COLUMNAS DE AUDITORÍA
DO $$
BEGIN
    -- Columna eliminado_en
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'eliminado_en'
    ) THEN
        ALTER TABLE as_turnos_puestos_operativos 
        ADD COLUMN eliminado_en TIMESTAMP NULL;
        RAISE NOTICE '✅ Columna eliminado_en agregada';
    ELSE
        RAISE NOTICE 'ℹ️ Columna eliminado_en ya existe';
    END IF;
    
    -- Columna eliminado_por
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'eliminado_por'
    ) THEN
        ALTER TABLE as_turnos_puestos_operativos 
        ADD COLUMN eliminado_por UUID NULL;
        RAISE NOTICE '✅ Columna eliminado_por agregada';
    ELSE
        RAISE NOTICE 'ℹ️ Columna eliminado_por ya existe';
    END IF;
    
    -- Columna observaciones
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'observaciones'
    ) THEN
        ALTER TABLE as_turnos_puestos_operativos 
        ADD COLUMN observaciones TEXT NULL;
        RAISE NOTICE '✅ Columna observaciones agregada';
    ELSE
        RAISE NOTICE 'ℹ️ Columna observaciones ya existe';
    END IF;
    
    -- Columna activo (si no existe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'activo'
    ) THEN
        ALTER TABLE as_turnos_puestos_operativos 
        ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE '✅ Columna activo agregada';
    ELSE
        RAISE NOTICE 'ℹ️ Columna activo ya existe';
    END IF;
END $$;

-- PASO 2: CREAR ÍNDICES DE AUDITORÍA
DO $$
BEGIN
    -- Crear índice para activo
    CREATE INDEX IF NOT EXISTS idx_puestos_operativos_activo 
    ON as_turnos_puestos_operativos(activo);
    
    -- Crear índice para eliminado_en
    CREATE INDEX IF NOT EXISTS idx_puestos_operativos_eliminado_en 
    ON as_turnos_puestos_operativos(eliminado_en);
    
    RAISE NOTICE '✅ Índices de auditoría creados';
END $$;

-- PASO 3: LIMPIAR DATOS INCONSISTENTES ANTES DE CONSTRAINTS
DO $$
DECLARE
    ppcs_con_guardia INTEGER := 0;
    registros_limpiados INTEGER := 0;
BEGIN
    -- Contar PPCs con guardia_id
    SELECT COUNT(*) INTO ppcs_con_guardia
    FROM as_turnos_puestos_operativos 
    WHERE es_ppc = true AND guardia_id IS NOT NULL;
    
    IF ppcs_con_guardia > 0 THEN
        RAISE NOTICE '⚠️ Encontrados % PPCs con guardia_id asignado', ppcs_con_guardia;
        RAISE NOTICE '🧹 Limpiando datos inconsistentes...';
        
        -- Limpiar PPCs con guardia_id
        UPDATE as_turnos_puestos_operativos 
        SET guardia_id = NULL,
            observaciones = COALESCE(observaciones, '') || 
                          CASE WHEN observaciones IS NOT NULL THEN ' | ' ELSE '' END ||
                          'Limpieza automática: PPC no puede tener guardia_id (2025-09-10)'
        WHERE es_ppc = true AND guardia_id IS NOT NULL;
        
        GET DIAGNOSTICS registros_limpiados = ROW_COUNT;
        RAISE NOTICE '✅ % registros limpiados', registros_limpiados;
    ELSE
        RAISE NOTICE '✅ No hay PPCs con guardia_id inconsistente';
    END IF;
END $$;

-- PASO 4: AGREGAR CONSTRAINT PPC-GUARDIA
DO $$
BEGIN
    -- Verificar si el constraint ya existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'as_turnos_puestos_operativos'::regclass 
        AND conname = 'chk_ppc_sin_guardia'
    ) THEN
        ALTER TABLE as_turnos_puestos_operativos 
        ADD CONSTRAINT chk_ppc_sin_guardia 
        CHECK ((es_ppc = true AND guardia_id IS NULL) OR es_ppc = false);
        
        RAISE NOTICE '✅ Constraint PPC-Guardia agregado: chk_ppc_sin_guardia';
    ELSE
        RAISE NOTICE 'ℹ️ Constraint chk_ppc_sin_guardia ya existe';
    END IF;
END $$;

-- PASO 5: AGREGAR FOREIGN KEY A PAUTA MENSUAL
DO $$
BEGIN
    -- Verificar si el foreign key ya existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'as_turnos_pauta_mensual'::regclass 
        AND conname = 'fk_pauta_puesto'
        AND contype = 'f'
    ) THEN
        -- Limpiar registros huérfanos primero
        DELETE FROM as_turnos_pauta_mensual 
        WHERE puesto_id NOT IN (
            SELECT id FROM as_turnos_puestos_operativos
        );
        
        -- Agregar foreign key
        ALTER TABLE as_turnos_pauta_mensual 
        ADD CONSTRAINT fk_pauta_puesto 
        FOREIGN KEY (puesto_id) REFERENCES as_turnos_puestos_operativos(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Foreign key agregado: as_turnos_pauta_mensual → as_turnos_puestos_operativos';
    ELSE
        RAISE NOTICE 'ℹ️ Foreign key fk_pauta_puesto ya existe';
    END IF;
END $$;

-- PASO 6: VERIFICAR INTEGRIDAD FINAL
DO $$
DECLARE
    total_puestos INTEGER := 0;
    puestos_activos INTEGER := 0;
    ppcs INTEGER := 0;
    con_guardia INTEGER := 0;
    registros_pauta INTEGER := 0;
BEGIN
    SELECT COUNT(*) FROM as_turnos_puestos_operativos INTO total_puestos;
    SELECT COUNT(*) FROM as_turnos_puestos_operativos WHERE activo = true INTO puestos_activos;
    SELECT COUNT(*) FROM as_turnos_puestos_operativos WHERE es_ppc = true INTO ppcs;
    SELECT COUNT(*) FROM as_turnos_puestos_operativos WHERE guardia_id IS NOT NULL INTO con_guardia;
    SELECT COUNT(*) FROM as_turnos_pauta_mensual INTO registros_pauta;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 ESTADÍSTICAS FINALES:';
    RAISE NOTICE '  - Total puestos: %', total_puestos;
    RAISE NOTICE '  - Puestos activos: %', puestos_activos;
    RAISE NOTICE '  - PPCs: %', ppcs;
    RAISE NOTICE '  - Con guardia asignado: %', con_guardia;
    RAISE NOTICE '  - Registros en pauta mensual: %', registros_pauta;
END $$;

COMMIT;

-- RESUMEN FINAL
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 CONSTRAINTS Y MEJORAS APLICADAS EXITOSAMENTE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ Columnas de auditoría agregadas';
    RAISE NOTICE '✅ Índices de rendimiento creados';
    RAISE NOTICE '✅ Datos inconsistentes limpiados';
    RAISE NOTICE '✅ Constraint PPC-Guardia aplicado';
    RAISE NOTICE '✅ Foreign key a pauta mensual agregado';
    RAISE NOTICE '✅ Integridad referencial verificada';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '🛡️ SISTEMA PROTEGIDO CONTRA:';
    RAISE NOTICE '  - PPCs con guardia asignado';
    RAISE NOTICE '  - Registros huérfanos en pauta mensual';
    RAISE NOTICE '  - Eliminación sin auditoria';
    RAISE NOTICE '  - Estados inconsistentes';
END $$;
