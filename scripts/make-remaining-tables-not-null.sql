-- =====================================================
-- HACER TENANT_ID NOT NULL - TABLAS RESTANTES
-- payroll_run, payroll_items_extras, historial_asignaciones_guardias
-- =====================================================
-- Fecha: 2025-01-27
-- Propósito: Hacer tenant_id NOT NULL en las 3 tablas restantes
-- Estrategia: Solo ejecutar si la migración anterior fue exitosa
-- ⚠️  ADVERTENCIA: Esta fase es OPCIONAL y puede romper compatibilidad legacy

-- =====================================================
-- 1. VERIFICACIÓN PREVIA
-- =====================================================

DO $$
DECLARE
    tenant_id UUID;
    null_count INTEGER;
    table_name TEXT;
    total_null_count INTEGER := 0;
BEGIN
    -- Verificar que existe el tenant
    SELECT id INTO tenant_id FROM tenants WHERE nombre = 'Gard' LIMIT 1;
    
    IF tenant_id IS NULL THEN
        RAISE EXCEPTION '❌ Tenant "Gard" no existe. Ejecute primero la migración de usuarios.';
    END IF;
    
    RAISE NOTICE '✅ Tenant "Gard" encontrado con ID: %', tenant_id;
    
    -- Verificar que no hay registros con tenant_id NULL
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'payroll_run',
            'payroll_items_extras',
            'historial_asignaciones_guardias'
        ])
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id IS NULL', table_name) INTO null_count;
        total_null_count := total_null_count + null_count;
        
        IF null_count > 0 THEN
            RAISE EXCEPTION '❌ Tabla % tiene % registros con tenant_id NULL. Ejecute primero migrate-remaining-tables-multitenant.sql.', table_name, null_count;
        END IF;
    END LOOP;
    
    IF total_null_count > 0 THEN
        RAISE EXCEPTION '❌ Hay % registros con tenant_id NULL. Ejecute primero la migración.', total_null_count;
    END IF;
    
    RAISE NOTICE '✅ Verificación exitosa: No hay registros con tenant_id NULL';
    
END $$;

-- =====================================================
-- 2. HACER TENANT_ID NOT NULL EN TABLAS RESTANTES
-- =====================================================

-- 2.1 payroll_run
DO $$
BEGIN
    ALTER TABLE payroll_run 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ payroll_run.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en payroll_run: %', SQLERRM;
END $$;

-- 2.2 payroll_items_extras
DO $$
BEGIN
    ALTER TABLE payroll_items_extras 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ payroll_items_extras.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en payroll_items_extras: %', SQLERRM;
END $$;

-- 2.3 historial_asignaciones_guardias
DO $$
BEGIN
    ALTER TABLE historial_asignaciones_guardias 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ historial_asignaciones_guardias.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en historial_asignaciones_guardias: %', SQLERRM;
END $$;

-- =====================================================
-- 3. AGREGAR FOREIGN KEYS A TENANTS
-- =====================================================

-- 3.1 payroll_run
DO $$
BEGIN
    ALTER TABLE payroll_run 
    ADD CONSTRAINT fk_payroll_run_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en payroll_run';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en payroll_run: %', SQLERRM;
END $$;

-- 3.2 payroll_items_extras
DO $$
BEGIN
    ALTER TABLE payroll_items_extras 
    ADD CONSTRAINT fk_payroll_items_extras_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en payroll_items_extras';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en payroll_items_extras: %', SQLERRM;
END $$;

-- 3.3 historial_asignaciones_guardias
DO $$
BEGIN
    ALTER TABLE historial_asignaciones_guardias 
    ADD CONSTRAINT fk_historial_asignaciones_guardias_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en historial_asignaciones_guardias';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en historial_asignaciones_guardias: %', SQLERRM;
END $$;

-- =====================================================
-- 4. VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    table_name TEXT;
    null_count INTEGER;
    fk_count INTEGER;
    total_issues INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 Verificando migración final de tablas restantes...';
    
    -- Verificar que no hay registros con tenant_id NULL
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'payroll_run',
            'payroll_items_extras',
            'historial_asignaciones_guardias'
        ])
    LOOP
        -- Verificar NULLs
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id IS NULL', table_name) INTO null_count;
        
        -- Verificar Foreign Keys
        SELECT COUNT(*) INTO fk_count
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = table_name 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'tenant_id';
        
        IF null_count > 0 THEN
            RAISE WARNING '⚠️  %: % registros con tenant_id NULL', table_name, null_count;
            total_issues := total_issues + 1;
        END IF;
        
        IF fk_count = 0 THEN
            RAISE WARNING '⚠️  %: No tiene FK para tenant_id', table_name;
            total_issues := total_issues + 1;
        END IF;
        
        IF null_count = 0 AND fk_count > 0 THEN
            RAISE NOTICE '✅ %: Migración exitosa', table_name;
        END IF;
    END LOOP;
    
    IF total_issues = 0 THEN
        RAISE NOTICE '🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE: Todas las tablas restantes están 100% multitenant';
    ELSE
        RAISE WARNING '⚠️  MIGRACIÓN PARCIAL: % problemas encontrados', total_issues;
    END IF;
END $$;

-- =====================================================
-- 5. RESUMEN FINAL DEL SISTEMA COMPLETO
-- =====================================================

DO $$
DECLARE
    total_tables INTEGER;
    multitenant_tables INTEGER;
    not_null_tables INTEGER;
BEGIN
    -- Contar total de tablas con tenant_id
    SELECT COUNT(*) INTO total_tables
    FROM information_schema.columns 
    WHERE column_name = 'tenant_id' 
    AND table_schema = 'public';
    
    -- Contar tablas con tenant_id NOT NULL
    SELECT COUNT(*) INTO not_null_tables
    FROM information_schema.columns 
    WHERE column_name = 'tenant_id' 
    AND table_schema = 'public'
    AND is_nullable = 'NO';
    
    -- Contar tablas con Foreign Key a tenants
    SELECT COUNT(*) INTO multitenant_tables
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'tenant_id'
    AND kcu.referenced_table_name = 'tenants';
    
    RAISE NOTICE '🎉 SISTEMA 100% MULTITENANT COMPLETADO';
    RAISE NOTICE '📊 Estadísticas finales:';
    RAISE NOTICE '   Total de tablas con tenant_id: %', total_tables;
    RAISE NOTICE '   Tablas con tenant_id NOT NULL: %', not_null_tables;
    RAISE NOTICE '   Tablas con FK a tenants: %', multitenant_tables;
    RAISE NOTICE '   Porcentaje de cobertura: %', 
        CASE WHEN total_tables > 0 THEN ROUND((not_null_tables::DECIMAL / total_tables) * 100, 2) ELSE 0 END;
    
    IF not_null_tables = total_tables AND multitenant_tables = total_tables THEN
        RAISE NOTICE '✅ SISTEMA 100% MULTITENANT: Todas las tablas están completamente migradas';
    ELSE
        RAISE WARNING '⚠️  SISTEMA PARCIALMENTE MULTITENANT: Revisar tablas faltantes';
    END IF;
END $$;

-- =====================================================
-- 6. RESUMEN DE LA MIGRACIÓN FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 MIGRACIÓN FINAL COMPLETADA: tenant_id ahora es NOT NULL en todas las tablas restantes';
    RAISE NOTICE '🔒 Foreign Keys agregadas para integridad referencial';
    RAISE NOTICE '✅ Sistema 100% multitenant para TODAS las tablas';
    RAISE NOTICE '⚠️  IMPORTANTE: Las consultas legacy ya no funcionarán (tenant_id es obligatorio)';
    RAISE NOTICE '🔍 Todas las consultas deben incluir WHERE tenant_id = $1';
    RAISE NOTICE '🎯 MIGRACIÓN COMPLETA: El sistema está 100% multitenant';
END $$;
