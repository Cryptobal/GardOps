-- =====================================================
-- MIGRACIÓN GRADUAL A MULTITENANT - FASE 1: PREPARACIÓN
-- Tablas de Payroll/Sueldos
-- =====================================================
-- Fecha: 2025-01-27
-- Propósito: Agregar tenant_id nullable a todas las tablas de sueldo
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
-- 2. AGREGAR TENANT_ID A TABLAS DE SUELDO
-- =====================================================

-- 2.1 sueldo_estructuras_servicio
DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    -- Obtener tenant_id
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    -- Verificar si la columna ya existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sueldo_estructuras_servicio' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE sueldo_estructuras_servicio 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a sueldo_estructuras_servicio';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en sueldo_estructuras_servicio';
    END IF;
END $$;

-- 2.2 sueldo_estructura_guardia
DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sueldo_estructura_guardia' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE sueldo_estructura_guardia 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a sueldo_estructura_guardia';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en sueldo_estructura_guardia';
    END IF;
END $$;

-- 2.3 sueldo_estructura_guardia_item
DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sueldo_estructura_guardia_item' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE sueldo_estructura_guardia_item 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a sueldo_estructura_guardia_item';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en sueldo_estructura_guardia_item';
    END IF;
END $$;

-- 2.4 sueldo_bonos_globales
DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sueldo_bonos_globales' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE sueldo_bonos_globales 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a sueldo_bonos_globales';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en sueldo_bonos_globales';
    END IF;
END $$;

-- 2.5 sueldo_item
DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sueldo_item' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE sueldo_item 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a sueldo_item';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en sueldo_item';
    END IF;
END $$;

-- 2.6 sueldo_parametros_generales
DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sueldo_parametros_generales' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE sueldo_parametros_generales 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a sueldo_parametros_generales';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en sueldo_parametros_generales';
    END IF;
END $$;

-- 2.7 sueldo_asignacion_familiar
DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sueldo_asignacion_familiar' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE sueldo_asignacion_familiar 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a sueldo_asignacion_familiar';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en sueldo_asignacion_familiar';
    END IF;
END $$;

-- 2.8 sueldo_afp
DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sueldo_afp' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE sueldo_afp 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a sueldo_afp';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en sueldo_afp';
    END IF;
END $$;

-- 2.9 sueldo_isapre
DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sueldo_isapre' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE sueldo_isapre 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a sueldo_isapre';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en sueldo_isapre';
    END IF;
END $$;

-- 2.10 sueldo_tramos_impuesto
DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sueldo_tramos_impuesto' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE sueldo_tramos_impuesto 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a sueldo_tramos_impuesto';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en sueldo_tramos_impuesto';
    END IF;
END $$;

-- 2.11 sueldo_historial_calculos
DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sueldo_historial_calculos' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE sueldo_historial_calculos 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a sueldo_historial_calculos';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en sueldo_historial_calculos';
    END IF;
END $$;

-- 2.12 sueldo_historial_estructuras
DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sueldo_historial_estructuras' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE sueldo_historial_estructuras 
        ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Agregada columna tenant_id a sueldo_historial_estructuras';
    ELSE
        RAISE NOTICE '✅ Columna tenant_id ya existe en sueldo_historial_estructuras';
    END IF;
END $$;

-- =====================================================
-- 3. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON COLUMN sueldo_estructuras_servicio.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

COMMENT ON COLUMN sueldo_estructura_guardia.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

COMMENT ON COLUMN sueldo_estructura_guardia_item.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

COMMENT ON COLUMN sueldo_bonos_globales.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

COMMENT ON COLUMN sueldo_item.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

COMMENT ON COLUMN sueldo_parametros_generales.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

COMMENT ON COLUMN sueldo_asignacion_familiar.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

COMMENT ON COLUMN sueldo_afp.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

COMMENT ON COLUMN sueldo_isapre.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

COMMENT ON COLUMN sueldo_tramos_impuesto.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

COMMENT ON COLUMN sueldo_historial_calculos.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

COMMENT ON COLUMN sueldo_historial_estructuras.tenant_id IS 
'Identificador del tenant para soporte multi-tenant. NULL = datos legacy compatibles.';

-- =====================================================
-- 4. RESUMEN DE LA FASE 1
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 FASE 1 COMPLETADA: Agregadas columnas tenant_id a todas las tablas de sueldo';
    RAISE NOTICE '📋 Próximo paso: Ejecutar migrate-payroll-multitenant-phase2.sql para poblar tenant_id';
    RAISE NOTICE '⚠️  IMPORTANTE: Las consultas existentes seguirán funcionando (tenant_id es nullable)';
END $$;
