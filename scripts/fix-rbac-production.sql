-- ============================================
-- SCRIPT DEFINITIVO PARA RESTAURAR RBAC
-- Ejecutar este script directamente en Neon
-- ============================================

-- 1. Actualizar rol del usuario admin
UPDATE usuarios 
SET rol = 'admin' 
WHERE email = 'carlos.irigoyen@gard.cl';

-- 2. Crear permisos básicos si no existen
INSERT INTO permisos (id, clave, descripcion, categoria) VALUES
  (gen_random_uuid(), 'clientes.view', 'Ver clientes', 'Clientes'),
  (gen_random_uuid(), 'clientes.create', 'Crear clientes', 'Clientes'),
  (gen_random_uuid(), 'clientes.edit', 'Editar clientes', 'Clientes'),
  (gen_random_uuid(), 'clientes.delete', 'Eliminar clientes', 'Clientes'),
  (gen_random_uuid(), 'guardias.view', 'Ver guardias', 'Guardias'),
  (gen_random_uuid(), 'guardias.create', 'Crear guardias', 'Guardias'),
  (gen_random_uuid(), 'guardias.edit', 'Editar guardias', 'Guardias'),
  (gen_random_uuid(), 'guardias.delete', 'Eliminar guardias', 'Guardias'),
  (gen_random_uuid(), 'instalaciones.view', 'Ver instalaciones', 'Instalaciones'),
  (gen_random_uuid(), 'instalaciones.create', 'Crear instalaciones', 'Instalaciones'),
  (gen_random_uuid(), 'instalaciones.edit', 'Editar instalaciones', 'Instalaciones'),
  (gen_random_uuid(), 'instalaciones.delete', 'Eliminar instalaciones', 'Instalaciones')
ON CONFLICT (clave) DO NOTHING;

-- 3. Crear rol admin si no existe (sin ON CONFLICT porque no hay constraint única)
INSERT INTO roles (id, nombre, descripcion, activo) 
SELECT gen_random_uuid(), 'admin', 'Administrador del sistema', true
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE nombre = 'admin' OR nombre = 'Administrador'
);

-- 4. Obtener IDs necesarios
DO $$
DECLARE
  v_user_id uuid;
  v_role_id uuid;
  v_perm record;
BEGIN
  -- Obtener ID del usuario
  SELECT id INTO v_user_id 
  FROM usuarios 
  WHERE email = 'carlos.irigoyen@gard.cl' 
  LIMIT 1;
  
  -- Obtener ID del rol admin
  SELECT id INTO v_role_id 
  FROM roles 
  WHERE nombre = 'admin' OR nombre = 'Administrador' 
  LIMIT 1;
  
  IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
    -- Eliminar asignaciones anteriores del usuario
    DELETE FROM usuarios_roles WHERE usuario_id = v_user_id;
    
    -- Asignar rol admin al usuario
    INSERT INTO usuarios_roles (usuario_id, rol_id, created_at)
    SELECT v_user_id, v_role_id, NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM usuarios_roles 
      WHERE usuario_id = v_user_id AND rol_id = v_role_id
    );
    
    -- Asignar TODOS los permisos al rol admin
    FOR v_perm IN SELECT id FROM permisos LOOP
      INSERT INTO roles_permisos (rol_id, permiso_id, created_at)
      SELECT v_role_id, v_perm.id, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM roles_permisos 
        WHERE rol_id = v_role_id AND permiso_id = v_perm.id
      );
    END LOOP;
    
    RAISE NOTICE 'Usuario % asignado al rol admin con todos los permisos', v_user_id;
  ELSE
    RAISE EXCEPTION 'Usuario o rol no encontrado';
  END IF;
END $$;

-- 5. Crear o reemplazar la vista v_check_permiso
CREATE OR REPLACE VIEW v_check_permiso AS
SELECT
    u.email,
    p.clave AS permiso
FROM usuarios u
JOIN usuarios_roles ur ON ur.usuario_id = u.id
JOIN roles r ON r.id = ur.rol_id
JOIN roles_permisos rp ON rp.rol_id = r.id
JOIN permisos p ON p.id = rp.permiso_id
WHERE u.activo = TRUE OR u.activo IS NULL;

-- 6. Crear o reemplazar función de verificación de permisos
CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_permiso(
    p_usuario_email TEXT,
    p_permiso_clave TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_tiene_permiso BOOLEAN := FALSE;
    v_es_admin BOOLEAN := FALSE;
BEGIN
    -- Verificar si es admin (admin tiene todos los permisos)
    SELECT EXISTS(
        SELECT 1 FROM usuarios 
        WHERE email = p_usuario_email AND rol = 'admin'
    ) INTO v_es_admin;
    
    IF v_es_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar permiso específico
    SELECT EXISTS(
        SELECT 1 FROM v_check_permiso 
        WHERE email = p_usuario_email AND permiso = p_permiso_clave
    ) INTO v_tiene_permiso;
    
    RETURN v_tiene_permiso;
END;
$$ LANGUAGE plpgsql;

-- 7. Verificación final
SELECT 
    u.email,
    r.nombre as rol,
    COUNT(DISTINCT p.id) as total_permisos
FROM usuarios u
JOIN usuarios_roles ur ON ur.usuario_id = u.id
JOIN roles r ON r.id = ur.rol_id
JOIN roles_permisos rp ON rp.rol_id = r.id
JOIN permisos p ON p.id = rp.permiso_id
WHERE u.email = 'carlos.irigoyen@gard.cl'
GROUP BY u.email, r.nombre;

-- 8. Test de permisos
SELECT 
    'clientes.view' as permiso,
    public.fn_usuario_tiene_permiso('carlos.irigoyen@gard.cl', 'clientes.view') as tiene_permiso
UNION ALL
SELECT 
    'guardias.view' as permiso,
    public.fn_usuario_tiene_permiso('carlos.irigoyen@gard.cl', 'guardias.view') as tiene_permiso
UNION ALL
SELECT 
    'instalaciones.view' as permiso,
    public.fn_usuario_tiene_permiso('carlos.irigoyen@gard.cl', 'instalaciones.view') as tiene_permiso;

-- ============================================
-- FIN DEL SCRIPT
-- Si todo sale bien, deberías ver:
-- - Total de permisos asignados (debe ser > 100)
-- - Los 3 permisos básicos como TRUE
-- ============================================
