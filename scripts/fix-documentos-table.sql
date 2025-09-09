-- Script para corregir la tabla documentos y agregar columnas faltantes
-- Ejecutar en Neon/PostgreSQL

-- 1. Verificar la estructura actual de la tabla documentos
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documentos' 
ORDER BY ordinal_position;

-- 2. Agregar columna cliente_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos' AND column_name = 'cliente_id'
    ) THEN
        ALTER TABLE documentos ADD COLUMN cliente_id UUID;
        RAISE NOTICE 'Columna cliente_id agregada';
    ELSE
        RAISE NOTICE 'Columna cliente_id ya existe';
    END IF;
END $$;

-- 3. Agregar columna guardia_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos' AND column_name = 'guardia_id'
    ) THEN
        ALTER TABLE documentos ADD COLUMN guardia_id UUID;
        RAISE NOTICE 'Columna guardia_id agregada';
    ELSE
        RAISE NOTICE 'Columna guardia_id ya existe';
    END IF;
END $$;

-- 4. Agregar columna instalacion_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos' AND column_name = 'instalacion_id'
    ) THEN
        ALTER TABLE documentos ADD COLUMN instalacion_id UUID;
        RAISE NOTICE 'Columna instalacion_id agregada';
    ELSE
        RAISE NOTICE 'Columna instalacion_id ya existe';
    END IF;
END $$;

-- 5. Agregar columna tipo_documento_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos' AND column_name = 'tipo_documento_id'
    ) THEN
        ALTER TABLE documentos ADD COLUMN tipo_documento_id UUID;
        RAISE NOTICE 'Columna tipo_documento_id agregada';
    ELSE
        RAISE NOTICE 'Columna tipo_documento_id ya existe';
    END IF;
END $$;

-- 6. Agregar columna fecha_vencimiento si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos' AND column_name = 'fecha_vencimiento'
    ) THEN
        ALTER TABLE documentos ADD COLUMN fecha_vencimiento DATE;
        RAISE NOTICE 'Columna fecha_vencimiento agregada';
    ELSE
        RAISE NOTICE 'Columna fecha_vencimiento ya existe';
    END IF;
END $$;

-- 7. Verificar la estructura final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documentos' 
ORDER BY ordinal_position;

-- 8. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_documentos_cliente_id ON documentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_guardia_id ON documentos(guardia_id);
CREATE INDEX IF NOT EXISTS idx_documentos_instalacion_id ON documentos(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo_documento_id ON documentos(tipo_documento_id);

-- 9. Verificar que los índices se crearon
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'documentos';
