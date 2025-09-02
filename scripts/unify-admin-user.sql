-- ============================================
-- UNIFICAR USUARIO ADMIN Y SOLUCIONAR DEFINITIVAMENTE
-- ============================================

-- 1. Identificar el usuario correcto (el que tiene más permisos o el más reciente)
WITH usuario_principal AS (
  SELECT u.id
  FROM usuarios u
  LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
  LEFT JOIN roles r ON r.id = ur.rol_id
  LEFT JOIN roles_permisos rp ON rp.rol_id = ur.rol_id
  WHERE u.email = 'carlos.irigoyen@gard.cl'
  GROUP BY u.id
  ORDER BY COUNT(rp.permiso_id) DESC, u.fecha_creacion DESC
  LIMIT 1
)
-- Actualizar todos los usuarios con ese email para que sean admin
UPDATE usuarios 
SET rol = 'admin', activo = true
WHERE email = 'carlos.irigoyen@gard.cl';

-- 2. Asignar permisos al usuario principal
DO $$
DECLARE
  v_user_id uuid;
  v_role_id uuid;
  v_perm record;
BEGIN
  -- Obtener el usuario principal
  SELECT u.id INTO v_user_id
  FROM usuarios u
  LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
  LEFT JOIN roles r ON r.id = ur.rol_id
  LEFT JOIN roles_permisos rp ON rp.rol_id = ur.rol_id
  WHERE u.email = 'carlos.irigoyen@gard.cl'
  GROUP BY u.id
  ORDER BY COUNT(rp.permiso_id) DESC, u.fecha_creacion DESC
  LIMIT 1;
  
  -- Obtener el rol admin
  SELECT id INTO v_role_id 
  FROM roles 
  WHERE nombre = 'admin' OR nombre = 'Administrador' 
  ORDER BY nombre = 'Administrador' DESC
  LIMIT 1;
  
  IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
    -- Asignar rol admin a TODOS los usuarios con ese email
    FOR v_user_id IN SELECT id FROM usuarios WHERE email = 'carlos.irigoyen@gard.cl' LOOP
      -- Eliminar roles anteriores
      DELETE FROM usuarios_roles WHERE usuario_id = v_user_id;
      
      -- Asignar rol admin
      INSERT INTO usuarios_roles (usuario_id, rol_id, created_at)
      SELECT v_user_id, v_role_id, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM usuarios_roles 
        WHERE usuario_id = v_user_id AND rol_id = v_role_id
      );
    END LOOP;
    
    -- Asignar TODOS los permisos al rol admin
    FOR v_perm IN SELECT id FROM permisos LOOP
      INSERT INTO roles_permisos (rol_id, permiso_id, created_at)
      SELECT v_role_id, v_perm.id, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM roles_permisos 
        WHERE rol_id = v_role_id AND permiso_id = v_perm.id
      );
    END LOOP;
    
    RAISE NOTICE 'Todos los usuarios carlos.irigoyen@gard.cl actualizados con rol admin y permisos';
  END IF;
END $$;

-- 3. Crear función mejorada que verifica por email O por rol admin
CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_permiso(
    p_usuario_email TEXT,
    p_permiso_clave TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Si CUALQUIER usuario con ese email es admin, tiene todos los permisos
    IF EXISTS(
        SELECT 1 FROM usuarios 
        WHERE email = p_usuario_email AND rol = 'admin'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar permiso específico para CUALQUIER usuario con ese email
    RETURN EXISTS(
        SELECT 1 
        FROM usuarios u
        JOIN usuarios_roles ur ON ur.usuario_id = u.id
        JOIN roles r ON r.id = ur.rol_id
        JOIN roles_permisos rp ON rp.rol_id = r.id
        JOIN permisos p ON p.id = rp.permiso_id
        WHERE u.email = p_usuario_email 
        AND p.clave = p_permiso_clave
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Verificación final
SELECT 
    id,
    email,
    rol,
    activo,
    (SELECT COUNT(*) FROM usuarios_roles WHERE usuario_id = u.id) as roles_asignados
FROM usuarios u
WHERE email = 'carlos.irigoyen@gard.cl';

-- 5. Test de permisos
SELECT 
    'clientes.view' as permiso,
    public.fn_usuario_tiene_permiso('carlos.irigoyen@gard.cl', 'clientes.view') as tiene_permiso;

-- ============================================
-- FIN - TODOS los usuarios con ese email ahora son admin
-- ============================================
