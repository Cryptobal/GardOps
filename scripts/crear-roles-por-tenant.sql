-- Script para crear roles estándar específicos para cada tenant
-- Ejecutar en Neon (SQL)

-- 1. Verificar tenants existentes
SELECT 'TENANTS EXISTENTES' as tipo, id, nombre, descripcion
FROM tenants
ORDER BY nombre;

-- 2. Eliminar roles globales existentes (si los hay)
DELETE FROM roles_permisos 
WHERE rol_id IN (
  SELECT id FROM roles 
  WHERE nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
  AND tenant_id IS NULL
);

DELETE FROM usuarios_roles 
WHERE rol_id IN (
  SELECT id FROM roles 
  WHERE nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
  AND tenant_id IS NULL
);

DELETE FROM roles 
WHERE nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
AND tenant_id IS NULL;

-- 3. Función para crear roles estándar para un tenant
CREATE OR REPLACE FUNCTION crear_roles_estandar_tenant(tenant_id_param UUID)
RETURNS VOID AS $$
DECLARE
  super_admin_id UUID;
  tenant_admin_id UUID;
  supervisor_id UUID;
  perfil_basico_id UUID;
BEGIN
  -- Crear Super Admin para el tenant
  INSERT INTO roles (nombre, descripcion, tenant_id) VALUES 
  ('Super Admin', 'Administrador del sistema con control total', tenant_id_param)
  RETURNING id INTO super_admin_id;
  
  -- Crear Tenant Admin para el tenant
  INSERT INTO roles (nombre, descripcion, tenant_id) VALUES 
  ('Tenant Admin', 'Administrador de un tenant específico', tenant_id_param)
  RETURNING id INTO tenant_admin_id;
  
  -- Crear Supervisor para el tenant
  INSERT INTO roles (nombre, descripcion, tenant_id) VALUES 
  ('Supervisor', 'Supervisor de operaciones', tenant_id_param)
  RETURNING id INTO supervisor_id;
  
  -- Crear Perfil Básico para el tenant
  INSERT INTO roles (nombre, descripcion, tenant_id) VALUES 
  ('Perfil Básico', 'Usuario operativo básico', tenant_id_param)
  RETURNING id INTO perfil_basico_id;
  
  -- Asignar permisos al Super Admin
  INSERT INTO roles_permisos (rol_id, permiso_id)
  SELECT super_admin_id, p.id
  FROM permisos p
  WHERE p.clave IN (
    -- Permisos especiales del sistema
    'rbac.platform_admin',
    'rbac.tenants.read', 'rbac.tenants.create', 'rbac.tenants.edit', 'rbac.tenants.delete',
    'rbac.roles.read', 'rbac.roles.create', 'rbac.roles.edit', 'rbac.roles.delete',
    'rbac.permisos.read', 'rbac.permisos.create', 'rbac.permisos.edit', 'rbac.permisos.delete',
    'usuarios.manage',
    -- Todos los permisos básicos
    'home.view', 'home.create', 'home.edit', 'home.delete',
    'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
    'instalaciones.view', 'instalaciones.create', 'instalaciones.edit', 'instalaciones.delete',
    'guardias.view', 'guardias.create', 'guardias.edit', 'guardias.delete',
    'pauta_mensual.view', 'pauta_mensual.create', 'pauta_mensual.edit', 'pauta_mensual.delete',
    'pauta_diaria.view', 'pauta_diaria.create', 'pauta_diaria.edit', 'pauta_diaria.delete',
    'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.delete',
    'configuracion.view', 'configuracion.create', 'configuracion.edit', 'configuracion.delete',
    'documentos.view', 'documentos.create', 'documentos.edit', 'documentos.delete',
    'alertas.view', 'alertas.create', 'alertas.edit', 'alertas.delete',
    'asignaciones.view', 'asignaciones.create', 'asignaciones.edit', 'asignaciones.delete',
    'turnos_extras.view', 'turnos_extras.create', 'turnos_extras.edit', 'turnos_extras.delete',
    'usuarios.view', 'usuarios.create', 'usuarios.edit', 'usuarios.delete',
    'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
    'permisos.view', 'permisos.create', 'permisos.edit', 'permisos.delete',
    'tenants.view', 'tenants.create', 'tenants.edit', 'tenants.delete',
    'ppc.view', 'ppc.create', 'ppc.edit', 'ppc.delete',
    'estructuras.view', 'estructuras.create', 'estructuras.edit', 'estructuras.delete',
    'sueldos.view', 'sueldos.create', 'sueldos.edit', 'sueldos.delete',
    'planillas.view', 'planillas.create', 'planillas.edit', 'planillas.delete',
    'logs.view', 'logs.create', 'logs.edit', 'logs.delete'
  );
  
  -- Asignar permisos al Tenant Admin
  INSERT INTO roles_permisos (rol_id, permiso_id)
  SELECT tenant_admin_id, p.id
  FROM permisos p
  WHERE p.clave IN (
    -- Gestión de usuarios del tenant
    'usuarios.view', 'usuarios.create', 'usuarios.edit', 'usuarios.delete',
    'roles.view', 'roles.read',
    'permisos.view', 'permisos.read',
    -- Todos los permisos básicos de operación
    'home.view', 'home.create', 'home.edit', 'home.delete',
    'clientes.view', 'clientes.create', 'clientes.edit', 'clientes.delete',
    'instalaciones.view', 'instalaciones.create', 'instalaciones.edit', 'instalaciones.delete',
    'guardias.view', 'guardias.create', 'guardias.edit', 'guardias.delete',
    'pauta_mensual.view', 'pauta_mensual.create', 'pauta_mensual.edit', 'pauta_mensual.delete',
    'pauta_diaria.view', 'pauta_diaria.create', 'pauta_diaria.edit', 'pauta_diaria.delete',
    'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.delete',
    'configuracion.view', 'configuracion.create', 'configuracion.edit', 'configuracion.delete',
    'documentos.view', 'documentos.create', 'documentos.edit', 'documentos.delete',
    'alertas.view', 'alertas.create', 'alertas.edit', 'alertas.delete',
    'asignaciones.view', 'asignaciones.create', 'asignaciones.edit', 'asignaciones.delete',
    'turnos_extras.view', 'turnos_extras.create', 'turnos_extras.edit', 'turnos_extras.delete',
    'ppc.view', 'ppc.create', 'ppc.edit', 'ppc.delete',
    'estructuras.view', 'estructuras.create', 'estructuras.edit', 'estructuras.delete',
    'sueldos.view', 'sueldos.create', 'sueldos.edit', 'sueldos.delete',
    'planillas.view', 'planillas.create', 'planillas.edit', 'planillas.delete',
    'logs.view', 'logs.create', 'logs.edit', 'logs.delete'
  );
  
  -- Asignar permisos al Supervisor
  INSERT INTO roles_permisos (rol_id, permiso_id)
  SELECT supervisor_id, p.id
  FROM permisos p
  WHERE p.clave IN (
    'home.view',
    'clientes.view', 'clientes.edit',
    'instalaciones.view', 'instalaciones.edit',
    'guardias.view', 'guardias.edit',
    'pauta_mensual.view', 'pauta_mensual.edit',
    'pauta_diaria.view', 'pauta_diaria.edit',
    'payroll.view', 'payroll.edit',
    'configuracion.view',
    'documentos.view', 'documentos.edit',
    'alertas.view', 'alertas.edit',
    'asignaciones.view', 'asignaciones.edit',
    'turnos_extras.view', 'turnos_extras.edit',
    'ppc.view', 'ppc.edit',
    'estructuras.view', 'estructuras.edit',
    'sueldos.view', 'sueldos.edit',
    'planillas.view', 'planillas.edit',
    'logs.view'
  );
  
  -- Asignar permisos al Perfil Básico
  INSERT INTO roles_permisos (rol_id, permiso_id)
  SELECT perfil_basico_id, p.id
  FROM permisos p
  WHERE p.clave IN (
    'home.view',
    'clientes.view',
    'instalaciones.view',
    'guardias.view',
    'pauta_mensual.view',
    'pauta_diaria.view',
    'documentos.view',
    'alertas.view',
    'asignaciones.view',
    'turnos_extras.view',
    'logs.view'
  );
  
  RAISE NOTICE 'Roles estándar creados para tenant %', tenant_id_param;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear roles estándar para cada tenant existente
SELECT crear_roles_estandar_tenant(id) FROM tenants WHERE nombre IN ('Gard', 'Tenant Demo');

-- 5. Reasignar rol Super Admin a Carlos.Irigoyen@gard.cl
DELETE FROM usuarios_roles 
WHERE usuario_id = (
  SELECT id FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl'
);

INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT 
  u.id as usuario_id,
  r.id as rol_id
FROM usuarios u, roles r, tenants t
WHERE u.email = 'carlos.irigoyen@gard.cl'
AND r.nombre = 'Super Admin'
AND r.tenant_id = t.id
AND t.nombre = 'Gard';

-- 6. Verificar resultado final
SELECT 'ROLES POR TENANT' as tipo, t.nombre as tenant, COUNT(r.id) as total_roles
FROM tenants t
LEFT JOIN roles r ON t.id = r.tenant_id
WHERE t.nombre IN ('Gard', 'Tenant Demo')
GROUP BY t.id, t.nombre
ORDER BY t.nombre;

-- 7. Verificar roles específicos de cada tenant
SELECT 'ROLES GARD' as tipo, r.id, r.nombre, r.descripcion, r.tenant_id
FROM roles r
JOIN tenants t ON r.tenant_id = t.id
WHERE t.nombre = 'Gard'
ORDER BY r.nombre;

SELECT 'ROLES TENANT DEMO' as tipo, r.id, r.nombre, r.descripcion, r.tenant_id
FROM roles r
JOIN tenants t ON r.tenant_id = t.id
WHERE t.nombre = 'Tenant Demo'
ORDER BY r.nombre;

-- 8. Verificar asignación de Carlos.Irigoyen
SELECT 'CARLOS ASIGNACIÓN' as tipo,
  u.email,
  t.nombre as tenant,
  r.nombre as rol_asignado,
  r.descripcion
FROM usuarios u
JOIN usuarios_roles ur ON u.id = ur.usuario_id
JOIN roles r ON ur.rol_id = r.id
JOIN tenants t ON r.tenant_id = t.id
WHERE u.email = 'carlos.irigoyen@gard.cl';

-- 9. Verificar permisos del Super Admin de Gard
SELECT 'PERMISOS SUPER ADMIN GARD' as tipo,
  COUNT(rp.permiso_id) as total_permisos
FROM roles r
JOIN tenants t ON r.tenant_id = t.id
JOIN roles_permisos rp ON r.id = rp.rol_id
WHERE t.nombre = 'Gard'
AND r.nombre = 'Super Admin';

-- 10. Limpiar función temporal
DROP FUNCTION IF EXISTS crear_roles_estandar_tenant(UUID);
