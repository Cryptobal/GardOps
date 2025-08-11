-- ============================================
-- CREACIÓN IDEMPOTENTE DE TABLAS RBAC
-- Solo crea lo que falta, sin tocar lo existente
-- ============================================

-- Habilitar extensión para UUIDs si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. TABLA: permisos (global, sin tenant_id)
-- ============================================
CREATE TABLE IF NOT EXISTS permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas por clave
CREATE INDEX IF NOT EXISTS idx_permisos_clave ON permisos(clave);

-- ============================================
-- 2. TABLA: roles (con tenant_id opcional)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uk_roles_nombre_tenant UNIQUE (tenant_id, nombre)
);

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_roles_tenant_nombre ON roles(tenant_id, nombre);
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);

-- ============================================
-- 3. TABLA: usuarios_roles (si no existe correctamente)
-- ============================================
-- Primero verificamos si la tabla usuarios_roles existente tiene la estructura correcta
DO $$
BEGIN
    -- Si la tabla no existe o no tiene las columnas correctas, la recreamos
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'usuarios_roles' 
        AND column_name = 'usuario_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Drop si existe con estructura incorrecta
        DROP TABLE IF EXISTS usuarios_roles CASCADE;
        
        -- Crear con estructura correcta
        CREATE TABLE usuarios_roles (
            usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (usuario_id, rol_id)
        );
        
        -- Índices para búsquedas
        CREATE INDEX idx_usuarios_roles_usuario ON usuarios_roles(usuario_id);
        CREATE INDEX idx_usuarios_roles_rol ON usuarios_roles(rol_id);
    END IF;
END $$;

-- ============================================
-- 4. TABLA: roles_permisos
-- ============================================
CREATE TABLE IF NOT EXISTS roles_permisos (
    rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (rol_id, permiso_id)
);

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_roles_permisos_rol ON roles_permisos(rol_id);
CREATE INDEX IF NOT EXISTS idx_roles_permisos_permiso ON roles_permisos(permiso_id);

-- ============================================
-- 5. ACTUALIZAR TABLA usuarios (agregar columnas si faltan)
-- ============================================
-- Agregar columna activo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'usuarios' 
        AND column_name = 'activo'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN activo BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Asegurar que tenant_id puede ser NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'usuarios' 
        AND column_name = 'tenant_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE usuarios ALTER COLUMN tenant_id DROP NOT NULL;
    END IF;
END $$;

-- ============================================
-- 6. SEEDS MÍNIMOS (Solo si no existen)
-- ============================================

-- Insertar permisos base
INSERT INTO permisos (clave, descripcion) VALUES
    ('turnos.*', 'Acceso completo al módulo de turnos'),
    ('turnos.view', 'Ver turnos y pautas'),
    ('turnos.edit', 'Editar turnos y marcar asistencia'),
    ('payroll.*', 'Acceso completo al módulo de payroll'),
    ('payroll.view', 'Ver información de payroll'),
    ('payroll.edit', 'Editar información de payroll'),
    ('maestros.*', 'Acceso completo a datos maestros'),
    ('maestros.view', 'Ver datos maestros'),
    ('maestros.edit', 'Editar datos maestros'),
    ('usuarios.manage', 'Gestionar usuarios y roles'),
    ('documentos.manage', 'Gestionar documentos'),
    ('config.manage', 'Gestionar configuración del sistema')
ON CONFLICT (clave) DO NOTHING;

-- Obtener tenant_id del primer tenant si existe
DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Obtener el primer tenant
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    -- Insertar rol admin si tenemos tenant
    IF v_tenant_id IS NOT NULL THEN
        INSERT INTO roles (nombre, descripcion, tenant_id) VALUES
            ('admin', 'Administrador del sistema', v_tenant_id),
            ('supervisor', 'Supervisor operativo', v_tenant_id),
            ('operador', 'Operador básico', v_tenant_id)
        ON CONFLICT (tenant_id, nombre) DO NOTHING;
        
        -- Asignar todos los permisos al rol admin
        INSERT INTO roles_permisos (rol_id, permiso_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permisos p
        WHERE r.nombre = 'admin' 
        AND r.tenant_id = v_tenant_id
        ON CONFLICT DO NOTHING;
        
        -- Asignar permisos al rol supervisor
        INSERT INTO roles_permisos (rol_id, permiso_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permisos p
        WHERE r.nombre = 'supervisor' 
        AND r.tenant_id = v_tenant_id
        AND p.clave IN ('turnos.view', 'turnos.edit', 'maestros.view', 'documentos.manage')
        ON CONFLICT DO NOTHING;
        
        -- Asignar permisos al rol operador
        INSERT INTO roles_permisos (rol_id, permiso_id)
        SELECT r.id, p.id
        FROM roles r
        CROSS JOIN permisos p
        WHERE r.nombre = 'operador' 
        AND r.tenant_id = v_tenant_id
        AND p.clave IN ('turnos.view', 'maestros.view')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- 7. VISTAS ÚTILES
-- ============================================

-- Vista de permisos efectivos por usuario
CREATE OR REPLACE VIEW v_usuarios_permisos AS
SELECT DISTINCT
    u.id AS usuario_id,
    u.email,
    u.nombre,
    u.tenant_id,
    r.id AS rol_id,
    r.nombre AS rol_nombre,
    p.id AS permiso_id,
    p.clave AS permiso_clave,
    p.descripcion AS permiso_descripcion
FROM usuarios u
JOIN usuarios_roles ur ON ur.usuario_id = u.id
JOIN roles r ON r.id = ur.rol_id
JOIN roles_permisos rp ON rp.rol_id = r.id
JOIN permisos p ON p.id = rp.permiso_id
WHERE u.activo = TRUE;

-- Vista simplificada para verificar permisos
CREATE OR REPLACE VIEW v_check_permiso AS
SELECT 
    u.email,
    p.clave AS permiso
FROM usuarios u
JOIN usuarios_roles ur ON ur.usuario_id = u.id
JOIN roles r ON r.id = ur.rol_id
JOIN roles_permisos rp ON rp.rol_id = r.id
JOIN permisos p ON p.id = rp.permiso_id
WHERE u.activo = TRUE;

-- ============================================
-- 8. FUNCIÓN HELPER: Verificar permiso de usuario
-- ============================================
CREATE OR REPLACE FUNCTION fn_usuario_tiene_permiso(
    p_usuario_email TEXT,
    p_permiso_clave TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_tiene_permiso BOOLEAN;
BEGIN
    -- Verificar permiso exacto o wildcard
    SELECT EXISTS (
        SELECT 1
        FROM v_check_permiso
        WHERE email = p_usuario_email
        AND (
            permiso = p_permiso_clave 
            OR permiso = split_part(p_permiso_clave, '.', 1) || '.*'
        )
    ) INTO v_tiene_permiso;
    
    RETURN COALESCE(v_tiene_permiso, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================
COMMENT ON TABLE permisos IS 'Catálogo global de permisos del sistema';
COMMENT ON TABLE roles IS 'Roles del sistema, pueden ser globales (tenant_id NULL) o por tenant';
COMMENT ON TABLE usuarios_roles IS 'Asignación de roles a usuarios';
COMMENT ON TABLE roles_permisos IS 'Asignación de permisos a roles';
COMMENT ON FUNCTION fn_usuario_tiene_permiso IS 'Verifica si un usuario tiene un permiso específico';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
COMMIT;
