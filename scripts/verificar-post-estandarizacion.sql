-- Script para verificar el estado DESPUÉS de la estandarización
-- Ejecutar en Neon (SQL) para confirmar que todo está correcto

-- 1. Verificar que solo existen los 4 roles estándar
SELECT 'VERIFICACIÓN ROLES ESTÁNDAR' as tipo, id, nombre, descripcion
FROM roles
ORDER BY nombre;

-- 2. Contar permisos por rol estándar
SELECT 
  r.nombre as rol,
  COUNT(rp.permiso_id) as total_permisos
FROM roles r
LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
GROUP BY r.id, r.nombre
ORDER BY r.nombre;

-- 3. Verificar usuarios y sus roles actuales
SELECT 
  u.email as usuario,
  t.nombre as tenant,
  STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles_asignados
FROM usuarios u
LEFT JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
LEFT JOIN roles r ON ur.rol_id = r.id
GROUP BY u.id, u.email, t.nombre
ORDER BY u.email;

-- 4. Verificar específicamente Carlos.Irigoyen@gard.cl
SELECT 
  'CARLOS.IRIGOYEN VERIFICACIÓN' as tipo,
  u.email,
  u.rol,
  t.nombre as tenant,
  STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles_asignados,
  CASE 
    WHEN COUNT(r.id) = 0 THEN 'SIN ROLES ASIGNADOS'
    ELSE 'CON ROLES'
  END as estado
FROM usuarios u
LEFT JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
LEFT JOIN roles r ON ur.rol_id = r.id
WHERE u.email = 'carlos.irigoyen@gard.cl'
GROUP BY u.id, u.email, u.rol, t.nombre;

-- 5. Verificar permisos del Super Admin
SELECT 
  'PERMISOS SUPER ADMIN' as tipo,
  p.clave,
  p.descripcion
FROM roles r
JOIN roles_permisos rp ON r.id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.id
WHERE r.nombre = 'Super Admin'
ORDER BY p.clave;

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

-- 7. Verificar permisos básicos por módulo para Super Admin
SELECT 
  'PERMISOS BÁSICOS SUPER ADMIN' as tipo,
  p.clave,
  p.descripcion
FROM roles r
JOIN roles_permisos rp ON r.id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.id
WHERE r.nombre = 'Super Admin'
AND p.clave LIKE '%.view'
ORDER BY p.clave;

-- 8. Resumen final
SELECT 
  'RESUMEN FINAL' as tipo,
  COUNT(*) as total_roles,
  COUNT(CASE WHEN nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico') THEN 1 END) as roles_estandar,
  COUNT(CASE WHEN nombre NOT IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico') THEN 1 END) as roles_otros
FROM roles;

-- 9. Verificar usuarios sin roles asignados
SELECT 
  'USUARIOS SIN ROLES' as tipo,
  u.email,
  u.rol,
  t.nombre as tenant
FROM usuarios u
LEFT JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
WHERE ur.usuario_id IS NULL
ORDER BY u.email;
