-- =====================================================
-- ANÁLISIS DE RENDIMIENTO - GARDOPS
-- Fecha: 29 de Julio de 2025
-- Base de Datos: PostgreSQL (Neon)
-- =====================================================

-- IMPORTANTE: Ejecutar en entorno de desarrollo primero
-- Este script analiza el rendimiento de la base de datos

-- =====================================================
-- 1. ANÁLISIS DE ÍNDICES FALTANTES
-- =====================================================

-- Identificar columnas frecuentemente consultadas sin índices
WITH column_usage AS (
    SELECT 
        c.table_name,
        c.column_name,
        c.data_type,
        CASE 
            WHEN c.column_name LIKE '%id%' THEN 'LIKELY_FOREIGN_KEY'
            WHEN c.column_name LIKE '%created%' OR c.column_name LIKE '%creado%' THEN 'TIMESTAMP'
            WHEN c.column_name LIKE '%updated%' OR c.column_name LIKE '%modificado%' THEN 'TIMESTAMP'
            WHEN c.column_name LIKE '%status%' OR c.column_name LIKE '%estado%' THEN 'STATUS'
            WHEN c.column_name LIKE '%name%' OR c.column_name LIKE '%nombre%' THEN 'NAME'
            ELSE 'OTHER'
        END as column_type
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
        AND c.table_name IN (
            'usuarios', 'clientes', 'instalaciones', 'guardias',
            'pautas_diarias', 'pautas_mensuales', 'planillas',
            'documentos', 'asignaciones_guardias'
        )
),
missing_indexes AS (
    SELECT 
        cu.table_name,
        cu.column_name,
        cu.data_type,
        cu.column_type,
        CASE 
            WHEN cu.column_type = 'LIKELY_FOREIGN_KEY' THEN 'ALTA'
            WHEN cu.column_type = 'TIMESTAMP' THEN 'MEDIA'
            WHEN cu.column_type = 'STATUS' THEN 'ALTA'
            WHEN cu.column_type = 'NAME' THEN 'MEDIA'
            ELSE 'BAJA'
        END as prioridad
    FROM column_usage cu
    LEFT JOIN pg_indexes pi ON cu.table_name = pi.tablename 
        AND cu.column_name = ANY(string_to_array(pi.indexdef, ' '))
    WHERE pi.indexname IS NULL
)
SELECT 
    table_name,
    column_name,
    data_type,
    column_type,
    prioridad,
    CASE 
        WHEN prioridad = 'ALTA' THEN 'CREATE INDEX idx_' || table_name || '_' || column_name || ' ON ' || table_name || '(' || column_name || ');'
        WHEN prioridad = 'MEDIA' THEN '-- CREATE INDEX idx_' || table_name || '_' || column_name || ' ON ' || table_name || '(' || column_name || ');'
        ELSE '-- Considerar índice para ' || table_name || '.' || column_name
    END as recomendacion
FROM missing_indexes
ORDER BY 
    CASE prioridad 
        WHEN 'ALTA' THEN 1 
        WHEN 'MEDIA' THEN 2 
        ELSE 3 
    END,
    table_name, column_name;

-- =====================================================
-- 2. ANÁLISIS DE CONSULTAS LENTAS
-- =====================================================

-- Simular consultas comunes y analizar su rendimiento
-- (Esto requiere que pg_stat_statements esté habilitado)

-- Consulta 1: Búsqueda de usuarios por cliente
EXPLAIN (ANALYZE, BUFFERS) 
SELECT u.*, c.nombre as cliente_nombre
FROM usuarios u
JOIN clientes c ON u.cliente_id = c.id
WHERE c.id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY u.nombre;

-- Consulta 2: Pautas diarias por instalación
EXPLAIN (ANALYZE, BUFFERS)
SELECT pd.*, i.nombre as instalacion_nombre
FROM pautas_diarias pd
JOIN instalaciones i ON pd.instalacion_id = i.id
WHERE pd.fecha BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY pd.fecha DESC;

-- Consulta 3: Guardias por estado
EXPLAIN (ANALYZE, BUFFERS)
SELECT g.*, u.nombre as usuario_nombre
FROM guardias g
JOIN usuarios u ON g.usuario_id = u.id
WHERE g.estado = 'activo'
ORDER BY g.created_at DESC;

-- =====================================================
-- 3. ANÁLISIS DE FRAGMENTACIÓN
-- =====================================================

-- Verificar fragmentación de tablas
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
    AND tablename IN (
        'usuarios', 'clientes', 'instalaciones', 'guardias',
        'pautas_diarias', 'pautas_mensuales', 'planillas'
    )
ORDER BY tablename, attname;

-- =====================================================
-- 4. ANÁLISIS DE TAMAÑO DE TABLAS
-- =====================================================

-- Calcular tamaño de tablas y índices
SELECT 
    t.table_name,
    pg_size_pretty(pg_total_relation_size(t.table_name::regclass)) as tamaño_total,
    pg_size_pretty(pg_relation_size(t.table_name::regclass)) as tamaño_tabla,
    pg_size_pretty(pg_total_relation_size(t.table_name::regclass) - pg_relation_size(t.table_name::regclass)) as tamaño_indices,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columnas,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = t.table_name) as indices
FROM information_schema.tables t
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY pg_total_relation_size(t.table_name::regclass) DESC;

-- =====================================================
-- 5. RECOMENDACIONES DE OPTIMIZACIÓN
-- =====================================================

-- Generar recomendaciones automáticas
WITH table_stats AS (
    SELECT 
        t.table_name,
        COUNT(c.column_name) as total_columns,
        COUNT(CASE WHEN c.column_name LIKE '%id%' THEN 1 END) as id_columns,
        COUNT(CASE WHEN c.column_name LIKE '%created%' OR c.column_name LIKE '%creado%' THEN 1 END) as timestamp_columns,
        pg_total_relation_size(t.table_name::regclass) as table_size
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name, t.table_name::regclass
)
SELECT 
    table_name,
    total_columns,
    id_columns,
    timestamp_columns,
    pg_size_pretty(table_size) as tamaño,
    CASE 
        WHEN table_size > 100000000 THEN 'GRANDE - Considerar particionamiento'
        WHEN table_size > 10000000 THEN 'MEDIANA - Optimizar índices'
        ELSE 'PEQUEÑA - OK'
    END as recomendacion_tamaño,
    CASE 
        WHEN id_columns > 0 THEN 'Crear índices en columnas ID'
        ELSE 'Sin columnas ID identificadas'
    END as recomendacion_indices,
    CASE 
        WHEN timestamp_columns > 0 THEN 'Crear índices en timestamps'
        ELSE 'Sin timestamps identificados'
    END as recomendacion_timestamps
FROM table_stats
ORDER BY table_size DESC;

-- =====================================================
-- 6. ANÁLISIS DE CONCURRENCIA
-- =====================================================

-- Verificar bloqueos activos
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    query
FROM pg_stat_activity 
WHERE state != 'idle'
    AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start;

-- =====================================================
-- 7. RESUMEN DE OPTIMIZACIONES RECOMENDADAS
-- =====================================================

-- Generar resumen ejecutivo
SELECT 
    'RESUMEN DE OPTIMIZACIONES' as seccion,
    'Total de tablas analizadas: ' || COUNT(*) as metricas
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    'Índices faltantes críticos',
    COUNT(*)::text
FROM (
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    LEFT JOIN pg_indexes pi ON c.table_name = pi.tablename 
        AND c.column_name = ANY(string_to_array(pi.indexdef, ' '))
    WHERE c.table_schema = 'public'
        AND pi.indexname IS NULL
        AND (c.column_name LIKE '%id%' OR c.column_name LIKE '%created%' OR c.column_name LIKE '%creado%')
) as missing_critical;

-- =====================================================
-- FIN DEL ANÁLISIS
-- ===================================================== 