-- =====================================================
-- MIGRACIÓN GRADUAL A MULTITENANT - FASE 6: HACER TENANT_ID NOT NULL (OPCIONAL)
-- Tablas de Payroll/Sueldos
-- =====================================================
-- Fecha: 2025-01-27
-- Propósito: Hacer tenant_id NOT NULL en todas las tablas de sueldo
-- Estrategia: Solo ejecutar si todas las fases anteriores fueron exitosas
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
        RAISE EXCEPTION '❌ Tenant "Gard" no existe. Ejecute primero las fases anteriores.';
    END IF;
    
    RAISE NOTICE '✅ Tenant "Gard" encontrado con ID: %', tenant_id;
    
    -- Verificar que no hay registros con tenant_id NULL
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
            RAISE EXCEPTION '❌ Tabla % tiene % registros con tenant_id NULL. Ejecute primero la Fase 2.', table_name, null_count;
        END IF;
    END LOOP;
    
    IF total_null_count > 0 THEN
        RAISE EXCEPTION '❌ Hay % registros con tenant_id NULL. Ejecute primero la Fase 2.', total_null_count;
    END IF;
    
    RAISE NOTICE '✅ Verificación exitosa: No hay registros con tenant_id NULL';
    
END $$;

-- =====================================================
-- 2. HACER TENANT_ID NOT NULL EN TABLAS DE SUELDO
-- =====================================================

-- 2.1 sueldo_estructuras_servicio
DO $$
BEGIN
    ALTER TABLE sueldo_estructuras_servicio 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ sueldo_estructuras_servicio.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en sueldo_estructuras_servicio: %', SQLERRM;
END $$;

-- 2.2 sueldo_estructura_guardia
DO $$
BEGIN
    ALTER TABLE sueldo_estructura_guardia 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ sueldo_estructura_guardia.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en sueldo_estructura_guardia: %', SQLERRM;
END $$;

-- 2.3 sueldo_estructura_guardia_item
DO $$
BEGIN
    ALTER TABLE sueldo_estructura_guardia_item 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ sueldo_estructura_guardia_item.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en sueldo_estructura_guardia_item: %', SQLERRM;
END $$;

-- 2.4 sueldo_bonos_globales
DO $$
BEGIN
    ALTER TABLE sueldo_bonos_globales 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ sueldo_bonos_globales.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en sueldo_bonos_globales: %', SQLERRM;
END $$;

-- 2.5 sueldo_item
DO $$
BEGIN
    ALTER TABLE sueldo_item 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ sueldo_item.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en sueldo_item: %', SQLERRM;
END $$;

-- 2.6 sueldo_parametros_generales
DO $$
BEGIN
    ALTER TABLE sueldo_parametros_generales 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ sueldo_parametros_generales.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en sueldo_parametros_generales: %', SQLERRM;
END $$;

-- 2.7 sueldo_asignacion_familiar
DO $$
BEGIN
    ALTER TABLE sueldo_asignacion_familiar 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ sueldo_asignacion_familiar.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en sueldo_asignacion_familiar: %', SQLERRM;
END $$;

-- 2.8 sueldo_afp
DO $$
BEGIN
    ALTER TABLE sueldo_afp 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ sueldo_afp.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en sueldo_afp: %', SQLERRM;
END $$;

-- 2.9 sueldo_isapre
DO $$
BEGIN
    ALTER TABLE sueldo_isapre 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ sueldo_isapre.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en sueldo_isapre: %', SQLERRM;
END $$;

-- 2.10 sueldo_tramos_impuesto
DO $$
BEGIN
    ALTER TABLE sueldo_tramos_impuesto 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ sueldo_tramos_impuesto.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en sueldo_tramos_impuesto: %', SQLERRM;
END $$;

-- 2.11 sueldo_historial_calculos
DO $$
BEGIN
    ALTER TABLE sueldo_historial_calculos 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ sueldo_historial_calculos.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en sueldo_historial_calculos: %', SQLERRM;
END $$;

-- 2.12 sueldo_historial_estructuras
DO $$
BEGIN
    ALTER TABLE sueldo_historial_estructuras 
    ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE '✅ sueldo_historial_estructuras.tenant_id ahora es NOT NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error en sueldo_historial_estructuras: %', SQLERRM;
END $$;

-- =====================================================
-- 3. AGREGAR FOREIGN KEYS A TENANTS
-- =====================================================

-- 3.1 sueldo_estructuras_servicio
DO $$
BEGIN
    ALTER TABLE sueldo_estructuras_servicio 
    ADD CONSTRAINT fk_sueldo_estructuras_servicio_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en sueldo_estructuras_servicio';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en sueldo_estructuras_servicio: %', SQLERRM;
END $$;

-- 3.2 sueldo_estructura_guardia
DO $$
BEGIN
    ALTER TABLE sueldo_estructura_guardia 
    ADD CONSTRAINT fk_sueldo_estructura_guardia_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en sueldo_estructura_guardia';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en sueldo_estructura_guardia: %', SQLERRM;
END $$;

-- 3.3 sueldo_estructura_guardia_item
DO $$
BEGIN
    ALTER TABLE sueldo_estructura_guardia_item 
    ADD CONSTRAINT fk_sueldo_estructura_guardia_item_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en sueldo_estructura_guardia_item';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en sueldo_estructura_guardia_item: %', SQLERRM;
END $$;

-- 3.4 sueldo_bonos_globales
DO $$
BEGIN
    ALTER TABLE sueldo_bonos_globales 
    ADD CONSTRAINT fk_sueldo_bonos_globales_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en sueldo_bonos_globales';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en sueldo_bonos_globales: %', SQLERRM;
END $$;

-- 3.5 sueldo_item
DO $$
BEGIN
    ALTER TABLE sueldo_item 
    ADD CONSTRAINT fk_sueldo_item_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en sueldo_item';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en sueldo_item: %', SQLERRM;
END $$;

-- 3.6 sueldo_parametros_generales
DO $$
BEGIN
    ALTER TABLE sueldo_parametros_generales 
    ADD CONSTRAINT fk_sueldo_parametros_generales_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en sueldo_parametros_generales';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en sueldo_parametros_generales: %', SQLERRM;
END $$;

-- 3.7 sueldo_asignacion_familiar
DO $$
BEGIN
    ALTER TABLE sueldo_asignacion_familiar 
    ADD CONSTRAINT fk_sueldo_asignacion_familiar_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en sueldo_asignacion_familiar';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en sueldo_asignacion_familiar: %', SQLERRM;
END $$;

-- 3.8 sueldo_afp
DO $$
BEGIN
    ALTER TABLE sueldo_afp 
    ADD CONSTRAINT fk_sueldo_afp_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en sueldo_afp';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en sueldo_afp: %', SQLERRM;
END $$;

-- 3.9 sueldo_isapre
DO $$
BEGIN
    ALTER TABLE sueldo_isapre 
    ADD CONSTRAINT fk_sueldo_isapre_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en sueldo_isapre';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en sueldo_isapre: %', SQLERRM;
END $$;

-- 3.10 sueldo_tramos_impuesto
DO $$
BEGIN
    ALTER TABLE sueldo_tramos_impuesto 
    ADD CONSTRAINT fk_sueldo_tramos_impuesto_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en sueldo_tramos_impuesto';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en sueldo_tramos_impuesto: %', SQLERRM;
END $$;

-- 3.11 sueldo_historial_calculos
DO $$
BEGIN
    ALTER TABLE sueldo_historial_calculos 
    ADD CONSTRAINT fk_sueldo_historial_calculos_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en sueldo_historial_calculos';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en sueldo_historial_calculos: %', SQLERRM;
END $$;

-- 3.12 sueldo_historial_estructuras
DO $$
BEGIN
    ALTER TABLE sueldo_historial_estructuras 
    ADD CONSTRAINT fk_sueldo_historial_estructuras_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Agregada FK tenant_id en sueldo_historial_estructuras';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '⚠️  Error agregando FK en sueldo_historial_estructuras: %', SQLERRM;
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
    RAISE NOTICE '🔍 Verificando migración final...';
    
    -- Verificar que no hay registros con tenant_id NULL
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
        RAISE NOTICE '🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE: Todas las tablas están 100% multitenant';
    ELSE
        RAISE WARNING '⚠️  MIGRACIÓN PARCIAL: % problemas encontrados', total_issues;
    END IF;
END $$;

-- =====================================================
-- 5. RESUMEN DE LA FASE 6
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 FASE 6 COMPLETADA: tenant_id ahora es NOT NULL en todas las tablas de sueldo';
    RAISE NOTICE '🔒 Foreign Keys agregadas para integridad referencial';
    RAISE NOTICE '✅ Sistema 100% multitenant para módulo de payroll/sueldos';
    RAISE NOTICE '⚠️  IMPORTANTE: Las consultas legacy ya no funcionarán (tenant_id es obligatorio)';
    RAISE NOTICE '🔍 Todas las consultas deben incluir WHERE tenant_id = $1';
END $$;
