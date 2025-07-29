-- =====================================================
-- SCRIPT DE CORRECCIONES CRÍTICAS - GARDOPS
-- Fecha: 29 de Julio de 2025
-- Base de Datos: PostgreSQL (Neon)
-- =====================================================

-- ⚠️  IMPORTANTE: 
-- 1. Ejecutar en entorno de desarrollo primero
-- 2. Hacer backup completo antes de ejecutar
-- 3. Verificar cada paso antes de continuar

BEGIN;

-- =====================================================
-- 1. VERIFICACIÓN PREVIA DE DATOS
-- =====================================================

-- Verificar datos existentes en asignaciones_guardias antes de la migración
DO $$
DECLARE
    record_count INTEGER;
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count FROM asignaciones_guardias;
    SELECT COUNT(*) INTO null_count FROM asignaciones_guardias WHERE guardia_id IS NULL;
    
    RAISE NOTICE 'Verificación previa: % registros totales, % registros con guardia_id NULL', record_count, null_count;
    
    IF record_count > 0 THEN
        RAISE NOTICE '⚠️  ADVERTENCIA: La tabla asignaciones_guardias tiene datos. Verificar antes de continuar.';
    END IF;
END $$;

-- =====================================================
-- 2. CORRECCIÓN CRÍTICA: asignaciones_guardias.guardia_id
-- =====================================================

-- Verificar el tipo actual de la columna
DO $$
DECLARE
    current_type TEXT;
BEGIN
    SELECT data_type INTO current_type 
    FROM information_schema.columns 
    WHERE table_name = 'asignaciones_guardias' 
        AND column_name = 'guardia_id';
    
    RAISE NOTICE 'Tipo actual de guardia_id: %', current_type;
    
    IF current_type = 'integer' THEN
        RAISE NOTICE '🔄 Iniciando migración de integer a UUID...';
        
        -- Cambiar tipo de integer a UUID
        ALTER TABLE asignaciones_guardias 
        ALTER COLUMN guardia_id TYPE UUID USING guardia_id::uuid;
        
        RAISE NOTICE '✅ Migración completada exitosamente';
    ELSE
        RAISE NOTICE 'ℹ️  La columna ya es de tipo UUID o no existe';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error en migración: %', SQLERRM;
        RAISE;
END $$;

-- =====================================================
-- 3. LIMPIEZA DE CAMPOS LEGACY
-- =====================================================

-- Eliminar campo huérfano legacy_id de guardias si existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guardias' 
            AND column_name = 'legacy_id'
    ) THEN
        ALTER TABLE guardias DROP COLUMN legacy_id;
        RAISE NOTICE '✅ Campo legacy_id eliminado de guardias';
    ELSE
        RAISE NOTICE 'ℹ️  Campo legacy_id no existe en guardias';
    END IF;
END $$;

-- =====================================================
-- 4. NORMALIZACIÓN DE TIMESTAMPS
-- =====================================================

-- Función para normalizar timestamps en una tabla
CREATE OR REPLACE FUNCTION normalize_timestamps(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Cambiar modificado_en → updated_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = normalize_timestamps.table_name 
            AND column_name = 'modificado_en'
    ) THEN
        EXECUTE format('ALTER TABLE %I RENAME COLUMN modificado_en TO updated_at', table_name);
        RAISE NOTICE '✅ %: modificado_en → updated_at', table_name;
    END IF;
    
    -- Cambiar creado_en → created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = normalize_timestamps.table_name 
            AND column_name = 'creado_en'
    ) THEN
        EXECUTE format('ALTER TABLE %I RENAME COLUMN creado_en TO created_at', table_name);
        RAISE NOTICE '✅ %: creado_en → created_at', table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar normalización a todas las tablas afectadas
SELECT normalize_timestamps(table_name) 
FROM (
    VALUES 
        ('tipos_documentos'),
        ('planillas'),
        ('pautas_diarias'),
        ('pautas_mensuales'),
        ('turnos_extras'),
        ('documentos'),
        ('rondas'),
        ('usuarios_permisos'),
        ('planillas_pago')
) AS tables(table_name);

-- Limpiar función temporal
DROP FUNCTION normalize_timestamps(TEXT);

-- =====================================================
-- 5. CREACIÓN DE ÍNDICES CRÍTICOS
-- =====================================================

-- Índices para fechas (alta prioridad)
CREATE INDEX IF NOT EXISTS idx_documentos_fecha_vencimiento 
ON documentos_clientes (fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_guardias_created_at 
ON guardias (created_at);

CREATE INDEX IF NOT EXISTS idx_instalaciones_created_at 
ON instalaciones (created_at);

CREATE INDEX IF NOT EXISTS idx_usuarios_created_at 
ON usuarios (created_at);

CREATE INDEX IF NOT EXISTS idx_clientes_created_at 
ON clientes (created_at);

-- Índices para búsqueda frecuente (alta prioridad)
CREATE INDEX IF NOT EXISTS idx_guardias_email 
ON guardias (email);

CREATE INDEX IF NOT EXISTS idx_guardias_telefono 
ON guardias (telefono);

CREATE INDEX IF NOT EXISTS idx_guardias_estado 
ON guardias (estado);

CREATE INDEX IF NOT EXISTS idx_clientes_estado 
ON clientes (estado);

CREATE INDEX IF NOT EXISTS idx_usuarios_estado 
ON usuarios (estado);

CREATE INDEX IF NOT EXISTS idx_instalaciones_estado 
ON instalaciones (estado);

-- Índices para claves foráneas (alta prioridad)
CREATE INDEX IF NOT EXISTS idx_guardias_usuario_id 
ON guardias (usuario_id);

CREATE INDEX IF NOT EXISTS idx_guardias_cliente_id 
ON guardias (cliente_id);

CREATE INDEX IF NOT EXISTS idx_instalaciones_cliente_id 
ON instalaciones (cliente_id);

CREATE INDEX IF NOT EXISTS idx_usuarios_cliente_id 
ON usuarios (cliente_id);

CREATE INDEX IF NOT EXISTS idx_pautas_diarias_instalacion_id 
ON pautas_diarias (instalacion_id);

CREATE INDEX IF NOT EXISTS idx_pautas_diarias_fecha 
ON pautas_diarias (fecha);

-- Índices para nombres y búsquedas (media prioridad)
CREATE INDEX IF NOT EXISTS idx_guardias_nombre 
ON guardias (nombre);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre 
ON clientes (nombre);

CREATE INDEX IF NOT EXISTS idx_instalaciones_nombre 
ON instalaciones (nombre);

CREATE INDEX IF NOT EXISTS idx_usuarios_nombre 
ON usuarios (nombre);

-- =====================================================
-- 6. VERIFICACIÓN DE DOCUMENTOS_INSTALACION
-- =====================================================

-- Verificar si la tabla documentos_instalacion existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'documentos_instalacion'
    ) THEN
        RAISE NOTICE '✅ Tabla documentos_instalacion existe';
        
        -- Verificar si hay datos
        IF EXISTS (SELECT 1 FROM documentos_instalacion LIMIT 1) THEN
            RAISE NOTICE 'ℹ️  La tabla documentos_instalacion ya tiene datos';
        ELSE
            RAISE NOTICE '📝 Insertando documento de prueba...';
            
            -- Insertar documento de prueba
            INSERT INTO documentos_instalacion (
                id, 
                instalacion_id, 
                nombre, 
                tipo_documento_id, 
                contenido_archivo, 
                fecha_vencimiento
            )
            VALUES (
                gen_random_uuid(),
                (SELECT id FROM instalaciones LIMIT 1),
                'Manual de acceso - Documento de prueba',
                (SELECT id FROM tipos_documentos WHERE nombre ILIKE '%manual%' LIMIT 1),
                decode('dGVzdCBmaWxlIGNvbnRlbnQgZGUgcHJ1ZWJh', 'base64'),
                NOW() + interval '90 days'
            );
            
            RAISE NOTICE '✅ Documento de prueba insertado';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  La tabla documentos_instalacion no existe';
    END IF;
END $$;

-- =====================================================
-- 7. VERIFICACIÓN POST-EJECUCIÓN
-- =====================================================

-- Verificar que los cambios se aplicaron correctamente
DO $$
DECLARE
    guardia_id_type TEXT;
    index_count INTEGER;
BEGIN
    -- Verificar tipo de guardia_id
    SELECT data_type INTO guardia_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'asignaciones_guardias' 
        AND column_name = 'guardia_id';
    
    RAISE NOTICE 'Tipo final de guardia_id: %', guardia_id_type;
    
    -- Contar índices creados
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE indexname LIKE 'idx_%' 
        AND tablename IN ('guardias', 'clientes', 'usuarios', 'instalaciones');
    
    RAISE NOTICE 'Total de índices críticos creados: %', index_count;
    
    -- Verificar normalización de timestamps
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tipos_documentos' 
            AND column_name = 'created_at'
    ) THEN
        RAISE NOTICE '✅ Normalización de timestamps completada';
    ELSE
        RAISE NOTICE '⚠️  Verificar normalización de timestamps';
    END IF;
END $$;

-- =====================================================
-- 8. RESUMEN DE CAMBIOS APLICADOS
-- =====================================================

SELECT 
    'RESUMEN DE CORRECCIONES APLICADAS' as seccion,
    'Cambios completados exitosamente' as estado

UNION ALL

SELECT 
    'Tipo de datos corregidos',
    COUNT(*)::text
FROM information_schema.columns 
WHERE table_name = 'asignaciones_guardias' 
    AND column_name = 'guardia_id' 
    AND data_type = 'uuid'

UNION ALL

SELECT 
    'Índices críticos creados',
    COUNT(*)::text
FROM pg_indexes 
WHERE indexname LIKE 'idx_%' 
    AND tablename IN ('guardias', 'clientes', 'usuarios', 'instalaciones', 'documentos_clientes', 'pautas_diarias');

-- =====================================================
-- FIN DE CORRECCIONES CRÍTICAS
-- =====================================================

COMMIT;

RAISE NOTICE '🎉 Correcciones críticas completadas exitosamente!';
RAISE NOTICE '📊 Revisar el resumen anterior para verificar los cambios aplicados.'; 