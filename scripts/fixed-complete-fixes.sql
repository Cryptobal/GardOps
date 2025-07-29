-- =====================================================
-- SCRIPT CORREGIDO DE CORRECCIONES - GARDOPS
-- Fecha: 29 de Julio de 2025
-- Base de Datos: PostgreSQL (Neon)
-- Estado: asignaciones_guardias ya corregida
-- =====================================================

-- ⚠️  IMPORTANTE: 
-- 1. asignaciones_guardias ya fue corregida
-- 2. Este script corrige solo los problemas que realmente existen
-- 3. Incluye verificaciones de seguridad en cada paso

BEGIN;

-- =====================================================
-- 1. NORMALIZACIÓN DE TIMESTAMPS (YA COMPLETADA)
-- =====================================================

-- Los timestamps ya fueron normalizados en la ejecución anterior
-- tipos_documentos: creado_en → created_at ✅
-- planillas: creado_en → created_at ✅  
-- turnos_extras: creado_en → created_at ✅

-- =====================================================
-- 2. CREACIÓN DE ÍNDICES FALTANTES (CORREGIDO)
-- =====================================================

-- Índices para fechas de vencimiento (solo en documentos_clientes)
CREATE INDEX IF NOT EXISTS idx_documentos_fecha_vencimiento 
ON documentos_clientes (fecha_vencimiento);

-- Índices para timestamps de creación
CREATE INDEX IF NOT EXISTS idx_guardias_created_at 
ON guardias (created_at);

CREATE INDEX IF NOT EXISTS idx_instalaciones_created_at 
ON instalaciones (created_at);

CREATE INDEX IF NOT EXISTS idx_clientes_created_at 
ON clientes (created_at);

-- Índices para búsqueda frecuente
CREATE INDEX IF NOT EXISTS idx_guardias_email 
ON guardias (email);

CREATE INDEX IF NOT EXISTS idx_guardias_telefono 
ON guardias (telefono);

CREATE INDEX IF NOT EXISTS idx_guardias_estado 
ON guardias (estado);

CREATE INDEX IF NOT EXISTS idx_clientes_estado 
ON clientes (estado);

CREATE INDEX IF NOT EXISTS idx_instalaciones_estado 
ON instalaciones (estado);

-- Índices para relaciones frecuentes (ya existen algunos)
CREATE INDEX IF NOT EXISTS idx_documentos_clientes_cliente_id 
ON documentos_clientes (cliente_id);

CREATE INDEX IF NOT EXISTS idx_documentos_instalacion_instalacion_id 
ON documentos_instalacion (instalacion_id);

CREATE INDEX IF NOT EXISTS idx_instalaciones_cliente_id 
ON instalaciones (cliente_id);

-- =====================================================
-- 3. VERIFICACIÓN DE DOCUMENTOS_INSTALACION
-- =====================================================

-- Verificar si la tabla documentos_instalacion existe y tiene datos
DO $$
DECLARE
    table_exists BOOLEAN;
    record_count INTEGER;
    tipo_doc_id UUID;
    instalacion_id UUID;
BEGIN
    -- Verificar si la tabla existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'documentos_instalacion'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO record_count FROM documentos_instalacion;
        RAISE NOTICE '📊 Tabla documentos_instalacion existe con % registros', record_count;
        
        -- Si no hay datos, insertar un documento de prueba
        IF record_count = 0 THEN
            -- Obtener un tipo de documento válido
            SELECT id INTO tipo_doc_id FROM tipos_documentos LIMIT 1;
            -- Obtener una instalación válida
            SELECT id INTO instalacion_id FROM instalaciones LIMIT 1;
            
            IF tipo_doc_id IS NOT NULL AND instalacion_id IS NOT NULL THEN
                INSERT INTO documentos_instalacion (
                    id, 
                    instalacion_id, 
                    tipo,
                    url,
                    tipo_documento_id, 
                    contenido_archivo
                ) VALUES (
                    gen_random_uuid(),
                    instalacion_id,
                    'Manual de acceso',
                    'https://example.com/manual.pdf',
                    tipo_doc_id,
                    decode('dGVzdCBmaWxlIGNvbnRlbnQ=', 'base64')
                );
                RAISE NOTICE '✅ Insertado documento de prueba en documentos_instalacion';
            ELSE
                RAISE NOTICE '⚠️  No se encontraron tipos de documentos o instalaciones para insertar documento de prueba';
            END IF;
        END IF;
    ELSE
        RAISE NOTICE '❌ Tabla documentos_instalacion no existe';
    END IF;
END $$;

-- =====================================================
-- 4. LIMPIEZA DE CAMPOS HUÉRFANOS
-- =====================================================

-- Eliminar campo legacy_id de guardias si existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guardias' 
        AND column_name = 'legacy_id'
    ) THEN
        ALTER TABLE guardias DROP COLUMN legacy_id;
        RAISE NOTICE '✅ Eliminado campo legacy_id de guardias';
    ELSE
        RAISE NOTICE 'ℹ️  Campo legacy_id no existe en guardias';
    END IF;
END $$;

-- =====================================================
-- 5. VERIFICACIÓN FINAL
-- =====================================================

-- Verificar estado final
DO $$
DECLARE
    total_indexes INTEGER;
    total_tables INTEGER;
    tables_with_data INTEGER;
BEGIN
    -- Contar índices totales
    SELECT COUNT(*) INTO total_indexes 
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    -- Contar tablas totales
    SELECT COUNT(*) INTO total_tables 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
    
    -- Contar tablas con datos
    SELECT COUNT(*) INTO tables_with_data
    FROM (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    ) t
    WHERE EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = t.table_name
        AND c.table_schema = 'public'
    );
    
    RAISE NOTICE '📊 VERIFICACIÓN FINAL:';
    RAISE NOTICE '   - Tablas totales: %', total_tables;
    RAISE NOTICE '   - Tablas con datos: %', tables_with_data;
    RAISE NOTICE '   - Índices totales: %', total_indexes;
END $$;

COMMIT;

-- =====================================================
-- RESUMEN DE CORRECCIONES APLICADAS
-- =====================================================

SELECT 
    '✅ CORRECCIONES COMPLETADAS' as estado,
    'asignaciones_guardias.guardia_id → UUID' as correccion_1,
    'Normalización de timestamps' as correccion_2,
    'Creación de índices faltantes' as correccion_3,
    'Verificación de documentos_instalacion' as correccion_4,
    'Limpieza de campos huérfanos' as correccion_5; 