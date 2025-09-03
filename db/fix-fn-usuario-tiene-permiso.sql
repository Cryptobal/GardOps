-- CORRECCIÓN CRÍTICA: Función fn_usuario_tiene_permiso para usar RBAC
-- Esta función causaba errores "column rol does not exist" porque usaba campo legacy

-- Eliminar todas las versiones problemáticas
DROP FUNCTION IF EXISTS fn_usuario_tiene_permiso(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS fn_usuario_tiene_permiso(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS fn_usuario_tiene_permiso(TEXT) CASCADE;

-- Crear función única y correcta que usa RBAC
CREATE OR REPLACE FUNCTION fn_usuario_tiene_permiso(
  p_usuario_email TEXT,
  p_permiso_clave TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_tiene_permiso BOOLEAN := FALSE;
    v_es_admin BOOLEAN := FALSE;
BEGIN
    -- Verificar si es admin usando el sistema RBAC (sin campo rol legacy)
    SELECT EXISTS(
        SELECT 1 FROM usuarios u
        JOIN usuarios_roles ur ON u.id = ur.usuario_id  
        JOIN roles r ON ur.rol_id = r.id
        WHERE u.email = p_usuario_email 
        AND r.nombre IN ('Super Admin', 'Platform Admin', 'Tenant Admin')
    ) INTO v_es_admin;
    
    IF v_es_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar permiso específico usando RBAC completo
    SELECT EXISTS(
        SELECT 1 FROM usuarios u
        JOIN usuarios_roles ur ON u.id = ur.usuario_id
        JOIN roles r ON ur.rol_id = r.id
        JOIN roles_permisos rp ON r.id = rp.rol_id
        JOIN permisos p ON rp.permiso_id = p.id
        WHERE u.email = p_usuario_email 
        AND (p.clave = p_permiso_clave OR p.clave = SPLIT_PART(p_permiso_clave, '.', 1) || '.*')
    ) INTO v_tiene_permiso;
    
    RETURN v_tiene_permiso;
END;
$$ LANGUAGE plpgsql;
