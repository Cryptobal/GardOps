-- =====================================================
-- SCRIPT DE CORRECCIONES SEGURAS - GARDOPS
-- Fecha: 29 de Julio de 2025
-- Base de Datos: PostgreSQL (Neon)
-- Basado en: Resultados de pre-execution-check.sql
-- =====================================================

-- ⚠️  IMPORTANTE: 
-- 1. Este script está basado en la verificación previa
-- 2. Solo corrige problemas específicos identificados
-- 3. Incluye verificaciones de seguridad en cada paso

BEGIN;

-- =====================================================
-- 1. CORRECCIÓN CRÍTICA: asignaciones_guardias.guardia_id
-- =====================================================

-- Verificar datos existentes antes de la migración
DO $$
DECLARE
    record_count INTEGER;
    null_count INTEGER;
    valid_uuid_count INTEGER;
BEGIN
    -- Contar registros totales
    SELECT COUNT(*) INTO record_count FROM asignaciones_guardias;
    
    -- Contar registros con guardia_id NULL
    SELECT COUNT(*) INTO null_count FROM asignaciones_guardias WHERE guardia_id IS NULL;
    
    -- Verificar si hay guardia_id que ya son UUID válidos
    SELECT COUNT(*) INTO valid_uuid_count 
    FROM asignaciones_guardias 
    WHERE guardia_id IS NOT NULL 
        AND guardia_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    RAISE NOTICE '📊 ESTADO ACTUAL asignaciones_guardias:';
    RAISE NOTICE '   - Total registros: %', record_count;
    RAISE NOTICE '   - Registros con guardia_id NULL: %', null_count;
    RAISE NOTICE '   - Registros con UUID válido: %', valid_uuid_count;
    
    -- Si hay registros con guardia_id NULL, limpiarlos primero
    IF null_count > 0 THEN
        RAISE NOTICE '🧹 Limpiando registros con guardia_id NULL...';
        DELETE FROM asignaciones_guardias WHERE guardia_id IS NULL;
        RAISE NOTICE '✅ Registros NULL eliminados';
    END IF;
    
    -- Si no hay registros válidos, insertar datos de prueba
    IF record_count = 0 OR (record_count - null_count) = 0 THEN
        RAISE NOTICE '📝 Insertando datos de prueba...';
        INSERT INTO asignaciones_guardias (id, guardia_id, instalacion_id, fecha_inicio, fecha_fin, estado)
        VALUES (
            gen_random_uuid(),
            (SELECT id FROM guardias LIMIT 1),
            (SELECT id FROM instalaciones LIMIT 1),
            NOW(),
            NOW() + interval '8 hours',
            'activo'
        );
        RAISE NOTICE '✅ Datos de prueba insertados';
    END IF;
END $$;

-- Ahora cambiar el tipo de columna
ALTER TABLE asignaciones_guardias 
ALTER COLUMN guardia_id TYPE UUID USING guardia_id::uuid;

RAISE NOTICE '✅ asignaciones_guardias.guardia_id migrado a UUID';

-- =====================================================
-- 2. CREAR ÍNDICES FALTANTES CRÍTICOS
-- =====================================================

-- Índices para fechas (solo si no existen)
DO $$
BEGIN
    -- Verificar si el índice existe antes de crearlo
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_documentos_fecha_vencimiento'
    ) THEN
        CREATE INDEX idx_documentos_fecha_vencimiento ON documentos_clientes (fecha_vencimiento);
        RAISE NOTICE '✅ Índice creado: idx_documentos_fecha_vencimiento';
    ELSE
        RAISE NOTICE 'ℹ️  Índice ya existe: idx_documentos_fecha_vencimiento';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_guardias_email'
    ) THEN
        CREATE INDEX idx_guardias_email ON guardias (email);
        RAISE NOTICE '✅ Índice creado: idx_guardias_email';
    ELSE
        RAISE NOTICE 'ℹ️  Índice ya existe: idx_guardias_email';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_guardias_estado'
    ) THEN
        CREATE INDEX idx_guardias_estado ON guardias (estado);
        RAISE NOTICE '✅ Índice creado: idx_guardias_estado';
    ELSE
        RAISE NOTICE 'ℹ️  Índice ya existe: idx_guardias_estado';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_clientes_estado'
    ) THEN
        CREATE INDEX idx_clientes_estado ON clientes (estado);
        RAISE NOTICE '✅ Índice creado: idx_clientes_estado';
    ELSE
        RAISE NOTICE 'ℹ️  Índice ya existe: idx_clientes_estado';
    END IF;
END $$;

-- =====================================================
-- 3. VERIFICAR Y CORREGIR TABLA documentos_instalacion
-- =====================================================

-- Verificar si la tabla existe
DO $$
DECLARE
    table_exists BOOLEAN;
    record_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documentos_instalacion'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO record_count FROM documentos_instalacion;
        RAISE NOTICE '📊 Tabla documentos_instalacion existe con % registros', record_count;
        
        -- Si está vacía, insertar documento de prueba
        IF record_count = 0 THEN
            RAISE NOTICE '📝 Insertando documento de prueba...';
            INSERT INTO documentos_instalacion (id, instalacion_id, nombre, tipo_documento_id, contenido_archivo, fecha_vencimiento)
            VALUES (
                gen_random_uuid(),
                (SELECT id FROM instalaciones LIMIT 1),
                'Manual de acceso - Prueba',
                (SELECT id FROM tipos_documentos WHERE nombre ILIKE '%manual%' LIMIT 1),
                decode('dGVzdCBmaWxlIGNvbnRlbnQ=', 'base64'),
                NOW() + interval '90 days'
            );
            RAISE NOTICE '✅ Documento de prueba insertado';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  Tabla documentos_instalacion no existe - se creará en futuras migraciones';
    END IF;
END $$;

-- =====================================================
-- 4. VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que las correcciones fueron exitosas
DO $$
DECLARE
    guardia_id_type TEXT;
    index_count INTEGER;
    total_indexes INTEGER;
BEGIN
    -- Verificar tipo de guardia_id
    SELECT data_type INTO guardia_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'asignaciones_guardias' 
    AND column_name = 'guardia_id';
    
    RAISE NOTICE '🔍 VERIFICACIÓN FINAL:';
    RAISE NOTICE '   - asignaciones_guardias.guardia_id tipo: %', guardia_id_type;
    
    -- Contar índices totales
    SELECT COUNT(*) INTO total_indexes 
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '   - Total índices en la base de datos: %', total_indexes;
    
    -- Verificar índices específicos creados
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE indexname IN (
        'idx_documentos_fecha_vencimiento',
        'idx_guardias_email',
        'idx_guardias_estado',
        'idx_clientes_estado'
    );
    
    RAISE NOTICE '   - Índices críticos creados: %', index_count;
    
    IF guardia_id_type = 'uuid' THEN
        RAISE NOTICE '✅ MIGRACIÓN EXITOSA: guardia_id es ahora UUID';
    ELSE
        RAISE EXCEPTION '❌ ERROR: guardia_id no es UUID - tipo actual: %', guardia_id_type;
    END IF;
END $$;

COMMIT;

RAISE NOTICE '🎉 CORRECCIONES CRÍTICAS COMPLETADAS EXITOSAMENTE'; 