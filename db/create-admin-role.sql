-- Script para crear el rol de Administrador con todos los permisos
-- Ejecutar en Neon (SQL)

-- 1. Crear el rol de administrador
INSERT INTO rbac_roles (tenant_id, code, name, description, is_system)
VALUES (NULL, 'admin', 'Administrador', 'Rol con acceso completo a todos los módulos del sistema', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system
RETURNING id, code, name;

-- 2. Obtener el ID del rol creado
DO $$
DECLARE
  admin_role_id UUID;
  permiso_record RECORD;
BEGIN
  -- Obtener el ID del rol admin
  SELECT id INTO admin_role_id FROM rbac_roles WHERE code = 'admin';
  
  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo encontrar el rol admin';
  END IF;
  
  -- Asignar todos los permisos al rol de admin
  FOR permiso_record IN 
    SELECT id FROM permisos ORDER BY clave
  LOOP
    INSERT INTO rbac_roles_permisos (role_id, permission_id)
    VALUES (admin_role_id, permiso_record.id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END LOOP;
  
  -- Mostrar resumen
  RAISE NOTICE 'Rol de administrador creado con ID: %', admin_role_id;
  RAISE NOTICE 'Permisos asignados: %', (SELECT COUNT(*) FROM rbac_roles_permisos WHERE role_id = admin_role_id);
END $$;

-- 3. Verificar el resultado
SELECT 
  r.id,
  r.code,
  r.name,
  r.description,
  COUNT(rp.permission_id) as total_permisos
FROM rbac_roles r
LEFT JOIN rbac_roles_permisos rp ON r.id = rp.role_id
WHERE r.code = 'admin'
GROUP BY r.id, r.code, r.name, r.description;
