-- Asignar rol de Central Monitoring Operator al usuario actual
-- Reemplaza 'tu-email@ejemplo.com' con tu email real

-- Opción 1: Asignar por email específico
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT u.id, r.id 
FROM usuarios u, roles r 
WHERE u.email = 'carlos.irigoyen@gard.cl'  -- Usuario Carlos
  AND r.nombre = 'Central Monitoring Operator'
ON CONFLICT (usuario_id, rol_id) DO NOTHING;

-- Opción 2: Asignar a todos los usuarios (para testing)
-- INSERT INTO usuarios_roles (usuario_id, rol_id)
-- SELECT u.id, r.id 
-- FROM usuarios u, roles r 
-- WHERE r.nombre = 'Central Monitoring Operator'
-- ON CONFLICT (usuario_id, rol_id) DO NOTHING;

-- Verificar asignación
SELECT 
  'Usuario con rol asignado:' as resultado,
  u.email,
  u.nombre,
  r.nombre as rol
FROM usuarios_roles ur
JOIN usuarios u ON ur.usuario_id = u.id
JOIN roles r ON ur.rol_id = r.id
WHERE r.nombre = 'Central Monitoring Operator';

-- Mostrar todos los usuarios disponibles
SELECT 
  'Usuarios disponibles:' as resultado,
  email,
  nombre
FROM usuarios
ORDER BY email;
