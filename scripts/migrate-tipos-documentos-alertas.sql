-- =====================================================
-- MIGRACIÓN: SISTEMA DE TIPOS DE DOCUMENTOS Y ALERTAS
-- =====================================================
-- Fecha: 29 de Julio de 2025
-- Propósito: Asegurar que todas las tablas de documentos tengan los campos necesarios
-- para el sistema de tipos de documentos y alertas de vencimiento

-- =====================================================
-- 1. VERIFICAR Y AGREGAR CAMPOS A TIPOS_DOCUMENTOS
-- =====================================================

-- Verificar si existen los campos de vencimiento en tipos_documentos
DO $$
BEGIN
    -- Agregar requiere_vencimiento si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tipos_documentos' 
        AND column_name = 'requiere_vencimiento'
    ) THEN
        ALTER TABLE tipos_documentos ADD COLUMN requiere_vencimiento BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Columna requiere_vencimiento agregada a tipos_documentos';
    ELSE
        RAISE NOTICE 'ℹ️ Columna requiere_vencimiento ya existe en tipos_documentos';
    END IF;

    -- Agregar dias_antes_alarma si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tipos_documentos' 
        AND column_name = 'dias_antes_alarma'
    ) THEN
        ALTER TABLE tipos_documentos ADD COLUMN dias_antes_alarma INTEGER DEFAULT 30;
        RAISE NOTICE '✅ Columna dias_antes_alarma agregada a tipos_documentos';
    ELSE
        RAISE NOTICE 'ℹ️ Columna dias_antes_alarma ya existe en tipos_documentos';
    END IF;

    -- Agregar activo si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tipos_documentos' 
        AND column_name = 'activo'
    ) THEN
        ALTER TABLE tipos_documentos ADD COLUMN activo BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Columna activo agregada a tipos_documentos';
    ELSE
        RAISE NOTICE 'ℹ️ Columna activo ya existe en tipos_documentos';
    END IF;
END $$;

-- =====================================================
-- 2. VERIFICAR Y AGREGAR CAMPOS A DOCUMENTOS_CLIENTES
-- =====================================================

DO $$
BEGIN
    -- Agregar tipo_documento_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos_clientes' 
        AND column_name = 'tipo_documento_id'
    ) THEN
        ALTER TABLE documentos_clientes ADD COLUMN tipo_documento_id UUID REFERENCES tipos_documentos(id);
        RAISE NOTICE '✅ Columna tipo_documento_id agregada a documentos_clientes';
    ELSE
        RAISE NOTICE 'ℹ️ Columna tipo_documento_id ya existe en documentos_clientes';
    END IF;

    -- Agregar fecha_vencimiento si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos_clientes' 
        AND column_name = 'fecha_vencimiento'
    ) THEN
        ALTER TABLE documentos_clientes ADD COLUMN fecha_vencimiento DATE;
        RAISE NOTICE '✅ Columna fecha_vencimiento agregada a documentos_clientes';
    ELSE
        RAISE NOTICE 'ℹ️ Columna fecha_vencimiento ya existe en documentos_clientes';
    END IF;
END $$;

-- =====================================================
-- 3. VERIFICAR Y AGREGAR CAMPOS A DOCUMENTOS_INSTALACION
-- =====================================================

DO $$
BEGIN
    -- Agregar tipo_documento_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos_instalacion' 
        AND column_name = 'tipo_documento_id'
    ) THEN
        ALTER TABLE documentos_instalacion ADD COLUMN tipo_documento_id UUID REFERENCES tipos_documentos(id);
        RAISE NOTICE '✅ Columna tipo_documento_id agregada a documentos_instalacion';
    ELSE
        RAISE NOTICE 'ℹ️ Columna tipo_documento_id ya existe en documentos_instalacion';
    END IF;

    -- Agregar fecha_vencimiento si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos_instalacion' 
        AND column_name = 'fecha_vencimiento'
    ) THEN
        ALTER TABLE documentos_instalacion ADD COLUMN fecha_vencimiento DATE;
        RAISE NOTICE '✅ Columna fecha_vencimiento agregada a documentos_instalacion';
    ELSE
        RAISE NOTICE 'ℹ️ Columna fecha_vencimiento ya existe en documentos_instalacion';
    END IF;
END $$;

-- =====================================================
-- 4. VERIFICAR Y AGREGAR CAMPOS A DOCUMENTOS_GUARDIAS
-- =====================================================

DO $$
BEGIN
    -- Agregar tipo_documento_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos_guardias' 
        AND column_name = 'tipo_documento_id'
    ) THEN
        ALTER TABLE documentos_guardias ADD COLUMN tipo_documento_id UUID REFERENCES tipos_documentos(id);
        RAISE NOTICE '✅ Columna tipo_documento_id agregada a documentos_guardias';
    ELSE
        RAISE NOTICE 'ℹ️ Columna tipo_documento_id ya existe en documentos_guardias';
    END IF;

    -- Agregar fecha_vencimiento si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos_guardias' 
        AND column_name = 'fecha_vencimiento'
    ) THEN
        ALTER TABLE documentos_guardias ADD COLUMN fecha_vencimiento DATE;
        RAISE NOTICE '✅ Columna fecha_vencimiento agregada a documentos_guardias';
    ELSE
        RAISE NOTICE 'ℹ️ Columna fecha_vencimiento ya existe en documentos_guardias';
    END IF;
END $$;

-- =====================================================
-- 5. INSERTAR TIPOS DE DOCUMENTOS BÁSICOS SI NO EXISTEN
-- =====================================================

-- Insertar tipos de documentos para clientes
INSERT INTO tipos_documentos (id, modulo, nombre, requiere_vencimiento, dias_antes_alarma, activo, creado_en)
VALUES 
    (gen_random_uuid(), 'clientes', 'Contrato de Servicio', true, 30, true, NOW()),
    (gen_random_uuid(), 'clientes', 'Certificado de Seguridad', true, 60, true, NOW()),
    (gen_random_uuid(), 'clientes', 'Póliza de Seguros', true, 45, true, NOW()),
    (gen_random_uuid(), 'clientes', 'Documentación Fiscal', false, 30, true, NOW())
ON CONFLICT DO NOTHING;

-- Insertar tipos de documentos para instalaciones
INSERT INTO tipos_documentos (id, modulo, nombre, requiere_vencimiento, dias_antes_alarma, activo, creado_en)
VALUES 
    (gen_random_uuid(), 'instalaciones', 'Certificado de Habilitación', true, 90, true, NOW()),
    (gen_random_uuid(), 'instalaciones', 'Permiso Municipal', true, 60, true, NOW()),
    (gen_random_uuid(), 'instalaciones', 'Certificado de Bomberos', true, 45, true, NOW()),
    (gen_random_uuid(), 'instalaciones', 'Planos de Seguridad', false, 30, true, NOW())
ON CONFLICT DO NOTHING;

-- Insertar tipos de documentos para guardias
INSERT INTO tipos_documentos (id, modulo, nombre, requiere_vencimiento, dias_antes_alarma, activo, creado_en)
VALUES 
    (gen_random_uuid(), 'guardias', 'Licencia de Conducir', true, 30, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Certificado de Antecedentes', true, 90, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Certificado de Capacitación', true, 365, true, NOW()),
    (gen_random_uuid(), 'guardias', 'Carnet de Identidad', false, 30, true, NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. VERIFICAR ESTRUCTURA FINAL
-- =====================================================

-- Mostrar resumen de la migración
SELECT 
    'tipos_documentos' as tabla,
    COUNT(*) as registros,
    'Tipos de documentos disponibles' as descripcion
FROM tipos_documentos
WHERE activo = true

UNION ALL

SELECT 
    'documentos_clientes' as tabla,
    COUNT(*) as registros,
    'Documentos de clientes' as descripcion
FROM documentos_clientes

UNION ALL

SELECT 
    'documentos_instalacion' as tabla,
    COUNT(*) as registros,
    'Documentos de instalaciones' as descripcion
FROM documentos_instalacion

UNION ALL

SELECT 
    'documentos_guardias' as tabla,
    COUNT(*) as registros,
    'Documentos de guardias' as descripcion
FROM documentos_guardias;

-- =====================================================
-- 7. VERIFICAR CAMPOS CRÍTICOS
-- =====================================================

-- Verificar que todas las tablas tengan los campos necesarios
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('tipos_documentos', 'documentos_clientes', 'documentos_instalacion', 'documentos_guardias')
AND column_name IN ('tipo_documento_id', 'fecha_vencimiento', 'requiere_vencimiento', 'dias_antes_alarma')
ORDER BY table_name, column_name;

RAISE NOTICE '🎉 Migración de tipos de documentos y alertas completada exitosamente!'; 