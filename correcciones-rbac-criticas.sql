-- ===============================================
-- CORRECCIONES CRÍTICAS DEL SISTEMA RBAC
-- Basado en Auditoría Completa - GardOps
-- ===============================================

-- Habilitar extensión para UUIDs si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================================
-- 1. CREAR ROL PLATFORM ADMIN (CRÍTICO)
-- ===============================================
DO $$
BEGIN
    -- Verificar si el rol Platform Admin ya existe
    IF NOT EXISTS (
        SELECT 1 FROM roles 
        WHERE nombre = 'Platform Admin' 
        AND tenant_id IS NULL
    ) THEN
        -- Crear rol Platform Admin global (sin tenant)
        INSERT INTO roles (id, nombre, descripcion, tenant_id)
        VALUES (
            gen_random_uuid(),
            'Platform Admin',
            'Administrador global de la plataforma con control total sobre todos los tenants y usuarios',
            NULL
        );
        
        RAISE NOTICE '✅ Rol Platform Admin creado exitosamente';
    ELSE
        RAISE NOTICE 'ℹ️  Rol Platform Admin ya existe';
    END IF;
END $$;

-- ===============================================
-- 2. CREAR PERMISO RBAC.USUARIOS.WRITE (CRÍTICO)
-- ===============================================
DO $$
BEGIN
    -- Verificar si el permiso ya existe
    IF NOT EXISTS (
        SELECT 1 FROM permisos 
        WHERE clave = 'rbac.usuarios.write'
    ) THEN
        -- Crear permiso para gestionar usuarios
        INSERT INTO permisos (id, clave, descripcion, categoria)
        VALUES (
            gen_random_uuid(),
            'rbac.usuarios.write',
            'Crear y editar usuarios del sistema - Permite gestionar usuarios, asignar roles y modificar información de usuarios',
            'RBAC'
        );
        
        RAISE NOTICE '✅ Permiso rbac.usuarios.write creado exitosamente';
    ELSE
        RAISE NOTICE 'ℹ️  Permiso rbac.usuarios.write ya existe';
    END IF;
END $$;

-- ===============================================
-- 3. ASIGNAR ROLES A USUARIOS SIN ROLES (CRÍTICO)
-- ===============================================

-- 3.1 Asignar rol "Operador" a Pedro (guardia@gardops.com)
DO $$
DECLARE
    v_usuario_id UUID;
    v_rol_id UUID;
BEGIN
    -- Obtener ID del usuario Pedro
    SELECT id INTO v_usuario_id 
    FROM usuarios 
    WHERE email = 'guardia@gardops.com' 
    LIMIT 1;
    
    -- Obtener ID del rol Operador
    SELECT id INTO v_rol_id 
    FROM roles 
    WHERE nombre = 'Operador' 
    LIMIT 1;
    
    -- Verificar que ambos existen
    IF v_usuario_id IS NOT NULL AND v_rol_id IS NOT NULL THEN
        -- Verificar si ya tiene el rol asignado
        IF NOT EXISTS (
            SELECT 1 FROM usuarios_roles 
            WHERE usuario_id = v_usuario_id 
            AND rol_id = v_rol_id
        ) THEN
            -- Asignar rol
            INSERT INTO usuarios_roles (usuario_id, rol_id)
            VALUES (v_usuario_id, v_rol_id);
            
            RAISE NOTICE '✅ Rol Operador asignado a Pedro (guardia@gardops.com)';
        ELSE
            RAISE NOTICE 'ℹ️  Pedro ya tiene el rol Operador asignado';
        END IF;
    ELSE
        RAISE NOTICE '❌ No se pudo asignar rol a Pedro: Usuario o rol no encontrado';
    END IF;
END $$;

-- 3.2 Asignar rol "Supervisor" a Juan (supervisor@gardops.com)
DO $$
DECLARE
    v_usuario_id UUID;
    v_rol_id UUID;
BEGIN
    -- Obtener ID del usuario Juan
    SELECT id INTO v_usuario_id 
    FROM usuarios 
    WHERE email = 'supervisor@gardops.com' 
    LIMIT 1;
    
    -- Obtener ID del rol Supervisor
    SELECT id INTO v_rol_id 
    FROM roles 
    WHERE nombre = 'Supervisor' 
    LIMIT 1;
    
    -- Verificar que ambos existen
    IF v_usuario_id IS NOT NULL AND v_rol_id IS NOT NULL THEN
        -- Verificar si ya tiene el rol asignado
        IF NOT EXISTS (
            SELECT 1 FROM usuarios_roles 
            WHERE usuario_id = v_usuario_id 
            AND rol_id = v_rol_id
        ) THEN
            -- Asignar rol
            INSERT INTO usuarios_roles (usuario_id, rol_id)
            VALUES (v_usuario_id, v_rol_id);
            
            RAISE NOTICE '✅ Rol Supervisor asignado a Juan (supervisor@gardops.com)';
        ELSE
            RAISE NOTICE 'ℹ️  Juan ya tiene el rol Supervisor asignado';
        END IF;
    ELSE
        RAISE NOTICE '❌ No se pudo asignar rol a Juan: Usuario o rol no encontrado';
    END IF;
END $$;

-- ===============================================
-- 4. ASIGNAR PERMISOS CRÍTICOS AL ROL PLATFORM ADMIN
-- ===============================================
DO $$
DECLARE
    v_platform_admin_id UUID;
    v_permiso_id UUID;
BEGIN
    -- Obtener ID del rol Platform Admin
    SELECT id INTO v_platform_admin_id 
    FROM roles 
    WHERE nombre = 'Platform Admin' 
    AND tenant_id IS NULL
    LIMIT 1;
    
    IF v_platform_admin_id IS NOT NULL THEN
        -- Asignar permiso rbac.usuarios.write
        SELECT id INTO v_permiso_id 
        FROM permisos 
        WHERE clave = 'rbac.usuarios.write'
        LIMIT 1;
        
        IF v_permiso_id IS NOT NULL THEN
            -- Verificar si ya tiene el permiso asignado
            IF NOT EXISTS (
                SELECT 1 FROM roles_permisos 
                WHERE rol_id = v_platform_admin_id 
                AND permiso_id = v_permiso_id
            ) THEN
                -- Asignar permiso
                INSERT INTO roles_permisos (rol_id, permiso_id)
                VALUES (v_platform_admin_id, v_permiso_id);
                
                RAISE NOTICE '✅ Permiso rbac.usuarios.write asignado al rol Platform Admin';
            ELSE
                RAISE NOTICE 'ℹ️  Platform Admin ya tiene el permiso rbac.usuarios.write';
            END IF;
        ELSE
            RAISE NOTICE '❌ Permiso rbac.usuarios.write no encontrado';
        END IF;
        
        -- Asignar permiso rbac.platform_admin (si existe)
        SELECT id INTO v_permiso_id 
        FROM permisos 
        WHERE clave = 'rbac.platform_admin'
        LIMIT 1;
        
        IF v_permiso_id IS NOT NULL THEN
            -- Verificar si ya tiene el permiso asignado
            IF NOT EXISTS (
                SELECT 1 FROM roles_permisos 
                WHERE rol_id = v_platform_admin_id 
                AND permiso_id = v_permiso_id
            ) THEN
                -- Asignar permiso
                INSERT INTO roles_permisos (rol_id, permiso_id)
                VALUES (v_platform_admin_id, v_permiso_id);
                
                RAISE NOTICE '✅ Permiso rbac.platform_admin asignado al rol Platform Admin';
            ELSE
                RAISE NOTICE 'ℹ️  Platform Admin ya tiene el permiso rbac.platform_admin';
            END IF;
        ELSE
            RAISE NOTICE '❌ Permiso rbac.platform_admin no encontrado';
        END IF;
    ELSE
        RAISE NOTICE '❌ Rol Platform Admin no encontrado';
    END IF;
END $$;

-- ===============================================
-- 5. VERIFICACIÓN FINAL
-- ===============================================
DO $$
DECLARE
    v_usuarios_sin_roles INTEGER;
    v_platform_admin_count INTEGER;
    v_permiso_count INTEGER;
BEGIN
    -- Verificar usuarios sin roles
    SELECT COUNT(*) INTO v_usuarios_sin_roles
    FROM usuarios u
    WHERE u.activo = true
    AND NOT EXISTS (
        SELECT 1 FROM usuarios_roles ur WHERE ur.usuario_id = u.id
    );
    
    -- Verificar rol Platform Admin
    SELECT COUNT(*) INTO v_platform_admin_count
    FROM roles 
    WHERE nombre = 'Platform Admin';
    
    -- Verificar permiso rbac.usuarios.write
    SELECT COUNT(*) INTO v_permiso_count
    FROM permisos 
    WHERE clave = 'rbac.usuarios.write';
    
    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'VERIFICACIÓN FINAL DE CORRECCIONES CRÍTICAS';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Usuarios sin roles: %', v_usuarios_sin_roles;
    RAISE NOTICE 'Rol Platform Admin existe: %', CASE WHEN v_platform_admin_count > 0 THEN 'SÍ' ELSE 'NO' END;
    RAISE NOTICE 'Permiso rbac.usuarios.write existe: %', CASE WHEN v_permiso_count > 0 THEN 'SÍ' ELSE 'NO' END;
    
    IF v_usuarios_sin_roles = 0 AND v_platform_admin_count > 0 AND v_permiso_count > 0 THEN
        RAISE NOTICE '✅ TODAS LAS CORRECCIONES CRÍTICAS APLICADAS EXITOSAMENTE';
    ELSE
        RAISE NOTICE '⚠️  ALGUNAS CORRECCIONES PENDIENTES';
    END IF;
    RAISE NOTICE '===============================================';
END $$;

-- ===============================================
-- 6. LIMPIEZA Y OPTIMIZACIÓN
-- ===============================================

-- Actualizar estadísticas
ANALYZE usuarios;
ANALYZE roles;
ANALYZE permisos;
ANALYZE usuarios_roles;
ANALYZE roles_permisos;

-- ===============================================
-- FIN DEL SCRIPT
-- ===============================================
COMMIT;
