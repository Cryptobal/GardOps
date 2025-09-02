-- Verificar usuarios duplicados
SELECT 
    id,
    email,
    rol,
    activo,
    tenant_id,
    fecha_creacion
FROM usuarios 
WHERE email = 'carlos.irigoyen@gard.cl'
ORDER BY fecha_creacion DESC;

-- Ver cuál tiene permisos asignados
SELECT 
    u.id,
    u.email,
    r.nombre as rol_asignado,
    COUNT(rp.permiso_id) as total_permisos
FROM usuarios u
LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
LEFT JOIN roles r ON r.id = ur.rol_id
LEFT JOIN roles_permisos rp ON rp.rol_id = ur.rol_id
WHERE u.email = 'carlos.irigoyen@gard.cl'
GROUP BY u.id, u.email, r.nombre
ORDER BY total_permisos DESC;
