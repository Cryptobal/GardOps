-- Script para verificar roles y permisos actuales
-- Ejecutar en Neon (SQL)

-- 1. Verificar qué tablas RBAC existen
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%rol%' OR table_name LIKE '%perm%' OR table_name LIKE '%rbac%')
ORDER BY table_name;

-- 2. Listar todos los tenants
SELECT id, nombre, slug, activo
FROM tenants
ORDER BY nombre;

-- 3. Listar todos los roles por tenant
SELECT r.id, r.nombre, r.descripcion, r.tenant_id, t.nombre as tenant_nombre
FROM roles r
LEFT JOIN tenants t ON r.tenant_id = t.id
ORDER BY t.nombre NULLS FIRST, r.nombre;

-- 4. Listar todos los permisos
SELECT id, clave, descripcion, categoria
FROM permisos
ORDER BY categoria NULLS FIRST, clave;

-- 5. Mostrar permisos por rol
SELECT 
  r.id as rol_id,
  r.nombre as rol_nombre,
  r.tenant_id,
  t.nombre as tenant_nombre,
  p.clave as permiso_clave,
  p.descripcion as permiso_descripcion
FROM roles r
LEFT JOIN tenants t ON r.tenant_id = t.id
LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
LEFT JOIN permisos p ON rp.permiso_id = p.id
ORDER BY t.nombre NULLS FIRST, r.nombre, p.clave;

-- 6. Verificar usuarios y sus roles
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.tenant_id,
  t.nombre as tenant_nombre,
  r.nombre as rol_nombre
FROM usuarios u
LEFT JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
LEFT JOIN roles r ON ur.rol_id = r.id
WHERE u.activo = true
ORDER BY t.nombre NULLS FIRST, u.email;

-- 7. Resumen estadístico
SELECT 
  (SELECT COUNT(*) FROM tenants) as total_tenants,
  (SELECT COUNT(*) FROM roles) as total_roles,
  (SELECT COUNT(*) FROM permisos) as total_permisos,
  (SELECT COUNT(*) FROM usuarios WHERE activo = true) as total_usuarios_activos,
  (SELECT COUNT(*) FROM usuarios_roles) as total_asignaciones_roles,
  (SELECT COUNT(*) FROM roles_permisos) as total_asignaciones_permisos;

-- 8. Verificar roles por tenant
SELECT 
  t.nombre as tenant_nombre,
  COUNT(r.id) as total_roles
FROM tenants t
LEFT JOIN roles r ON t.id = r.tenant_id
GROUP BY t.id, t.nombre
ORDER BY t.nombre;

-- 9. Roles globales (sin tenant)
SELECT COUNT(*) as total_roles_globales
FROM roles
WHERE tenant_id IS NULL;

-- 10. Verificar si hay roles duplicados por tenant
SELECT tenant_id, nombre, COUNT(*) as duplicados
FROM roles
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id, nombre
HAVING COUNT(*) > 1;

-- 11. Verificar permisos por categoría
SELECT categoria, COUNT(*) as total_permisos
FROM permisos
GROUP BY categoria
ORDER BY categoria NULLS FIRST;

-- 12. Verificar asignaciones de permisos por rol
SELECT 
  r.nombre as rol_nombre,
  t.nombre as tenant_nombre,
  COUNT(rp.permiso_id) as total_permisos
FROM roles r
LEFT JOIN tenants t ON r.tenant_id = t.id
LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
GROUP BY r.id, r.nombre, t.nombre
ORDER BY t.nombre NULLS FIRST, r.nombre;
