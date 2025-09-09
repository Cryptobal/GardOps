-- Script para verificar y corregir permisos de admin@demo.com
-- Ejecutar desde psql o desde la consola de Vercel

-- 1. Verificar si existe el usuario admin@demo.com
SELECT '=== VERIFICACIÓN DE USUARIO ===' as info;
SELECT id, email, nombre, tenant_id, rol 
FROM usuarios 
WHERE email = 'admin@demo.com';

-- 2. Verificar el tenant "Tenant Demo"
SELECT '=== VERIFICACIÓN DE TENANT ===' as info;
SELECT id, nombre 
FROM tenants 
WHERE nombre = 'Tenant Demo';

-- 3. Verificar roles del Tenant Demo
SELECT '=== ROLES DEL TENANT DEMO ===' as info;
SELECT id, nombre, descripcion, tenant_id 
FROM roles 
WHERE tenant_id = (SELECT id FROM tenants WHERE nombre = 'Tenant Demo')
ORDER BY nombre;

-- 4. Verificar roles asignados a admin@demo.com
SELECT '=== ROLES ASIGNADOS A ADMIN@DEMO.COM ===' as info;
SELECT r.id, r.nombre, r.descripcion, ur.rol_id
FROM usuarios_roles ur
JOIN roles r ON ur.rol_id = r.id
WHERE ur.usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@demo.com');

-- 5. Verificar permisos del rol Tenant Admin
SELECT '=== PERMISOS DEL ROL TENANT ADMIN ===' as info;
SELECT p.id, p.clave, p.descripcion
FROM roles_permisos rp
JOIN permisos p ON rp.permiso_id = p.id
WHERE rp.rol_id = (
  SELECT id FROM roles 
  WHERE nombre = 'Tenant Admin' 
  AND tenant_id = (SELECT id FROM tenants WHERE nombre = 'Tenant Demo')
)
ORDER BY p.clave;

-- 6. Asignar el rol Tenant Admin a admin@demo.com si no lo tiene
SELECT '=== ASIGNANDO ROL TENANT ADMIN ===' as info;
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT 
  (SELECT id FROM usuarios WHERE email = 'admin@demo.com'),
  (SELECT id FROM roles WHERE nombre = 'Tenant Admin' AND tenant_id = (SELECT id FROM tenants WHERE nombre = 'Tenant Demo'))
ON CONFLICT (usuario_id, rol_id) DO NOTHING;

-- 7. Verificar que se asignó correctamente
SELECT '=== VERIFICACIÓN FINAL ===' as info;
SELECT r.nombre, r.descripcion
FROM usuarios_roles ur
JOIN roles r ON ur.rol_id = r.id
WHERE ur.usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@demo.com');
