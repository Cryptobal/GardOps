-- Script simplificado para crear roles estándar por tenant
-- Ejecutar en Neon (SQL)

-- 1. Verificar tenants existentes
SELECT 'TENANTS EXISTENTES' as tipo, id, nombre, descripcion
FROM tenants
ORDER BY nombre;

-- 2. Obtener IDs de tenants
DO $$
DECLARE
    gard_tenant_id uuid;
    demo_tenant_id uuid;
BEGIN
    -- Obtener tenant_id de Gard
    SELECT id INTO gard_tenant_id FROM tenants WHERE nombre = 'Gard' LIMIT 1;
    
    -- Obtener tenant_id de Tenant Demo
    SELECT id INTO demo_tenant_id FROM tenants WHERE nombre = 'Tenant Demo' LIMIT 1;
    
    RAISE NOTICE 'Gard tenant_id: %', gard_tenant_id;
    RAISE NOTICE 'Demo tenant_id: %', demo_tenant_id;
    
    -- Eliminar roles existentes de estos tenants
    DELETE FROM roles_permisos 
    WHERE rol_id IN (
        SELECT id FROM roles 
        WHERE tenant_id IN (gard_tenant_id, demo_tenant_id)
        AND nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
    );
    
    DELETE FROM usuarios_roles 
    WHERE rol_id IN (
        SELECT id FROM roles 
        WHERE tenant_id IN (gard_tenant_id, demo_tenant_id)
        AND nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
    );
    
    DELETE FROM roles 
    WHERE tenant_id IN (gard_tenant_id, demo_tenant_id)
    AND nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico');
    
    RAISE NOTICE 'Roles eliminados de tenants Gard y Demo';
    
    -- Crear roles para Gard
    IF gard_tenant_id IS NOT NULL THEN
        -- Super Admin para Gard
        INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Super Admin', 'Administrador con acceso completo a todos los módulos', gard_tenant_id);
        
        -- Tenant Admin para Gard
        INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Tenant Admin', 'Administrador del tenant con acceso a gestión de usuarios y configuración', gard_tenant_id);
        
        -- Supervisor para Gard
        INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Supervisor', 'Supervisor con acceso a gestión de guardias y reportes', gard_tenant_id);
        
        -- Perfil Básico para Gard
        INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Perfil Básico', 'Usuario básico con acceso limitado a consultas', gard_tenant_id);
        
        RAISE NOTICE 'Roles creados para Gard';
    END IF;
    
    -- Crear roles para Tenant Demo
    IF demo_tenant_id IS NOT NULL THEN
        -- Super Admin para Demo
        INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Super Admin', 'Administrador con acceso completo a todos los módulos', demo_tenant_id);
        
        -- Tenant Admin para Demo
        INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Tenant Admin', 'Administrador del tenant con acceso a gestión de usuarios y configuración', demo_tenant_id);
        
        -- Supervisor para Demo
        INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Supervisor', 'Supervisor con acceso a gestión de guardias y reportes', demo_tenant_id);
        
        -- Perfil Básico para Demo
        INSERT INTO roles (id, nombre, descripcion, tenant_id) VALUES 
        (gen_random_uuid(), 'Perfil Básico', 'Usuario básico con acceso limitado a consultas', demo_tenant_id);
        
        RAISE NOTICE 'Roles creados para Tenant Demo';
    END IF;
    
END $$;

-- 3. Verificar roles creados
SELECT 'ROLES CREADOS' as tipo, r.id, r.nombre, r.descripcion, r.tenant_id, t.nombre as tenant_nombre
FROM roles r
LEFT JOIN tenants t ON r.tenant_id = t.id
WHERE r.nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
ORDER BY t.nombre, r.nombre;

-- 4. Asignar permisos a roles de Gard
DO $$
DECLARE
    gard_tenant_id uuid;
    super_admin_id uuid;
    tenant_admin_id uuid;
    supervisor_id uuid;
    perfil_basico_id uuid;
BEGIN
    -- Obtener tenant_id de Gard
    SELECT id INTO gard_tenant_id FROM tenants WHERE nombre = 'Gard' LIMIT 1;
    
    -- Obtener IDs de roles de Gard
    SELECT id INTO super_admin_id FROM roles WHERE nombre = 'Super Admin' AND tenant_id = gard_tenant_id LIMIT 1;
    SELECT id INTO tenant_admin_id FROM roles WHERE nombre = 'Tenant Admin' AND tenant_id = gard_tenant_id LIMIT 1;
    SELECT id INTO supervisor_id FROM roles WHERE nombre = 'Supervisor' AND tenant_id = gard_tenant_id LIMIT 1;
    SELECT id INTO perfil_basico_id FROM roles WHERE nombre = 'Perfil Básico' AND tenant_id = gard_tenant_id LIMIT 1;
    
    -- Asignar TODOS los permisos a Super Admin
    INSERT INTO roles_permisos (rol_id, permiso_id)
    SELECT super_admin_id, id FROM rbac_permisos;
    
    -- Asignar permisos básicos a Tenant Admin
    INSERT INTO roles_permisos (rol_id, permiso_id)
    SELECT tenant_admin_id, id FROM rbac_permisos 
    WHERE nombre IN (
        'home.view', 'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
        'instalaciones.view', 'instalaciones.create', 'instalaciones.edit', 'instalaciones.delete',
        'guardias.view', 'guardias.create', 'guardias.edit', 'guardias.delete',
        'pauta_mensual.view', 'pauta_mensual.create', 'pauta_mensual.edit', 'pauta_mensual.delete',
        'pauta_diaria.view', 'pauta_diaria.create', 'pauta_diaria.edit', 'pauta_diaria.delete',
        'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.delete',
        'turnos_extras.view', 'turnos_extras.create', 'turnos_extras.edit', 'turnos_extras.delete',
        'config.view', 'usuarios.view', 'usuarios.create', 'usuarios.edit', 'usuarios.delete',
        'rbac.roles.read', 'rbac.permisos.read'
    );
    
    -- Asignar permisos de supervisor
    INSERT INTO roles_permisos (rol_id, permiso_id)
    SELECT supervisor_id, id FROM rbac_permisos 
    WHERE nombre IN (
        'home.view', 'clientes.view', 'instalaciones.view', 'guardias.view', 'guardias.create', 'guardias.edit',
        'pauta_mensual.view', 'pauta_diaria.view', 'payroll.view', 'turnos_extras.view'
    );
    
    -- Asignar permisos básicos
    INSERT INTO roles_permisos (rol_id, permiso_id)
    SELECT perfil_basico_id, id FROM rbac_permisos 
    WHERE nombre IN (
        'home.view', 'clientes.view', 'instalaciones.view', 'guardias.view'
    );
    
    RAISE NOTICE 'Permisos asignados a roles de Gard';
END $$;

-- 5. Asignar permisos a roles de Tenant Demo
DO $$
DECLARE
    demo_tenant_id uuid;
    super_admin_id uuid;
    tenant_admin_id uuid;
    supervisor_id uuid;
    perfil_basico_id uuid;
BEGIN
    -- Obtener tenant_id de Tenant Demo
    SELECT id INTO demo_tenant_id FROM tenants WHERE nombre = 'Tenant Demo' LIMIT 1;
    
    -- Obtener IDs de roles de Demo
    SELECT id INTO super_admin_id FROM roles WHERE nombre = 'Super Admin' AND tenant_id = demo_tenant_id LIMIT 1;
    SELECT id INTO tenant_admin_id FROM roles WHERE nombre = 'Tenant Admin' AND tenant_id = demo_tenant_id LIMIT 1;
    SELECT id INTO supervisor_id FROM roles WHERE nombre = 'Supervisor' AND tenant_id = demo_tenant_id LIMIT 1;
    SELECT id INTO perfil_basico_id FROM roles WHERE nombre = 'Perfil Básico' AND tenant_id = demo_tenant_id LIMIT 1;
    
    -- Asignar TODOS los permisos a Super Admin
    INSERT INTO roles_permisos (rol_id, permiso_id)
    SELECT super_admin_id, id FROM rbac_permisos;
    
    -- Asignar permisos básicos a Tenant Admin
    INSERT INTO roles_permisos (rol_id, permiso_id)
    SELECT tenant_admin_id, id FROM rbac_permisos 
    WHERE nombre IN (
        'home.view', 'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
        'instalaciones.view', 'instalaciones.create', 'instalaciones.edit', 'instalaciones.delete',
        'guardias.view', 'guardias.create', 'guardias.edit', 'guardias.delete',
        'pauta_mensual.view', 'pauta_mensual.create', 'pauta_mensual.edit', 'pauta_mensual.delete',
        'pauta_diaria.view', 'pauta_diaria.create', 'pauta_diaria.edit', 'pauta_diaria.delete',
        'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.delete',
        'turnos_extras.view', 'turnos_extras.create', 'turnos_extras.edit', 'turnos_extras.delete',
        'config.view', 'usuarios.view', 'usuarios.create', 'usuarios.edit', 'usuarios.delete',
        'rbac.roles.read', 'rbac.permisos.read'
    );
    
    -- Asignar permisos de supervisor
    INSERT INTO roles_permisos (rol_id, permiso_id)
    SELECT supervisor_id, id FROM rbac_permisos 
    WHERE nombre IN (
        'home.view', 'clientes.view', 'instalaciones.view', 'guardias.view', 'guardias.create', 'guardias.edit',
        'pauta_mensual.view', 'pauta_diaria.view', 'payroll.view', 'turnos_extras.view'
    );
    
    -- Asignar permisos básicos
    INSERT INTO roles_permisos (rol_id, permiso_id)
    SELECT perfil_basico_id, id FROM rbac_permisos 
    WHERE nombre IN (
        'home.view', 'clientes.view', 'instalaciones.view', 'guardias.view'
    );
    
    RAISE NOTICE 'Permisos asignados a roles de Tenant Demo';
END $$;

-- 6. Asignar rol Super Admin a Carlos.Irigoyen@gard.cl
DO $$
DECLARE
    carlos_user_id uuid;
    gard_super_admin_id uuid;
BEGIN
    -- Obtener ID de Carlos.Irigoyen@gard.cl
    SELECT id INTO carlos_user_id FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl' LIMIT 1;
    
    -- Obtener ID del rol Super Admin de Gard
    SELECT r.id INTO gard_super_admin_id 
    FROM roles r 
    JOIN tenants t ON r.tenant_id = t.id 
    WHERE r.nombre = 'Super Admin' AND t.nombre = 'Gard' LIMIT 1;
    
    -- Eliminar roles anteriores de Carlos
    DELETE FROM usuarios_roles WHERE usuario_id = carlos_user_id;
    
    -- Asignar rol Super Admin
    IF carlos_user_id IS NOT NULL AND gard_super_admin_id IS NOT NULL THEN
        INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES (carlos_user_id, gard_super_admin_id);
        RAISE NOTICE 'Rol Super Admin asignado a Carlos.Irigoyen@gard.cl';
    ELSE
        RAISE NOTICE 'No se pudo asignar rol: carlos_user_id=%, gard_super_admin_id=%', carlos_user_id, gard_super_admin_id;
    END IF;
END $$;

-- 7. Verificar resultado final
SELECT 'VERIFICACIÓN FINAL - ROLES POR TENANT' as tipo, t.nombre as tenant, COUNT(r.id) as total_roles, STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
FROM tenants t
LEFT JOIN roles r ON t.id = r.tenant_id
WHERE r.nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
GROUP BY t.id, t.nombre
ORDER BY t.nombre;

-- 8. Verificar roles de Carlos.Irigoyen@gard.cl
SELECT 'ROLES DE CARLOS' as tipo, u.email, r.nombre as rol, t.nombre as tenant
FROM usuarios u
JOIN usuarios_roles ur ON u.id = ur.usuario_id
JOIN roles r ON ur.rol_id = r.id
JOIN tenants t ON r.tenant_id = t.id
WHERE u.email = 'carlos.irigoyen@gard.cl';
