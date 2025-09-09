-- Asignar TODOS los permisos del sistema al usuario carlos.irigoyen@gard.cl

-- Asignar TODOS los roles disponibles
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT 
  u.id as usuario_id,
  r.id as rol_id
FROM usuarios u
CROSS JOIN roles r
WHERE u.email = 'carlos.irigoyen@gard.cl'
  AND NOT EXISTS (
    SELECT 1 FROM usuarios_roles ur 
    WHERE ur.usuario_id = u.id AND ur.rol_id = r.id
  );

SELECT 'Roles asignados al usuario carlos.irigoyen@gard.cl' as resultado;
