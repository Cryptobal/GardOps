-- =====================================================
-- MIGRACIÓN: CAMBIO DE TIPOS_DOCUMENTOS A DOCUMENTOS_TIPOS
-- Y AGREGAR MULTI-TENANT A TODAS LAS TABLAS DE DOCUMENTOS
-- =====================================================
-- Fecha: 2025-01-27
-- Propósito: 
-- 1. Renombrar tipos_documentos → documentos_tipos
-- 2. Agregar tenant_id a todas las tablas de documentos
-- 3. Asignar tenant_id = 'Gard' a todos los registros existentes

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
-- 2. AGREGAR TENANT_ID A TIPOS_DOCUMENTOS
-- =====================================================

DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    -- Obtener tenant_id
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    -- Verificar si la columna tenant_id ya existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tipos_documentos' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        -- Agregar columna tenant_id
        ALTER TABLE tipos_documentos ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        RAISE NOTICE '✅ Columna tenant_id agregada a tipos_documentos';
        
        -- Actualizar registros existentes con el tenant_id
        UPDATE tipos_documentos SET tenant_id = tenant_uuid WHERE tipos_documentos.tenant_id IS NULL;
        RAISE NOTICE '✅ Registros existentes actualizados con tenant_id';
    ELSE
        RAISE NOTICE 'ℹ️ Columna tenant_id ya existe en tipos_documentos';
    END IF;
END $$;

-- =====================================================
-- 3. AGREGAR TENANT_ID A DOCUMENTOS
-- =====================================================

DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    -- Obtener tenant_id
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    -- Verificar si la columna tenant_id ya existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        -- Agregar columna tenant_id
        ALTER TABLE documentos ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        RAISE NOTICE '✅ Columna tenant_id agregada a documentos';
        
        -- Actualizar registros existentes con el tenant_id
        UPDATE documentos SET tenant_id = tenant_uuid WHERE documentos.tenant_id IS NULL;
        RAISE NOTICE '✅ Registros existentes actualizados con tenant_id';
    ELSE
        RAISE NOTICE 'ℹ️ Columna tenant_id ya existe en documentos';
    END IF;
END $$;

-- =====================================================
-- 4. AGREGAR TENANT_ID A DOCUMENTOS_CLIENTES
-- =====================================================

DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    -- Obtener tenant_id
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    -- Verificar si la columna tenant_id ya existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos_clientes' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        -- Agregar columna tenant_id
        ALTER TABLE documentos_clientes ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        RAISE NOTICE '✅ Columna tenant_id agregada a documentos_clientes';
        
        -- Actualizar registros existentes con el tenant_id
        UPDATE documentos_clientes SET tenant_id = tenant_uuid WHERE documentos_clientes.tenant_id IS NULL;
        RAISE NOTICE '✅ Registros existentes actualizados con tenant_id';
    ELSE
        RAISE NOTICE 'ℹ️ Columna tenant_id ya existe en documentos_clientes';
    END IF;
END $$;

-- =====================================================
-- 5. AGREGAR TENANT_ID A DOCUMENTOS_INSTALACION
-- =====================================================

DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    -- Obtener tenant_id
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    -- Verificar si la columna tenant_id ya existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos_instalacion' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        -- Agregar columna tenant_id
        ALTER TABLE documentos_instalacion ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        RAISE NOTICE '✅ Columna tenant_id agregada a documentos_instalacion';
        
        -- Actualizar registros existentes con el tenant_id
        UPDATE documentos_instalacion SET tenant_id = tenant_uuid WHERE documentos_instalacion.tenant_id IS NULL;
        RAISE NOTICE '✅ Registros existentes actualizados con tenant_id';
    ELSE
        RAISE NOTICE 'ℹ️ Columna tenant_id ya existe en documentos_instalacion';
    END IF;
END $$;

-- =====================================================
-- 6. AGREGAR TENANT_ID A DOCUMENTOS_GUARDIAS
-- =====================================================

DO $$
DECLARE
    tenant_uuid UUID;
    column_exists BOOLEAN;
BEGIN
    -- Obtener tenant_id
    SELECT current_setting('app.tenant_id')::UUID INTO tenant_uuid;
    
    -- Verificar si la columna tenant_id ya existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos_guardias' 
        AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        -- Agregar columna tenant_id
        ALTER TABLE documentos_guardias ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        RAISE NOTICE '✅ Columna tenant_id agregada a documentos_guardias';
        
        -- Actualizar registros existentes con el tenant_id
        UPDATE documentos_guardias SET tenant_id = tenant_uuid WHERE documentos_guardias.tenant_id IS NULL;
        RAISE NOTICE '✅ Registros existentes actualizados con tenant_id';
    ELSE
        RAISE NOTICE 'ℹ️ Columna tenant_id ya existe en documentos_guardias';
    END IF;
END $$;

-- =====================================================
-- 7. RENOMBRAR TIPOS_DOCUMENTOS A DOCUMENTOS_TIPOS
-- =====================================================

DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Verificar si la tabla tipos_documentos existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'tipos_documentos'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Renombrar la tabla
        ALTER TABLE tipos_documentos RENAME TO documentos_tipos;
        RAISE NOTICE '✅ Tabla tipos_documentos renombrada a documentos_tipos';
        
        -- Renombrar índices
        ALTER INDEX IF EXISTS idx_tipos_documentos_modulo RENAME TO idx_documentos_tipos_modulo;
        ALTER INDEX IF EXISTS idx_tipos_documentos_activo RENAME TO idx_documentos_tipos_activo;
        
        RAISE NOTICE '✅ Índices renombrados';
    ELSE
        RAISE NOTICE 'ℹ️ Tabla tipos_documentos no existe, puede que ya haya sido renombrada';
    END IF;
END $$;

-- =====================================================
-- 8. ACTUALIZAR FOREIGN KEYS
-- =====================================================

-- Actualizar foreign keys en documentos
DO $$
BEGIN
    -- Verificar si existe la foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documentos_tipo_documento_id_fkey'
        AND table_name = 'documentos'
    ) THEN
        -- Eliminar la foreign key existente
        ALTER TABLE documentos DROP CONSTRAINT documentos_tipo_documento_id_fkey;
        RAISE NOTICE '✅ Foreign key eliminada de documentos';
    END IF;
    
    -- Crear nueva foreign key
    ALTER TABLE documentos ADD CONSTRAINT documentos_tipo_documento_id_fkey 
    FOREIGN KEY (tipo_documento_id) REFERENCES documentos_tipos(id);
    RAISE NOTICE '✅ Nueva foreign key creada en documentos';
END $$;

-- Actualizar foreign keys en documentos_clientes
DO $$
BEGIN
    -- Verificar si existe la foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documentos_clientes_tipo_documento_id_fkey'
        AND table_name = 'documentos_clientes'
    ) THEN
        -- Eliminar la foreign key existente
        ALTER TABLE documentos_clientes DROP CONSTRAINT documentos_clientes_tipo_documento_id_fkey;
        RAISE NOTICE '✅ Foreign key eliminada de documentos_clientes';
    END IF;
    
    -- Crear nueva foreign key
    ALTER TABLE documentos_clientes ADD CONSTRAINT documentos_clientes_tipo_documento_id_fkey 
    FOREIGN KEY (tipo_documento_id) REFERENCES documentos_tipos(id);
    RAISE NOTICE '✅ Nueva foreign key creada en documentos_clientes';
END $$;

-- Actualizar foreign keys en documentos_instalacion
DO $$
BEGIN
    -- Verificar si existe la foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documentos_instalacion_tipo_documento_id_fkey'
        AND table_name = 'documentos_instalacion'
    ) THEN
        -- Eliminar la foreign key existente
        ALTER TABLE documentos_instalacion DROP CONSTRAINT documentos_instalacion_tipo_documento_id_fkey;
        RAISE NOTICE '✅ Foreign key eliminada de documentos_instalacion';
    END IF;
    
    -- Crear nueva foreign key
    ALTER TABLE documentos_instalacion ADD CONSTRAINT documentos_instalacion_tipo_documento_id_fkey 
    FOREIGN KEY (tipo_documento_id) REFERENCES documentos_tipos(id);
    RAISE NOTICE '✅ Nueva foreign key creada en documentos_instalacion';
END $$;

-- Actualizar foreign keys en documentos_guardias
DO $$
BEGIN
    -- Verificar si existe la foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'documentos_guardias_tipo_documento_id_fkey'
        AND table_name = 'documentos_guardias'
    ) THEN
        -- Eliminar la foreign key existente
        ALTER TABLE documentos_guardias DROP CONSTRAINT documentos_guardias_tipo_documento_id_fkey;
        RAISE NOTICE '✅ Foreign key eliminada de documentos_guardias';
    END IF;
    
    -- Crear nueva foreign key
    ALTER TABLE documentos_guardias ADD CONSTRAINT documentos_guardias_tipo_documento_id_fkey 
    FOREIGN KEY (tipo_documento_id) REFERENCES documentos_tipos(id);
    RAISE NOTICE '✅ Nueva foreign key creada en documentos_guardias';
END $$;

-- =====================================================
-- 9. CREAR ÍNDICES PARA MULTI-TENANT
-- =====================================================

-- Índices para documentos_tipos
CREATE INDEX IF NOT EXISTS idx_documentos_tipos_tenant ON documentos_tipos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipos_modulo_tenant ON documentos_tipos(modulo, tenant_id);

-- Índices para documentos
CREATE INDEX IF NOT EXISTS idx_documentos_tenant ON documentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documentos_instalacion_tenant ON documentos(instalacion_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_documentos_guardia_tenant ON documentos(guardia_id, tenant_id);

-- Índices para documentos_clientes
CREATE INDEX IF NOT EXISTS idx_documentos_clientes_tenant ON documentos_clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documentos_clientes_cliente_tenant ON documentos_clientes(cliente_id, tenant_id);

-- Índices para documentos_instalacion
CREATE INDEX IF NOT EXISTS idx_documentos_instalacion_tenant ON documentos_instalacion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documentos_instalacion_instalacion_tenant ON documentos_instalacion(instalacion_id, tenant_id);

-- Índices para documentos_guardias
CREATE INDEX IF NOT EXISTS idx_documentos_guardias_tenant ON documentos_guardias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documentos_guardias_guardia_tenant ON documentos_guardias(guardia_id, tenant_id);

-- =====================================================
-- 10. VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Migración completada exitosamente!';
    RAISE NOTICE '✅ Tabla tipos_documentos renombrada a documentos_tipos';
    RAISE NOTICE '✅ Multi-tenant agregado a todas las tablas de documentos';
    RAISE NOTICE '✅ Foreign keys actualizadas';
    RAISE NOTICE '✅ Índices creados para optimización multi-tenant';
END $$;
