-- =====================================================
-- MIGRACIÓN COMPLETA A MULTITENANT - TABLAS RESTANTES
-- payroll_run, payroll_items_extras, historial_asignaciones_guardias
-- =====================================================
-- Fecha: 2025-01-27
-- Propósito: Completar migración de las 3 tablas restantes a 100% multitenant
-- Estrategia: Gradual, sin romper funcionalidad existente

-- =====================================================
-- 1. VERIFICAR Y OBTENER TENANT ID
-- =====================================================

DO $$
DECLARE
    tenant_id UUID;
    table_exists BOOLEAN;
BEGIN
    -- Verificar si existe la tabla tenants
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'tenants'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE EXCEPTION '❌ Tabla tenants no existe. Ejecute primero la migración de usuarios.';
    END IF;
    
    -- Obtener el tenant 'Gard'
    SELECT id INTO tenant_id FROM tenants WHERE nombre = 'Gard' LIMIT 1;
    
    IF tenant_id IS NULL THEN
        -- Crear tenant 'Gard' si no existe
        INSERT INTO tenants (nombre, activo) VALUES ('Gard', true) RETURNING id INTO tenant_id;
        RAISE NOTICE '✅ Tenant "Gard" creado con ID: %', tenant_id;
    ELSE
        RAISE NOTICE '✅ Tenant "Gard" encontrado con ID: %', tenant_id;
    END IF;
    
    -- Guardar tenant_id en una variable de sesión para uso posterior
    PERFORM set_config('app.tenant_id', tenant_id::text, false);
    
END $$;

-- =====================================================
-- 2. MIGRAR TABLA: payroll_run
-- =====================================================

DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    -- Verificar si la columna tenant_id ya existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payroll_run' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        -- Agregar columna tenant_id
        ALTER TABLE payroll_run 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a payroll_run';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en payroll_run';
    END IF;
    
    -- Actualizar registros existentes con tenant_id
    UPDATE payroll_run 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL OR tenant_id = 'accebf8a-bacc-41fa-9601-ed39cb320a52'::UUID;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en payroll_run', updated_count;
    
    -- Crear índice para performance
    CREATE INDEX IF NOT EXISTS idx_payroll_run_tenant 
    ON payroll_run(tenant_id);
    
    -- Crear índice compuesto para consultas frecuentes
    CREATE INDEX IF NOT EXISTS idx_payroll_run_tenant_instalacion_mes_anio 
    ON payroll_run(tenant_id, instalacion_id, mes, anio);
    
    RAISE NOTICE '✅ Índices creados para payroll_run';
END $$;

-- =====================================================
-- 3. MIGRAR TABLA: payroll_items_extras
-- =====================================================

DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    -- Verificar si la columna tenant_id ya existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payroll_items_extras' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        -- Agregar columna tenant_id
        ALTER TABLE payroll_items_extras 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a payroll_items_extras';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en payroll_items_extras';
    END IF;
    
    -- Actualizar registros existentes con tenant_id
    UPDATE payroll_items_extras 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL OR tenant_id = 'accebf8a-bacc-41fa-9601-ed39cb320a52'::UUID;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en payroll_items_extras', updated_count;
    
    -- Crear índice para performance
    CREATE INDEX IF NOT EXISTS idx_payroll_items_extras_tenant 
    ON payroll_items_extras(tenant_id);
    
    -- Crear índice compuesto para consultas frecuentes
    CREATE INDEX IF NOT EXISTS idx_payroll_items_extras_tenant_payroll_run 
    ON payroll_items_extras(tenant_id, payroll_run_id);
    
    CREATE INDEX IF NOT EXISTS idx_payroll_items_extras_tenant_guardia 
    ON payroll_items_extras(tenant_id, guardia_id);
    
    RAISE NOTICE '✅ Índices creados para payroll_items_extras';
END $$;

-- =====================================================
-- 4. MIGRAR TABLA: historial_asignaciones_guardias
-- =====================================================

DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    -- Verificar si la columna tenant_id ya existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'historial_asignaciones_guardias' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        -- Agregar columna tenant_id
        ALTER TABLE historial_asignaciones_guardias 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a historial_asignaciones_guardias';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en historial_asignaciones_guardias';
    END IF;
    
    -- Actualizar registros existentes con tenant_id de los guardias relacionados
    UPDATE historial_asignaciones_guardias ha
    SET tenant_id = g.tenant_id
    FROM guardias g 
    WHERE ha.guardia_id = g.id 
      AND ha.tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en historial_asignaciones_guardias', updated_count;
    
    -- Crear índice para performance
    CREATE INDEX IF NOT EXISTS idx_historial_asignaciones_guardias_tenant 
    ON historial_asignaciones_guardias(tenant_id);
    
    -- Crear índice compuesto para consultas frecuentes
    CREATE INDEX IF NOT EXISTS idx_historial_asignaciones_guardias_tenant_guardia 
    ON historial_asignaciones_guardias(tenant_id, guardia_id);
    
    CREATE INDEX IF NOT EXISTS idx_historial_asignaciones_guardias_tenant_instalacion 
    ON historial_asignaciones_guardias(tenant_id, instalacion_id);
    
    RAISE NOTICE '✅ Índices creados para historial_asignaciones_guardias';
END $$;

-- =====================================================
-- 5. VERIFICAR MIGRACIÓN
-- =====================================================

DO $$
DECLARE
    total_null_count INTEGER := 0;
    table_name TEXT;
    null_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 Verificando migración de tablas restantes...';
    
    -- Verificar que no queden registros con tenant_id NULL
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
            RAISE WARNING '⚠️  Tabla % tiene % registros con tenant_id NULL', table_name, null_count;
        ELSE
            RAISE NOTICE '✅ Tabla %: todos los registros tienen tenant_id', table_name;
        END IF;
    END LOOP;
    
    IF total_null_count = 0 THEN
        RAISE NOTICE '🎉 VERIFICACIÓN EXITOSA: Todas las tablas restantes tienen tenant_id poblado';
    ELSE
        RAISE WARNING '⚠️  VERIFICACIÓN: % registros aún tienen tenant_id NULL', total_null_count;
    END IF;
END $$;

-- =====================================================
-- 6. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON COLUMN payroll_run.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. Migrado desde valor hardcodeado.';

COMMENT ON COLUMN payroll_items_extras.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. Migrado desde valor hardcodeado.';

COMMENT ON COLUMN historial_asignaciones_guardias.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. Obtenido de la tabla guardias.';

-- =====================================================
-- 7. RESUMEN DE LA MIGRACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 MIGRACIÓN DE TABLAS RESTANTES COMPLETADA';
    RAISE NOTICE '📋 Tablas migradas:';
    RAISE NOTICE '   ✅ payroll_run';
    RAISE NOTICE '   ✅ payroll_items_extras';
    RAISE NOTICE '   ✅ historial_asignaciones_guardias';
    RAISE NOTICE '📊 Sistema ahora está 100% multitenant';
    RAISE NOTICE '🔍 Próximo paso: Ejecutar make-remaining-tables-not-null.sql (opcional)';
END $$;
