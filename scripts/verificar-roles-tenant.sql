-- Script para verificar el estado de los roles y sus tenant_id
-- Ejecutar en Neon (SQL)

-- 1. Verificar todos los roles y sus tenant_id
SELECT 'ROLES Y TENANT_ID' as tipo, id, nombre, descripcion, tenant_id
FROM roles
ORDER BY nombre;

-- 2. Verificar si los roles estándar tienen tenant_id
SELECT 'ROLES ESTÁNDAR SIN TENANT' as tipo, id, nombre, descripcion
FROM roles
WHERE nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
AND tenant_id IS NULL;

-- 3. Verificar tenant de Carlos.Irigoyen@gard.cl
SELECT 'TENANT DE CARLOS' as tipo, u.email, u.tenant_id, t.nombre as tenant_nombre
FROM usuarios u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'carlos.irigoyen@gard.cl';

-- 4. Verificar tenant de admin@demo.com
SELECT 'TENANT DE ADMIN DEMO' as tipo, u.email, u.tenant_id, t.nombre as tenant_nombre
FROM usuarios u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'admin@demo.com';

-- 5. Verificar todos los tenants
SELECT 'TODOS LOS TENANTS' as tipo, id, nombre, descripcion
FROM tenants
ORDER BY nombre;

-- 6. Asignar tenant_id a roles estándar (si no lo tienen)
-- Primero, obtener el tenant_id de Gard
SELECT 'TENANT GARD ID' as tipo, id, nombre
FROM tenants
WHERE nombre = 'Gard';

-- 7. Actualizar roles estándar para que pertenezcan al tenant Gard
UPDATE roles 
SET tenant_id = (SELECT id FROM tenants WHERE nombre = 'Gard')
WHERE nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
AND tenant_id IS NULL;

-- 8. Verificar resultado después de la actualización
SELECT 'ROLES DESPUÉS DE ACTUALIZACIÓN' as tipo, r.id, r.nombre, r.descripcion, r.tenant_id, t.nombre as tenant_nombre
FROM roles r
LEFT JOIN tenants t ON r.tenant_id = t.id
WHERE r.nombre IN ('Super Admin', 'Tenant Admin', 'Supervisor', 'Perfil Básico')
ORDER BY r.nombre;

-- 9. Verificar roles por tenant
SELECT 'ROLES POR TENANT' as tipo, t.nombre as tenant, COUNT(r.id) as total_roles, STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
FROM tenants t
LEFT JOIN roles r ON t.id = r.tenant_id
GROUP BY t.id, t.nombre
ORDER BY t.nombre;
