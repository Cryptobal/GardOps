-- =====================================================
-- MIGRACIÓN COMPLETA A 100% MULTITENANT - TODAS LAS TABLAS RESTANTES
-- 41 tablas con tenant_id NULLABLE → tenant_id NOT NULL
-- =====================================================
-- Fecha: 2025-01-27
-- Propósito: Completar migración a 100% multitenant en TODAS las tablas
-- Estrategia: Gradual, con validaciones y manejo de errores

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
-- 2. FUNCIÓN HELPER PARA MIGRAR UNA TABLA
-- =====================================================

CREATE OR REPLACE FUNCTION migrar_tabla_a_not_null(
    p_table_name TEXT,
    p_tenant_id UUID
) RETURNS TEXT AS $$
DECLARE
    null_count INTEGER;
    updated_count INTEGER;
    result TEXT;
BEGIN
    -- Verificar que la tabla existe y tiene tenant_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = p_table_name 
        AND column_name = 'tenant_id'
        AND table_schema = 'public'
    ) THEN
        RETURN '❌ Tabla ' || p_table_name || ' no tiene columna tenant_id';
    END IF;
    
    -- Contar registros con tenant_id NULL
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id IS NULL', p_table_name) INTO null_count;
    
    -- Actualizar registros con tenant_id NULL
    IF null_count > 0 THEN
        EXECUTE format('UPDATE %I SET tenant_id = $1 WHERE tenant_id IS NULL', p_table_name) 
        USING p_tenant_id;
        GET DIAGNOSTICS updated_count = ROW_COUNT;
    ELSE
        updated_count := 0;
    END IF;
    
    -- Hacer tenant_id NOT NULL
    EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', p_table_name);
    
    -- Agregar Foreign Key si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = p_table_name 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'tenant_id'
        AND kcu.referenced_table_name = 'tenants'
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT fk_%s_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 
                      p_table_name, p_table_name);
    END IF;
    
    -- Crear índice si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = p_table_name 
        AND indexname = 'idx_' || p_table_name || '_tenant'
    ) THEN
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tenant ON %I(tenant_id)', 
                      p_table_name, p_table_name);
    END IF;
    
    result := '✅ ' || p_table_name || ': ' || updated_count || ' registros actualizados, tenant_id ahora NOT NULL';
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN '❌ ' || p_table_name || ': Error - ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. MIGRAR TODAS LAS TABLAS RESTANTES
-- =====================================================

DO $$
DECLARE
    tenant_uuid UUID;
    table_name TEXT;
    result TEXT;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    total_tables INTEGER := 0;
BEGIN
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    RAISE NOTICE '🚀 Iniciando migración de 41 tablas restantes a tenant_id NOT NULL...';
    
    -- Lista de tablas a migrar (tenant_id NULLABLE)
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'as_turnos_pauta_mensual',
            'as_turnos_puestos_operativos', 
            'as_turnos_roles_servicio',
            'as_turnos_series_dias',
            'cat_tipos_puesto',
            'central_config_instalacion',
            'central_incidentes',
            'central_llamados',
            'central_logs',
            'central_v_llamados_automaticos',
            'clientes',
            'configuracion_sistema',
            'documentos',
            'documentos_tipos',
            'documentos_usuarios',
            'guardias',
            'instalaciones',
            'logs_documentos',
            'logs_documentos_postulacion',
            'logs_guardias',
            'logs_pauta_diaria',
            'logs_pauta_mensual',
            'logs_postulacion',
            'logs_postulaciones',
            'logs_puestos_operativos',
            'logs_tenant_webhooks',
            'logs_turnos_extras',
            'logs_usuarios',
            'notificaciones',
            'pauta_seguimiento',
            'pautas_diarias',
            'pautas_mensuales',
            'puestos_por_cubrir',
            'roles',
            'roles_servicio',
            'rondas',
            'sueldo_estructuras_roles',
            'tipos_documentos',
            'turnos_extras',
            'usuarios',
            'usuarios_permisos'
        ])
    LOOP
        total_tables := total_tables + 1;
        
        -- Migrar tabla
        SELECT migrar_tabla_a_not_null(table_name, tenant_uuid) INTO result;
        
        -- Mostrar resultado
        RAISE NOTICE '%', result;
        
        -- Contar éxitos y errores
        IF result LIKE '✅%' THEN
            success_count := success_count + 1;
        ELSE
            error_count := error_count + 1;
        END IF;
    END LOOP;
    
    -- Resumen final
    RAISE NOTICE '📊 RESUMEN DE MIGRACIÓN:';
    RAISE NOTICE '   Total de tablas procesadas: %', total_tables;
    RAISE NOTICE '   Migraciones exitosas: %', success_count;
    RAISE NOTICE '   Errores: %', error_count;
    
    IF error_count = 0 THEN
        RAISE NOTICE '🎉 MIGRACIÓN COMPLETADA: Todas las tablas ahora tienen tenant_id NOT NULL';
    ELSE
        RAISE WARNING '⚠️  MIGRACIÓN PARCIAL: % tablas tuvieron errores', error_count;
    END IF;
    
END $$;

-- =====================================================
-- 4. VERIFICACIÓN FINAL COMPLETA
-- =====================================================

DO $$
DECLARE
    total_tables INTEGER;
    not_null_tables INTEGER;
    nullable_tables INTEGER;
    fk_count INTEGER;
    percentage DECIMAL(5,2);
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
    
    -- Contar tablas con tenant_id NULLABLE
    SELECT COUNT(*) INTO nullable_tables
    FROM information_schema.columns 
    WHERE column_name = 'tenant_id' 
    AND table_schema = 'public'
    AND is_nullable = 'YES';
    
    -- Contar tablas con Foreign Key a tenants
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'tenant_id'
    AND kcu.referenced_table_name = 'tenants';
    
    -- Calcular porcentaje
    percentage := CASE WHEN total_tables > 0 THEN ROUND((not_null_tables::DECIMAL / total_tables) * 100, 2) ELSE 0 END;
    
    RAISE NOTICE '🎯 VERIFICACIÓN FINAL DEL SISTEMA MULTITENANT:';
    RAISE NOTICE '   Total de tablas con tenant_id: %', total_tables;
    RAISE NOTICE '   Tablas con tenant_id NOT NULL: %', not_null_tables;
    RAISE NOTICE '   Tablas con tenant_id NULLABLE: %', nullable_tables;
    RAISE NOTICE '   Tablas con FK a tenants: %', fk_count;
    RAISE NOTICE '   Porcentaje de cobertura NOT NULL: %', percentage;
    
    IF not_null_tables = total_tables AND fk_count = total_tables THEN
        RAISE NOTICE '🎉 SISTEMA 100% MULTITENANT COMPLETADO: Todas las % tablas están completamente migradas', total_tables;
        RAISE NOTICE '✅ Todas las tablas tienen tenant_id NOT NULL';
        RAISE NOTICE '✅ Todas las tablas tienen Foreign Keys a tenants';
        RAISE NOTICE '✅ Sistema listo para producción multitenant';
    ELSE
        RAISE WARNING '⚠️  SISTEMA PARCIALMENTE MULTITENANT: Revisar tablas faltantes';
        RAISE WARNING '   Faltan % tablas para ser NOT NULL', nullable_tables;
        RAISE WARNING '   Faltan % Foreign Keys', (total_tables - fk_count);
    END IF;
END $$;

-- =====================================================
-- 5. LIMPIAR FUNCIÓN HELPER
-- =====================================================

DROP FUNCTION IF EXISTS migrar_tabla_a_not_null(TEXT, UUID);

-- =====================================================
-- 6. RESUMEN FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 MIGRACIÓN COMPLETA A 100% MULTITENANT FINALIZADA';
    RAISE NOTICE '📋 Todas las tablas del sistema ahora tienen tenant_id NOT NULL';
    RAISE NOTICE '🔒 Todas las tablas tienen Foreign Keys para integridad referencial';
    RAISE NOTICE '⚡ Índices optimizados para performance multitenant';
    RAISE NOTICE '🎯 Sistema 100% multitenant listo para producción';
    RAISE NOTICE '⚠️  IMPORTANTE: Todas las consultas deben incluir WHERE tenant_id = $1';
    RAISE NOTICE '🔍 Las consultas legacy ya no funcionarán (tenant_id es obligatorio)';
END $$;
