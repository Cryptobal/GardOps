-- Script para verificar roles actuales
-- Ejecutar en Neon (SQL)

-- 1. Mostrar todos los roles existentes
SELECT 'ROLES EXISTENTES' as tipo, id, nombre, descripcion
FROM roles
ORDER BY nombre;

-- 2. Contar permisos por rol
SELECT 
  r.nombre as rol,
  COUNT(rp.permiso_id) as total_permisos
FROM roles r
LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
GROUP BY r.id, r.nombre
ORDER BY r.nombre;

-- 3. Mostrar permisos detallados por rol
SELECT 
  r.nombre as rol,
  p.clave as permiso,
  p.descripcion as descripcion_permiso,
  p.categoria as categoria_permiso
FROM roles r
LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
LEFT JOIN permisos p ON rp.permiso_id = p.id
ORDER BY r.nombre, p.categoria NULLS FIRST, p.clave;

-- 4. Verificar roles por tenant
SELECT 
  t.nombre as tenant,
  r.nombre as rol,
  COUNT(ur.usuario_id) as usuarios_asignados
FROM tenants t
LEFT JOIN roles r ON r.tenant_id = t.id
LEFT JOIN usuarios_roles ur ON ur.rol_id = r.id
GROUP BY t.id, t.nombre, r.id, r.nombre
ORDER BY t.nombre, r.nombre;

-- 5. Mostrar usuarios y sus roles
SELECT 
  u.email as usuario,
  t.nombre as tenant,
  STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
FROM usuarios u
LEFT JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
LEFT JOIN roles r ON ur.rol_id = r.id
GROUP BY u.id, u.email, t.nombre
ORDER BY u.email;

-- 6. Verificar permisos especiales del Super Admin
SELECT 
  'PERMISOS ESPECIALES SUPER ADMIN' as tipo,
  p.clave,
  p.descripcion
FROM roles r
JOIN roles_permisos rp ON r.id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.id
WHERE r.nombre = 'Super Admin'
AND (p.clave LIKE 'rbac.%' OR p.clave LIKE '%admin%' OR p.clave LIKE '%platform%')
ORDER BY p.clave;

-- 7. Verificar permisos básicos por módulo para cada rol
SELECT 
  r.nombre as rol,
  p.categoria as modulo,
  COUNT(p.id) as permisos_en_modulo,
  STRING_AGG(p.clave, ', ' ORDER BY p.clave) as permisos
FROM roles r
JOIN roles_permisos rp ON r.id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.id
WHERE p.categoria IS NOT NULL
GROUP BY r.id, r.nombre, p.categoria
ORDER BY r.nombre, p.categoria;
