-- Script para asignar permisos de platform_admin al usuario actual
-- Ejecutar directamente en la base de datos

-- 1. Verificar que el permiso rbac.platform_admin existe
INSERT INTO permisos (clave, descripcion, categoria)
VALUES ('rbac.platform_admin', 'Administrador de la plataforma - acceso total al sistema RBAC', 'RBAC')
ON CONFLICT (clave) DO NOTHING;

-- 2. Buscar el rol de admin (o crear uno si no existe)
INSERT INTO roles (nombre, descripcion, tenant_id)
VALUES ('admin', 'Administrador del sistema', NULL)
ON CONFLICT (tenant_id, nombre) DO NOTHING;

-- 3. Asignar el permiso rbac.platform_admin al rol de admin
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'admin' 
AND r.tenant_id IS NULL
AND p.clave = 'rbac.platform_admin'
ON CONFLICT DO NOTHING;

-- 4. Asignar el rol de admin al usuario carlos.irigoyen@gard.cl
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT u.id, r.id
FROM usuarios u
CROSS JOIN roles r
WHERE u.email = 'carlos.irigoyen@gard.cl'
AND r.nombre = 'admin'
AND r.tenant_id IS NULL
ON CONFLICT DO NOTHING;

-- 5. Verificar el resultado
SELECT 
  u.email,
  r.nombre as rol,
  p.clave as permiso,
  p.descripcion
FROM usuarios u
JOIN usuarios_roles ur ON ur.usuario_id = u.id
JOIN roles r ON r.id = ur.rol_id
JOIN roles_permisos rp ON rp.rol_id = r.id
JOIN permisos p ON p.id = rp.permiso_id
WHERE u.email = 'carlos.irigoyen@gard.cl'
AND p.clave = 'rbac.platform_admin';

-- 6. Mostrar todos los permisos del usuario
SELECT 
  u.email,
  r.nombre as rol,
  COUNT(p.id) as total_permisos,
  STRING_AGG(p.clave, ', ' ORDER BY p.clave) as permisos
FROM usuarios u
JOIN usuarios_roles ur ON ur.usuario_id = u.id
JOIN roles r ON r.id = ur.rol_id
JOIN roles_permisos rp ON rp.rol_id = r.id
JOIN permisos p ON p.id = rp.permiso_id
WHERE u.email = 'carlos.irigoyen@gard.cl'
GROUP BY u.email, r.nombre;
