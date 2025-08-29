-- Auditoría RBAC (solo lectura)
-- Reemplazar el email si fuese necesario

-- Usuario y estado
SELECT id, email, activo, tenant_id
FROM public.usuarios
WHERE lower(email)=lower('carlos.irigoyen@gard.cl');

-- Roles asignados y permisos efectivos (concedidos=true)
WITH me AS (
  SELECT id AS usuario_id, tenant_id
  FROM public.usuarios
  WHERE lower(email)=lower('carlos.irigoyen@gard.cl')
  LIMIT 1
)
SELECT r.id AS rol_id, r.nombre AS rol, r.tenant_id,
       p.clave AS permiso, true AS granted
FROM public.usuarios_roles ur
JOIN public.roles r           ON r.id = ur.rol_id
JOIN public.roles_permisos rp ON rp.rol_id = r.id
JOIN public.permisos p        ON p.id = rp.permiso_id
WHERE ur.usuario_id = (SELECT usuario_id FROM me)
ORDER BY r.nombre, p.clave;

-- Verificación específica de permisos requeridos por la UI
SELECT p.clave, EXISTS (
  SELECT 1
  FROM public.usuarios u
  JOIN public.usuarios_roles ur ON ur.usuario_id = u.id
  JOIN public.roles_permisos rp ON rp.rol_id = ur.rol_id AND TRUE = TRUE
  JOIN public.permisos p2 ON p2.id = rp.permiso_id
  WHERE lower(u.email)=lower('carlos.irigoyen@gard.cl') AND p2.clave = p.clave
) AS has_it
FROM (VALUES
  ('rbac.platform_admin'),
  ('usuarios.manage'),
  ('rbac.tenants.read'),
  ('rbac.tenants.create'),
  ('roles.manage'),
  ('permisos.read'),
  ('rbac.roles.read'),
  ('rbac.permisos.read')
) AS p(clave);

-- Tabla permisos existentes
SELECT id, clave FROM public.permisos ORDER BY clave;

-- Roles globales (tenant_id IS NULL) y de tu tenant
SELECT id, nombre, tenant_id FROM public.roles ORDER BY tenant_id NULLS FIRST, nombre;

-- Duplicados o grants conflictivos
SELECT rol_id, permiso_id, COUNT(*)
FROM public.roles_permisos
GROUP BY 1,2
HAVING COUNT(*) > 1;
