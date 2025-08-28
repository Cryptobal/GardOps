-- Script para corregir roles estándar y hacerlos globales
-- Ejecutar en Neon (SQL)

-- 1. Verificar estado actual de roles
SELECT 'ESTADO ACTUAL ROLES' as tipo, id, nombre, descripcion, tenant_id
FROM roles
ORDER BY nombre;

-- 2. Verificar tenants existentes
SELECT 'TENANTS EXISTENTES' as tipo, id, nombre, descripcion
FROM tenants
ORDER BY nombre;

-- 3. Crear roles estándar GLOBALES (sin tenant_id específico)
-- Primero eliminar roles estándar existentes
DELETE FROM roles_permisos 
WHERE rol_id IN (
  SELECT id FROM roles 
  WHERE nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
);

DELETE FROM usuarios_roles 
WHERE rol_id IN (
  SELECT id FROM roles 
  WHERE nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
);

DELETE FROM roles 
WHERE nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico');

-- 4. Crear roles estándar GLOBALES (tenant_id = NULL)
INSERT INTO roles (nombre, descripcion, tenant_id) VALUES 
('Super Admin', 'Administrador del sistema con control total', NULL),
('Tenant Admin', 'Administrador de un tenant específico', NULL),
('Supervisor', 'Supervisor de operaciones', NULL),
('Perfil Básico', 'Usuario operativo básico', NULL);

-- 5. Obtener IDs de los roles creados
SELECT 'ROLES GLOBALES CREADOS' as tipo, id, nombre, descripcion, tenant_id
FROM roles
WHERE nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
ORDER BY nombre;

-- 6. Asignar permisos al Super Admin (global)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Super Admin' 
AND p.clave IN (
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

-- 7. Asignar permisos al Tenant Admin (global)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Tenant Admin' 
AND p.clave IN (
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

-- 8. Asignar permisos al Supervisor (global)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Supervisor' 
AND p.clave IN (
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

-- 9. Asignar permisos al Perfil Básico (global)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Perfil Básico' 
AND p.clave IN (
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

-- 10. Reasignar rol Super Admin a Carlos.Irigoyen@gard.cl
DELETE FROM usuarios_roles 
WHERE usuario_id = (
  SELECT id FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl'
);

INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT 
  u.id as usuario_id,
  r.id as rol_id
FROM usuarios u, roles r
WHERE u.email = 'carlos.irigoyen@gard.cl'
AND r.nombre = 'Super Admin';

-- 11. Verificar resultado final
SELECT 'ROLES FINALES' as tipo, r.id, r.nombre, r.descripcion, r.tenant_id, t.nombre as tenant_nombre
FROM roles r
LEFT JOIN tenants t ON r.tenant_id = t.id
ORDER BY r.nombre;

-- 12. Verificar permisos por rol
SELECT 
  'PERMISOS POR ROL' as tipo,
  r.nombre as rol,
  COUNT(rp.permiso_id) as total_permisos
FROM roles r
LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
WHERE r.nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
GROUP BY r.id, r.nombre
ORDER BY r.nombre;

-- 13. Verificar asignación de Carlos.Irigoyen
SELECT 'CARLOS ASIGNACIÓN' as tipo,
  u.email,
  r.nombre as rol_asignado,
  r.descripcion
FROM usuarios u
JOIN usuarios_roles ur ON u.id = ur.usuario_id
JOIN roles r ON ur.rol_id = r.id
WHERE u.email = 'carlos.irigoyen@gard.cl';
