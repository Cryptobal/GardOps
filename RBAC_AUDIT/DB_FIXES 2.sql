-- FIXES IDEMPOTENTES (NO EJECUTAR AÚN)
-- Objetivo: asegurar Platform Admin global y asignación al usuario de prueba

-- 1) Asegurar permisos requeridos por la UI existen en `permisos`
INSERT INTO public.permisos (id, tenant_id, nombre, clave)
SELECT gen_random_uuid(), NULL, x.nombre, x.clave
FROM (VALUES
  ('Admin Plataforma', 'rbac.platform_admin'),
  ('Lectura Roles', 'rbac.roles.read'),
  ('Lectura Permisos', 'rbac.permisos.read'),
  ('Gestionar Usuarios', 'usuarios.manage'),
  ('Tenants Read', 'rbac.tenants.read'),
  ('Tenants Create', 'rbac.tenants.create')
) AS x(nombre, clave)
ON CONFLICT (tenant_id, clave) DO NOTHING;

-- 2) Asegurar rol Platform Admin global
INSERT INTO public.roles (id, tenant_id, nombre, clave)
VALUES (gen_random_uuid(), NULL, 'Platform Admin', 'platform_admin')
ON CONFLICT (tenant_id, clave) DO NOTHING;

-- 3) Conectar rol Platform Admin con todos los permisos requeridos
INSERT INTO public.roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permisos p ON p.clave IN (
  'rbac.platform_admin',
  'rbac.roles.read',
  'rbac.permisos.read',
  'usuarios.manage',
  'rbac.tenants.read',
  'rbac.tenants.create'
) AND p.tenant_id IS NULL
WHERE r.clave='platform_admin' AND r.tenant_id IS NULL
ON CONFLICT DO NOTHING;

-- 4) Asegurar usuario está activo y asignado al rol Platform Admin global
-- 4a) Activar usuario si existe; si no, no crear (auditoría)
UPDATE public.usuarios
SET activo = TRUE
WHERE lower(email)=lower('carlos.irigoyen@gard.cl');

-- 4b) Asignar rol Platform Admin al usuario
INSERT INTO public.usuarios_roles (usuario_id, rol_id)
SELECT u.id, r.id
FROM public.usuarios u
JOIN public.roles r ON r.clave='platform_admin' AND r.tenant_id IS NULL
WHERE lower(u.email)=lower('carlos.irigoyen@gard.cl')
ON CONFLICT DO NOTHING;

-- (Opcional) Asignar rol admin del tenant activo si existe
INSERT INTO public.usuarios_roles (usuario_id, rol_id)
SELECT u.id, r.id
FROM public.usuarios u
JOIN public.roles r ON r.nombre='Admin' AND r.tenant_id = u.tenant_id
WHERE lower(u.email)=lower('carlos.irigoyen@gard.cl')
ON CONFLICT DO NOTHING;
