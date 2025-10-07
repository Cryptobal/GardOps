-- =====================================================
-- MIGRACIÓN GRADUAL A MULTITENANT - FASE 2: POBLAR TENANT_ID
-- Tablas de Payroll/Sueldos
-- =====================================================
-- Fecha: 2025-01-27
-- Propósito: Poblar tenant_id con valor por defecto en todas las tablas de sueldo
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
-- 2. POBLAR TENANT_ID EN TABLAS DE SUELDO
-- =====================================================

-- 2.1 sueldo_estructuras_servicio
DO $$
DECLARE
    tenant_uuid UUID;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    UPDATE sueldo_estructuras_servicio 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en sueldo_estructuras_servicio', updated_count;
END $$;

-- 2.2 sueldo_estructura_guardia
DO $$
DECLARE
    tenant_uuid UUID;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    UPDATE sueldo_estructura_guardia 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en sueldo_estructura_guardia', updated_count;
END $$;

-- 2.3 sueldo_estructura_guardia_item
DO $$
DECLARE
    tenant_uuid UUID;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    UPDATE sueldo_estructura_guardia_item 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en sueldo_estructura_guardia_item', updated_count;
END $$;

-- 2.4 sueldo_bonos_globales
DO $$
DECLARE
    tenant_uuid UUID;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    UPDATE sueldo_bonos_globales 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en sueldo_bonos_globales', updated_count;
END $$;

-- 2.5 sueldo_item
DO $$
DECLARE
    tenant_uuid UUID;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    UPDATE sueldo_item 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en sueldo_item', updated_count;
END $$;

-- 2.6 sueldo_parametros_generales
DO $$
DECLARE
    tenant_uuid UUID;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    UPDATE sueldo_parametros_generales 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en sueldo_parametros_generales', updated_count;
END $$;

-- 2.7 sueldo_asignacion_familiar
DO $$
DECLARE
    tenant_uuid UUID;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    UPDATE sueldo_asignacion_familiar 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en sueldo_asignacion_familiar', updated_count;
END $$;

-- 2.8 sueldo_afp
DO $$
DECLARE
    tenant_uuid UUID;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    UPDATE sueldo_afp 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en sueldo_afp', updated_count;
END $$;

-- 2.9 sueldo_isapre
DO $$
DECLARE
    tenant_uuid UUID;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    UPDATE sueldo_isapre 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en sueldo_isapre', updated_count;
END $$;

-- 2.10 sueldo_tramos_impuesto
DO $$
DECLARE
    tenant_uuid UUID;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    UPDATE sueldo_tramos_impuesto 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en sueldo_tramos_impuesto', updated_count;
END $$;

-- 2.11 sueldo_historial_calculos
DO $$
DECLARE
    tenant_uuid UUID;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    UPDATE sueldo_historial_calculos 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en sueldo_historial_calculos', updated_count;
END $$;

-- 2.12 sueldo_historial_estructuras
DO $$
DECLARE
    tenant_uuid UUID;
    updated_count INTEGER;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    UPDATE sueldo_historial_estructuras 
    SET tenant_id = tenant_uuid
    WHERE tenant_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en sueldo_historial_estructuras', updated_count;
END $$;

-- =====================================================
-- 3. VERIFICAR POBLACIÓN
-- =====================================================

DO $$
DECLARE
    total_null_count INTEGER := 0;
    table_name TEXT;
    null_count INTEGER;
BEGIN
    -- Verificar que no queden registros con tenant_id NULL
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'sueldo_estructuras_servicio',
            'sueldo_estructura_guardia', 
            'sueldo_estructura_guardia_item',
            'sueldo_bonos_globales',
            'sueldo_item',
            'sueldo_parametros_generales',
            'sueldo_asignacion_familiar',
            'sueldo_afp',
            'sueldo_isapre',
            'sueldo_tramos_impuesto',
            'sueldo_historial_calculos',
            'sueldo_historial_estructuras'
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
        RAISE NOTICE '🎉 VERIFICACIÓN EXITOSA: Todas las tablas tienen tenant_id poblado';
    ELSE
        RAISE WARNING '⚠️  VERIFICACIÓN: % registros aún tienen tenant_id NULL', total_null_count;
    END IF;
END $$;

-- =====================================================
-- 4. RESUMEN DE LA FASE 2
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 FASE 2 COMPLETADA: Poblado tenant_id en todas las tablas de sueldo';
    RAISE NOTICE '📋 Próximo paso: Ejecutar migrate-payroll-multitenant-phase3.sql para crear índices';
    RAISE NOTICE '⚠️  IMPORTANTE: Las consultas existentes seguirán funcionando (tenant_id es nullable)';
    RAISE NOTICE '🔍 Las nuevas consultas pueden incluir WHERE tenant_id = $1 para filtrado';
END $$;
