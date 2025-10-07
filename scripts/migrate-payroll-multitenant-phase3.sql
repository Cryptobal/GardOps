-- =====================================================
-- MIGRACIÓN GRADUAL A MULTITENANT - FASE 3: CREAR ÍNDICES
-- Tablas de Payroll/Sueldos
-- =====================================================
-- Fecha: 2025-01-27
-- Propósito: Crear índices para optimizar consultas con tenant_id
-- Estrategia: Gradual, sin romper funcionalidad existente

-- =====================================================
-- 1. CREAR ÍNDICES PARA PERFORMANCE MULTITENANT
-- =====================================================

-- 1.1 sueldo_estructuras_servicio
CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_servicio_tenant 
ON sueldo_estructuras_servicio(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_servicio_tenant_instalacion 
ON sueldo_estructuras_servicio(tenant_id, instalacion_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_servicio_tenant_rol 
ON sueldo_estructuras_servicio(tenant_id, rol_servicio_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_servicio_tenant_activo 
ON sueldo_estructuras_servicio(tenant_id, activo);

-- 1.2 sueldo_estructura_guardia
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_guardia_tenant 
ON sueldo_estructura_guardia(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_guardia_tenant_guardia 
ON sueldo_estructura_guardia(tenant_id, guardia_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_guardia_tenant_activo 
ON sueldo_estructura_guardia(tenant_id, activo);

-- 1.3 sueldo_estructura_guardia_item
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_guardia_item_tenant 
ON sueldo_estructura_guardia_item(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_guardia_item_tenant_estructura 
ON sueldo_estructura_guardia_item(tenant_id, estructura_guardia_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_guardia_item_tenant_activo 
ON sueldo_estructura_guardia_item(tenant_id, activo);

-- 1.4 sueldo_bonos_globales
CREATE INDEX IF NOT EXISTS idx_sueldo_bonos_globales_tenant 
ON sueldo_bonos_globales(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_bonos_globales_tenant_activo 
ON sueldo_bonos_globales(tenant_id, activo);

CREATE INDEX IF NOT EXISTS idx_sueldo_bonos_globales_tenant_imponible 
ON sueldo_bonos_globales(tenant_id, imponible);

-- 1.5 sueldo_item
CREATE INDEX IF NOT EXISTS idx_sueldo_item_tenant 
ON sueldo_item(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_item_tenant_activo 
ON sueldo_item(tenant_id, activo);

CREATE INDEX IF NOT EXISTS idx_sueldo_item_tenant_clase 
ON sueldo_item(tenant_id, clase);

CREATE INDEX IF NOT EXISTS idx_sueldo_item_tenant_naturaleza 
ON sueldo_item(tenant_id, naturaleza);

-- 1.6 sueldo_parametros_generales
CREATE INDEX IF NOT EXISTS idx_sueldo_parametros_generales_tenant 
ON sueldo_parametros_generales(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_parametros_generales_tenant_parametro 
ON sueldo_parametros_generales(tenant_id, parametro);

-- 1.7 sueldo_asignacion_familiar
CREATE INDEX IF NOT EXISTS idx_sueldo_asignacion_familiar_tenant 
ON sueldo_asignacion_familiar(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_asignacion_familiar_tenant_periodo 
ON sueldo_asignacion_familiar(tenant_id, periodo);

CREATE INDEX IF NOT EXISTS idx_sueldo_asignacion_familiar_tenant_tramo 
ON sueldo_asignacion_familiar(tenant_id, tramo);

-- 1.8 sueldo_afp
CREATE INDEX IF NOT EXISTS idx_sueldo_afp_tenant 
ON sueldo_afp(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_afp_tenant_codigo 
ON sueldo_afp(tenant_id, codigo);

-- 1.9 sueldo_isapre
CREATE INDEX IF NOT EXISTS idx_sueldo_isapre_tenant 
ON sueldo_isapre(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_isapre_tenant_nombre 
ON sueldo_isapre(tenant_id, nombre);

-- 1.10 sueldo_tramos_impuesto
CREATE INDEX IF NOT EXISTS idx_sueldo_tramos_impuesto_tenant 
ON sueldo_tramos_impuesto(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_tramos_impuesto_tenant_tramo 
ON sueldo_tramos_impuesto(tenant_id, tramo);

CREATE INDEX IF NOT EXISTS idx_sueldo_tramos_impuesto_tenant_activo 
ON sueldo_tramos_impuesto(tenant_id, activo);

-- 1.11 sueldo_historial_calculos
CREATE INDEX IF NOT EXISTS idx_sueldo_historial_calculos_tenant 
ON sueldo_historial_calculos(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_historial_calculos_tenant_guardia 
ON sueldo_historial_calculos(tenant_id, guardia_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_historial_calculos_tenant_periodo 
ON sueldo_historial_calculos(tenant_id, anio_periodo, mes_periodo);

CREATE INDEX IF NOT EXISTS idx_sueldo_historial_calculos_tenant_fecha 
ON sueldo_historial_calculos(tenant_id, fecha_calculo);

-- 1.12 sueldo_historial_estructuras
CREATE INDEX IF NOT EXISTS idx_sueldo_historial_estructuras_tenant 
ON sueldo_historial_estructuras(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_historial_estructuras_tenant_estructura 
ON sueldo_historial_estructuras(tenant_id, estructura_id);

CREATE INDEX IF NOT EXISTS idx_sueldo_historial_estructuras_tenant_fecha 
ON sueldo_historial_estructuras(tenant_id, fecha_accion);

-- =====================================================
-- 2. CREAR ÍNDICES COMPUESTOS PARA CONSULTAS FRECUENTES
-- =====================================================

-- 2.1 Índices para consultas de estructuras por instalación y rol
CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_servicio_tenant_instalacion_rol_activo 
ON sueldo_estructuras_servicio(tenant_id, instalacion_id, rol_servicio_id, activo);

-- 2.2 Índices para consultas de bonos por tipo
CREATE INDEX IF NOT EXISTS idx_sueldo_bonos_globales_tenant_activo_imponible 
ON sueldo_bonos_globales(tenant_id, activo, imponible);

-- 2.3 Índices para consultas de items por clase y naturaleza
CREATE INDEX IF NOT EXISTS idx_sueldo_item_tenant_activo_clase_naturaleza 
ON sueldo_item(tenant_id, activo, clase, naturaleza);

-- 2.4 Índices para consultas de parámetros por vigencia
CREATE INDEX IF NOT EXISTS idx_sueldo_parametros_generales_tenant_parametro_vigencia 
ON sueldo_parametros_generales(tenant_id, parametro, fecha_vigencia);

-- 2.5 Índices para consultas de tramos por vigencia
CREATE INDEX IF NOT EXISTS idx_sueldo_tramos_impuesto_tenant_activo_vigencia 
ON sueldo_tramos_impuesto(tenant_id, activo, fecha_vigencia);

-- =====================================================
-- 3. VERIFICAR CREACIÓN DE ÍNDICES
-- =====================================================

DO $$
DECLARE
    index_count INTEGER;
    expected_indexes TEXT[] := ARRAY[
        'idx_sueldo_estructuras_servicio_tenant',
        'idx_sueldo_estructura_guardia_tenant',
        'idx_sueldo_estructura_guardia_item_tenant',
        'idx_sueldo_bonos_globales_tenant',
        'idx_sueldo_item_tenant',
        'idx_sueldo_parametros_generales_tenant',
        'idx_sueldo_asignacion_familiar_tenant',
        'idx_sueldo_afp_tenant',
        'idx_sueldo_isapre_tenant',
        'idx_sueldo_tramos_impuesto_tenant',
        'idx_sueldo_historial_calculos_tenant',
        'idx_sueldo_historial_estructuras_tenant'
    ];
    index_name TEXT;
BEGIN
    RAISE NOTICE '🔍 Verificando creación de índices...';
    
    FOR index_name IN SELECT unnest(expected_indexes)
    LOOP
        SELECT COUNT(*) INTO index_count
        FROM pg_indexes 
        WHERE indexname = index_name;
        
        IF index_count > 0 THEN
            RAISE NOTICE '✅ Índice % creado correctamente', index_name;
        ELSE
            RAISE WARNING '⚠️  Índice % no encontrado', index_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎉 Verificación de índices completada';
END $$;

-- =====================================================
-- 4. ESTADÍSTICAS DE PERFORMANCE
-- =====================================================

DO $$
DECLARE
    total_indexes INTEGER;
    tenant_indexes INTEGER;
BEGIN
    -- Contar total de índices en tablas de sueldo
    SELECT COUNT(*) INTO total_indexes
    FROM pg_indexes 
    WHERE tablename LIKE 'sueldo_%';
    
    -- Contar índices específicos de tenant
    SELECT COUNT(*) INTO tenant_indexes
    FROM pg_indexes 
    WHERE tablename LIKE 'sueldo_%' 
    AND indexname LIKE '%tenant%';
    
    RAISE NOTICE '📊 Estadísticas de índices:';
    RAISE NOTICE '   Total de índices en tablas sueldo: %', total_indexes;
    RAISE NOTICE '   Índices específicos de tenant: %', tenant_indexes;
    RAISE NOTICE '   Porcentaje de cobertura tenant: %', 
        CASE WHEN total_indexes > 0 THEN ROUND((tenant_indexes::DECIMAL / total_indexes) * 100, 2) ELSE 0 END;
END $$;

-- =====================================================
-- 5. RESUMEN DE LA FASE 3
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 FASE 3 COMPLETADA: Creados índices para performance multitenant';
    RAISE NOTICE '📋 Próximo paso: Ejecutar migrate-payroll-multitenant-phase4.sql para actualizar APIs';
    RAISE NOTICE '⚡ Las consultas con tenant_id ahora tendrán mejor performance';
    RAISE NOTICE '🔍 Se crearon índices simples y compuestos para consultas frecuentes';
END $$;
