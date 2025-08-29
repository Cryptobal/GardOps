-- Script para estandarizar roles (Solo 4 roles estándar)
-- Ejecutar en Neon (SQL)

-- 1. ELIMINAR roles no estándar (antes de crear los estándar)
-- Eliminar permisos de roles no estándar
DELETE FROM roles_permisos 
WHERE rol_id IN (
  SELECT id FROM roles 
  WHERE nombre NOT IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
);

-- Eliminar asignaciones de usuarios a roles no estándar
DELETE FROM usuarios_roles 
WHERE rol_id IN (
  SELECT id FROM roles 
  WHERE nombre NOT IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
);

-- Eliminar roles no estándar
DELETE FROM roles 
WHERE nombre NOT IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico');

-- 2. Crear o actualizar roles estándar
INSERT INTO roles (nombre, descripcion) VALUES 
('Super Admin', 'Administrador del sistema con control total')
ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

INSERT INTO roles (nombre, descripcion) VALUES 
('Tenant Admin', 'Administrador de un tenant específico')
ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

INSERT INTO roles (nombre, descripcion) VALUES 
('Supervisor', 'Supervisor de operaciones')
ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

INSERT INTO roles (nombre, descripcion) VALUES 
('Perfil Básico', 'Usuario operativo básico')
ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

-- 3. Limpiar permisos existentes de todos los roles estándar
DELETE FROM roles_permisos 
WHERE rol_id IN (
  SELECT id FROM roles 
  WHERE nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
);

-- 4. Asignar permisos al Super Admin
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

-- 5. Asignar permisos al Tenant Admin
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

-- 6. Asignar permisos al Supervisor
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

-- 7. Asignar permisos al Perfil Básico
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

-- 8. Verificar resultado
SELECT 'ROLES ESTÁNDAR CREADOS' as resultado, COUNT(*) as total
FROM roles
WHERE nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico');

-- 9. Mostrar permisos por rol
SELECT 
  r.nombre as rol,
  COUNT(rp.permiso_id) as total_permisos,
  STRING_AGG(p.clave, ', ' ORDER BY p.clave) as permisos
FROM roles r
LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
LEFT JOIN permisos p ON rp.permiso_id = p.id
WHERE r.nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
GROUP BY r.id, r.nombre
ORDER BY r.nombre;

-- 10. Mostrar todos los roles finales
SELECT 'ROLES FINALES' as tipo, id, nombre, descripcion
FROM roles
ORDER BY nombre;
