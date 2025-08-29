-- Script para asignar el rol Super Admin a Carlos.Irigoyen@gard.cl
-- Ejecutar en Neon (SQL)

-- 1. Verificar que Carlos.Irigoyen@gard.cl existe
SELECT 'VERIFICACIÓN USUARIO' as tipo, id, email, rol, tenant_id
FROM usuarios 
WHERE email = 'carlos.irigoyen@gard.cl';

-- 2. Verificar que el rol Super Admin existe
SELECT 'VERIFICACIÓN ROL' as tipo, id, nombre, descripcion
FROM roles 
WHERE nombre = 'Super Admin';

-- 3. Eliminar cualquier asignación previa de roles para Carlos.Irigoyen@gard.cl
DELETE FROM usuarios_roles 
WHERE usuario_id = (
  SELECT id FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl'
);

-- 4. Asignar el rol Super Admin a Carlos.Irigoyen@gard.cl
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT 
  u.id as usuario_id,
  r.id as rol_id
FROM usuarios u, roles r
WHERE u.email = 'carlos.irigoyen@gard.cl'
AND r.nombre = 'Super Admin';

-- 5. Verificar la asignación
SELECT 
  'ASIGNACIÓN VERIFICADA' as tipo,
  u.email,
  r.nombre as rol_asignado,
  r.descripcion
FROM usuarios u
JOIN usuarios_roles ur ON u.id = ur.usuario_id
JOIN roles r ON ur.rol_id = r.id
WHERE u.email = 'carlos.irigoyen@gard.cl';

-- 6. Verificar permisos totales de Carlos.Irigoyen@gard.cl
SELECT 
  'PERMISOS TOTALES CARLOS' as tipo,
  COUNT(p.id) as total_permisos,
  STRING_AGG(p.clave, ', ' ORDER BY p.clave) as permisos
FROM usuarios u
JOIN usuarios_roles ur ON u.id = ur.usuario_id
JOIN roles r ON ur.rol_id = r.id
JOIN roles_permisos rp ON r.id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.id
WHERE u.email = 'carlos.irigoyen@gard.cl'
GROUP BY u.id, u.email;

-- 7. Verificar permisos especiales de Carlos.Irigoyen@gard.cl
SELECT 
  'PERMISOS ESPECIALES CARLOS' as tipo,
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
