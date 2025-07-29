-- =====================================================
-- VERIFICACIÓN PREVIA - CORRECCIONES CRÍTICAS GARDOPS
-- Fecha: 29 de Julio de 2025
-- Base de Datos: PostgreSQL (Neon)
-- =====================================================

-- ⚠️  IMPORTANTE: Ejecutar ANTES del script de correcciones
-- Este script valida que todo esté listo para las correcciones

-- =====================================================
-- 1. VERIFICACIÓN DE CONECTIVIDAD Y PERMISOS
-- =====================================================

-- Verificar que tenemos permisos de administrador
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles 
        WHERE rolname = current_user 
            AND rolsuper = true
    ) THEN
        RAISE NOTICE '⚠️  ADVERTENCIA: No tienes permisos de superusuario';
    ELSE
        RAISE NOTICE '✅ Permisos de administrador confirmados';
    END IF;
END $$;

-- Verificar conectividad a la base de datos
SELECT 
    'Conectividad' as verificación,
    current_database() as base_datos,
    current_user as usuario,
    version() as version_postgres;

-- =====================================================
-- 2. VERIFICACIÓN DE TABLAS CRÍTICAS
-- =====================================================

-- Verificar que las tablas críticas existen
WITH critical_tables AS (
    SELECT unnest(ARRAY[
        'asignaciones_guardias',
        'guardias',
        'clientes',
        'usuarios',
        'instalaciones',
        'tipos_documentos',
        'planillas',
        'pautas_diarias',
        'pautas_mensuales',
        'documentos_clientes'
    ]) as table_name
)
SELECT 
    ct.table_name,
    CASE 
        WHEN t.table_name IS NOT NULL THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado,
    CASE 
        WHEN t.table_name IS NOT NULL THEN 
            (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = ct.table_name)::text
        ELSE 'N/A'
    END as columnas
FROM critical_tables ct
LEFT JOIN information_schema.tables t ON ct.table_name = t.table_name
WHERE t.table_schema = 'public' OR t.table_name IS NULL
ORDER BY ct.table_name;

-- =====================================================
-- 3. ANÁLISIS DE asignaciones_guardias.guardia_id
-- =====================================================

-- Verificar el estado actual de la columna problemática
SELECT 
    'asignaciones_guardias.guardia_id' as columna,
    c.data_type as tipo_actual,
    c.is_nullable as permite_nulos,
    c.column_default as valor_por_defecto,
    CASE 
        WHEN c.data_type = 'integer' THEN '🔴 REQUIERE MIGRACIÓN'
        WHEN c.data_type = 'uuid' THEN '✅ YA CORREGIDO'
        ELSE '⚠️  TIPO INESPERADO'
    END as estado
FROM information_schema.columns c
WHERE c.table_name = 'asignaciones_guardias' 
    AND c.column_name = 'guardia_id';

-- Verificar datos existentes en asignaciones_guardias
SELECT 
    'Datos en asignaciones_guardias' as verificación,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as registros_con_guardia_id,
    COUNT(CASE WHEN guardia_id IS NULL THEN 1 END) as registros_sin_guardia_id
FROM asignaciones_guardias;

-- =====================================================
-- 4. ANÁLISIS DE TIMESTAMPS INCONSISTENTES
-- =====================================================

-- Identificar columnas de timestamps inconsistentes
SELECT 
    table_name,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('created_at', 'updated_at') THEN '✅ Consistente'
        WHEN column_name IN ('creado_en', 'modificado_en') THEN '🔴 Requiere normalización'
        ELSE '⚠️  Revisar'
    END as estado
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND data_type IN ('timestamp without time zone', 'timestamp with time zone')
    AND column_name IN ('created_at', 'updated_at', 'creado_en', 'modificado_en')
ORDER BY table_name, column_name;

-- =====================================================
-- 5. ANÁLISIS DE ÍNDICES EXISTENTES
-- =====================================================

-- Verificar índices existentes en tablas críticas
SELECT 
    tablename as tabla,
    indexname as indice,
    indexdef as definición
FROM pg_indexes 
WHERE tablename IN (
    'guardias', 'clientes', 'usuarios', 'instalaciones', 
    'pautas_diarias', 'documentos_clientes'
)
ORDER BY tablename, indexname;

-- Identificar columnas que necesitan índices
WITH columns_needing_indexes AS (
    SELECT 
        c.table_name,
        c.column_name,
        c.data_type,
        CASE 
            WHEN c.column_name LIKE '%id%' AND c.column_name != 'id' THEN 'ALTA'
            WHEN c.column_name IN ('created_at', 'updated_at', 'creado_en', 'modificado_en') THEN 'ALTA'
            WHEN c.column_name IN ('estado', 'status') THEN 'ALTA'
            WHEN c.column_name IN ('email', 'telefono') THEN 'MEDIA'
            WHEN c.column_name IN ('nombre', 'name') THEN 'MEDIA'
            ELSE 'BAJA'
        END as prioridad
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
        AND c.table_name IN (
            'guardias', 'clientes', 'usuarios', 'instalaciones', 
            'pautas_diarias', 'documentos_clientes'
        )
        AND c.column_name NOT IN ('id') -- Excluir claves primarias
),
missing_indexes AS (
    SELECT 
        cni.table_name,
        cni.column_name,
        cni.data_type,
        cni.prioridad
    FROM columns_needing_indexes cni
    LEFT JOIN pg_indexes pi ON cni.table_name = pi.tablename 
        AND cni.column_name = ANY(string_to_array(pi.indexdef, ' '))
    WHERE pi.indexname IS NULL
)
SELECT 
    table_name,
    column_name,
    data_type,
    prioridad,
    CASE 
        WHEN prioridad = 'ALTA' THEN '🔴 CRÍTICO'
        WHEN prioridad = 'MEDIA' THEN '🟡 IMPORTANTE'
        ELSE '🟢 OPCIONAL'
    END as urgencia
FROM missing_indexes
ORDER BY 
    CASE prioridad 
        WHEN 'ALTA' THEN 1 
        WHEN 'MEDIA' THEN 2 
        ELSE 3 
    END,
    table_name, column_name;

-- =====================================================
-- 6. VERIFICACIÓN DE ESPACIO DISPONIBLE
-- =====================================================

-- Verificar espacio disponible para índices
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamaño_total,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as tamaño_tabla,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as tamaño_indices
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename IN (
        'guardias', 'clientes', 'usuarios', 'instalaciones', 
        'pautas_diarias', 'documentos_clientes'
    )
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- 7. VERIFICACIÓN DE CONSTRAINTS
-- =====================================================

-- Verificar constraints existentes
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name IN (
        'asignaciones_guardias', 'guardias', 'clientes', 'usuarios', 'instalaciones'
    )
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- =====================================================
-- 8. RESUMEN DE VERIFICACIÓN
-- =====================================================

-- Generar resumen ejecutivo
WITH verification_summary AS (
    SELECT 
        'Tablas críticas' as categoria,
        COUNT(*) as total,
        COUNT(CASE WHEN t.table_name IS NOT NULL THEN 1 END) as existentes,
        COUNT(CASE WHEN t.table_name IS NULL THEN 1 END) as faltantes
    FROM (
        SELECT unnest(ARRAY[
            'asignaciones_guardias', 'guardias', 'clientes', 'usuarios', 'instalaciones'
        ]) as table_name
    ) required_tables
    LEFT JOIN information_schema.tables t ON required_tables.table_name = t.table_name
    WHERE t.table_schema = 'public' OR t.table_name IS NULL
    
    UNION ALL
    
    SELECT 
        'Columnas problemáticas' as categoria,
        COUNT(*) as total,
        COUNT(CASE WHEN data_type = 'uuid' THEN 1 END) as corregidas,
        COUNT(CASE WHEN data_type = 'integer' THEN 1 END) as por_corregir
    FROM information_schema.columns 
    WHERE table_name = 'asignaciones_guardias' 
        AND column_name = 'guardia_id'
    
    UNION ALL
    
    SELECT 
        'Índices faltantes' as categoria,
        COUNT(*) as total,
        COUNT(CASE WHEN pi.indexname IS NOT NULL THEN 1 END) as existentes,
        COUNT(CASE WHEN pi.indexname IS NULL THEN 1 END) as faltantes
    FROM (
        SELECT 
            c.table_name,
            c.column_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
            AND c.table_name IN ('guardias', 'clientes', 'usuarios', 'instalaciones')
            AND c.column_name IN ('created_at', 'estado', 'email', 'usuario_id', 'cliente_id')
    ) critical_columns
    LEFT JOIN pg_indexes pi ON critical_columns.table_name = pi.tablename 
        AND critical_columns.column_name = ANY(string_to_array(pi.indexdef, ' '))
)
SELECT 
    categoria,
    total,
    existentes,
    faltantes,
    CASE 
        WHEN faltantes = 0 THEN '✅ LISTO'
        WHEN faltantes <= total * 0.3 THEN '🟡 PARCIAL'
        ELSE '🔴 REQUIERE ATENCIÓN'
    END as estado
FROM verification_summary
ORDER BY 
    CASE categoria
        WHEN 'Tablas críticas' THEN 1
        WHEN 'Columnas problemáticas' THEN 2
        WHEN 'Índices faltantes' THEN 3
    END;

-- =====================================================
-- 9. RECOMENDACIONES FINALES
-- =====================================================

DO $$
DECLARE
    table_count INTEGER;
    problem_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Contar tablas faltantes
    SELECT COUNT(*) INTO table_count
    FROM (
        SELECT unnest(ARRAY[
            'asignaciones_guardias', 'guardias', 'clientes', 'usuarios', 'instalaciones'
        ]) as table_name
    ) required_tables
    LEFT JOIN information_schema.tables t ON required_tables.table_name = t.table_name
    WHERE t.table_name IS NULL;
    
    -- Contar columnas problemáticas
    SELECT COUNT(*) INTO problem_count
    FROM information_schema.columns 
    WHERE table_name = 'asignaciones_guardias' 
        AND column_name = 'guardia_id'
        AND data_type = 'integer';
    
    -- Contar índices faltantes críticos
    SELECT COUNT(*) INTO index_count
    FROM (
        SELECT 
            c.table_name,
            c.column_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
            AND c.table_name IN ('guardias', 'clientes', 'usuarios', 'instalaciones')
            AND c.column_name IN ('created_at', 'estado', 'email', 'usuario_id', 'cliente_id')
    ) critical_columns
    LEFT JOIN pg_indexes pi ON critical_columns.table_name = pi.tablename 
        AND critical_columns.column_name = ANY(string_to_array(pi.indexdef, ' '))
    WHERE pi.indexname IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'RECOMENDACIONES FINALES';
    RAISE NOTICE '=====================================================';
    
    IF table_count > 0 THEN
        RAISE NOTICE '❌ NO PROCEDER: Faltan % tablas críticas', table_count;
    ELSIF problem_count > 0 THEN
        RAISE NOTICE '🟡 PROCEDER CON PRECAUCIÓN: % columnas problemáticas detectadas', problem_count;
    ELSE
        RAISE NOTICE '✅ LISTO PARA PROCEDER: No se detectaron problemas críticos';
    END IF;
    
    IF index_count > 0 THEN
        RAISE NOTICE '📊 Se crearán % índices críticos durante la corrección', index_count;
    END IF;
    
    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- FIN DE VERIFICACIÓN PREVIA
-- ===================================================== 