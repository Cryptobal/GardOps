-- Script para verificar estado actual de roles ANTES de la estandarización
-- Ejecutar en Neon (SQL) ANTES de ejecutar estandarizar-roles.sql

-- 1. Mostrar todos los roles existentes actualmente
SELECT 'ROLES EXISTENTES ACTUALMENTE' as tipo, id, nombre, descripcion
FROM roles
ORDER BY nombre;

-- 2. Contar permisos por rol actual
SELECT 
  r.nombre as rol,
  COUNT(rp.permiso_id) as total_permisos
FROM roles r
LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
GROUP BY r.id, r.nombre
ORDER BY r.nombre;

-- 3. Mostrar usuarios y sus roles actuales
SELECT 
  u.email as usuario,
  t.nombre as tenant,
  STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles_actuales
FROM usuarios u
LEFT JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
LEFT JOIN roles r ON ur.rol_id = r.id
GROUP BY u.id, u.email, t.nombre
ORDER BY u.email;

-- 4. Identificar roles que se eliminarán
SELECT 'ROLES QUE SE ELIMINARÁN' as tipo, nombre, descripcion
FROM roles
WHERE nombre NOT IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
ORDER BY nombre;

-- 5. Contar usuarios afectados por eliminación de roles
SELECT 
  r.nombre as rol_a_eliminar,
  COUNT(ur.usuario_id) as usuarios_afectados,
  STRING_AGG(u.email, ', ' ORDER BY u.email) as usuarios
FROM roles r
LEFT JOIN usuarios_roles ur ON ur.rol_id = r.id
LEFT JOIN usuarios u ON ur.usuario_id = u.id
WHERE r.nombre NOT IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
GROUP BY r.id, r.nombre
ORDER BY r.nombre;

-- 6. Verificar permisos especiales del Super Admin actual
SELECT 
  'PERMISOS ESPECIALES SUPER ADMIN ACTUAL' as tipo,
  p.clave,
  p.descripcion
FROM roles r
JOIN roles_permisos rp ON r.id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.id
WHERE r.nombre = 'Super Admin'
AND (p.clave LIKE 'rbac.%' OR p.clave LIKE '%admin%' OR p.clave LIKE '%platform%')
ORDER BY p.clave;

-- 7. Resumen de impacto
SELECT 
  'RESUMEN DE IMPACTO' as tipo,
  COUNT(*) as total_roles_actuales,
  COUNT(CASE WHEN nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico') THEN 1 END) as roles_que_se_mantienen,
  COUNT(CASE WHEN nombre NOT IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico') THEN 1 END) as roles_que_se_eliminan
FROM roles;
