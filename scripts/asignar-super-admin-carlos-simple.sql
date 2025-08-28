-- Script simple para asignar Super Admin a Carlos.Irigoyen@gard.cl
-- Ejecutar en Neon (SQL)

-- 1. Verificar estado actual
SELECT 'ESTADO ACTUAL' as tipo, u.email, u.rol, t.nombre as tenant
FROM usuarios u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'carlos.irigoyen@gard.cl';

-- 2. Verificar roles existentes
SELECT 'ROLES EXISTENTES' as tipo, id, nombre, descripcion
FROM roles
ORDER BY nombre;

-- 3. Verificar si Carlos tiene roles asignados
SELECT 'ROLES DE CARLOS' as tipo, 
  u.email,
  STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles_asignados
FROM usuarios u
LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
LEFT JOIN roles r ON ur.rol_id = r.id
WHERE u.email = 'carlos.irigoyen@gard.cl'
GROUP BY u.id, u.email;

-- 4. Eliminar roles previos de Carlos (si los tiene)
DELETE FROM usuarios_roles 
WHERE usuario_id = (
  SELECT id FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl'
);

-- 5. Asignar rol Super Admin a Carlos
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT 
  u.id as usuario_id,
  r.id as rol_id
FROM usuarios u, roles r
WHERE u.email = 'carlos.irigoyen@gard.cl'
AND r.nombre = 'Super Admin';

-- 6. Verificar asignación
SELECT 'ASIGNACIÓN VERIFICADA' as tipo,
  u.email,
  r.nombre as rol_asignado,
  r.descripcion
FROM usuarios u
JOIN usuarios_roles ur ON u.id = ur.usuario_id
JOIN roles r ON ur.rol_id = r.id
WHERE u.email = 'carlos.irigoyen@gard.cl';

-- 7. Verificar permisos totales
SELECT 'PERMISOS TOTALES' as tipo,
  COUNT(p.id) as total_permisos
FROM usuarios u
JOIN usuarios_roles ur ON u.id = ur.usuario_id
JOIN roles r ON ur.rol_id = r.id
JOIN roles_permisos rp ON r.id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.id
WHERE u.email = 'carlos.irigoyen@gard.cl';

-- 8. Verificar permisos especiales
SELECT 'PERMISOS ESPECIALES' as tipo,
  p.clave,
  p.descripcion
FROM usuarios u
JOIN usuarios_roles ur ON u.id = ur.usuario_id
JOIN roles r ON ur.rol_id = r.id
JOIN roles_permisos rp ON r.id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.id
WHERE u.email = 'carlos.irigoyen@gard.cl'
AND (p.clave LIKE 'rbac.%' OR p.clave LIKE '%admin%' OR p.clave LIKE '%platform%')
ORDER BY p.clave;
