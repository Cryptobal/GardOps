-- Script DEFINITIVO para arreglar TODOS los permisos en producción
-- Ejecutar directamente en Neon

-- 1. Asegurar que el usuario admin tiene el rol correcto
UPDATE public.usuarios 
SET rol = 'admin' 
WHERE lower(email) = lower('carlos.irigoyen@gard.cl');

-- 2. Crear TODOS los permisos necesarios si no existen
INSERT INTO public.permisos (clave, descripcion, categoria)
VALUES 
  ('clientes.view', 'Ver clientes', 'clientes'),
  ('clientes.create', 'Crear clientes', 'clientes'),
  ('clientes.update', 'Actualizar clientes', 'clientes'),
  ('clientes.delete', 'Eliminar clientes', 'clientes'),
  ('guardias.view', 'Ver guardias', 'guardias'),
  ('guardias.create', 'Crear guardias', 'guardias'),
  ('guardias.update', 'Actualizar guardias', 'guardias'),
  ('guardias.delete', 'Eliminar guardias', 'guardias'),
  ('instalaciones.view', 'Ver instalaciones', 'instalaciones'),
  ('instalaciones.create', 'Crear instalaciones', 'instalaciones'),
  ('instalaciones.update', 'Actualizar instalaciones', 'instalaciones'),
  ('instalaciones.delete', 'Eliminar instalaciones', 'instalaciones'),
  ('documentos.view', 'Ver documentos', 'documentos'),
  ('documentos.create', 'Crear documentos', 'documentos'),
  ('documentos.update', 'Actualizar documentos', 'documentos'),
  ('documentos.delete', 'Eliminar documentos', 'documentos'),
  ('usuarios.view', 'Ver usuarios', 'usuarios'),
  ('usuarios.create', 'Crear usuarios', 'usuarios'),
  ('usuarios.update', 'Actualizar usuarios', 'usuarios'),
  ('usuarios.delete', 'Eliminar usuarios', 'usuarios'),
  ('roles.view', 'Ver roles', 'roles'),
  ('roles.create', 'Crear roles', 'roles'),
  ('roles.update', 'Actualizar roles', 'roles'),
  ('roles.delete', 'Eliminar roles', 'roles'),
  ('permisos.view', 'Ver permisos', 'permisos'),
  ('permisos.assign', 'Asignar permisos', 'permisos')
ON CONFLICT (clave) DO NOTHING;

-- 3. Asegurar que el rol admin existe
INSERT INTO public.roles (nombre, descripcion)
SELECT 'admin', 'Rol de administrador con acceso completo'
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles WHERE nombre = 'admin'
);

-- 4. Asignar el usuario al rol admin (eliminar primero por si existe)
DELETE FROM public.usuarios_roles 
WHERE usuario_id = (SELECT id FROM public.usuarios WHERE lower(email) = lower('carlos.irigoyen@gard.cl'));

INSERT INTO public.usuarios_roles (usuario_id, rol_id)
SELECT 
  u.id,
  r.id
FROM public.usuarios u
CROSS JOIN public.roles r
WHERE lower(u.email) = lower('carlos.irigoyen@gard.cl')
  AND r.nombre = 'admin';

-- 5. Asignar TODOS los permisos al rol admin
-- Primero eliminar todos los permisos existentes del rol admin
DELETE FROM public.roles_permisos 
WHERE rol_id = (SELECT id FROM public.roles WHERE nombre = 'admin');

-- Luego asignar TODOS los permisos
INSERT INTO public.roles_permisos (rol_id, permiso_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre = 'admin';

-- 6. Crear o reemplazar las vistas necesarias
CREATE OR REPLACE VIEW public.v_usuarios_permisos AS
SELECT DISTINCT
  u.id as usuario_id,
  u.email,
  u.rol as usuario_rol,
  r.nombre as rol_nombre,
  p.clave as permiso_clave,
  p.descripcion as permiso_descripcion,
  p.categoria as permiso_categoria
FROM public.usuarios u
LEFT JOIN public.usuarios_roles ur ON ur.usuario_id = u.id
LEFT JOIN public.roles r ON r.id = ur.rol_id
LEFT JOIN public.roles_permisos rp ON rp.rol_id = r.id
LEFT JOIN public.permisos p ON p.id = rp.permiso_id
WHERE 1=1;

CREATE OR REPLACE VIEW public.v_check_permiso AS
SELECT 
  u.id as usuario_id,
  u.email,
  p.clave as permiso
FROM public.usuarios u
JOIN public.usuarios_roles ur ON ur.usuario_id = u.id
JOIN public.roles r ON r.id = ur.rol_id
JOIN public.roles_permisos rp ON rp.rol_id = r.id
JOIN public.permisos p ON p.id = rp.permiso_id
WHERE 1=1;

-- 7. Crear o reemplazar la función mejorada
CREATE OR REPLACE FUNCTION public.fn_usuario_tiene_permiso(
  p_usuario_id UUID,
  p_permiso_clave TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_tiene_permiso BOOLEAN;
  v_es_admin BOOLEAN;
BEGIN
  -- Verificar si el usuario es admin por rol
  SELECT EXISTS(
    SELECT 1 
    FROM public.usuarios 
    WHERE id = p_usuario_id 
      AND rol = 'admin'
  ) INTO v_es_admin;
  
  IF v_es_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si el usuario tiene el permiso específico
  SELECT EXISTS(
    SELECT 1
    FROM public.usuarios_roles ur
    JOIN public.roles r ON r.id = ur.rol_id
    JOIN public.roles_permisos rp ON rp.rol_id = r.id
    JOIN public.permisos p ON p.id = rp.permiso_id
    WHERE ur.usuario_id = p_usuario_id
      AND p.clave = p_permiso_clave

  ) INTO v_tiene_permiso;
  
  RETURN COALESCE(v_tiene_permiso, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Verificar que todo funcionó
SELECT 
  'Usuario:' as tipo,
  email,
  rol
FROM public.usuarios 
WHERE lower(email) = lower('carlos.irigoyen@gard.cl')

UNION ALL

SELECT 
  'Permisos totales:' as tipo,
  COUNT(*)::text as email,
  '' as rol
FROM public.permisos


UNION ALL

SELECT 
  'Permisos asignados:' as tipo,
  COUNT(*)::text as email,
  '' as rol
FROM public.v_usuarios_permisos
WHERE lower(email) = lower('carlos.irigoyen@gard.cl')

UNION ALL

SELECT 
  'Test clientes.view:' as tipo,
  public.fn_usuario_tiene_permiso(
    (SELECT id FROM public.usuarios WHERE lower(email) = lower('carlos.irigoyen@gard.cl')),
    'clientes.view'
  )::text as email,
  '' as rol

UNION ALL

SELECT 
  'Test guardias.view:' as tipo,
  public.fn_usuario_tiene_permiso(
    (SELECT id FROM public.usuarios WHERE lower(email) = lower('carlos.irigoyen@gard.cl')),
    'guardias.view'
  )::text as email,
  '' as rol

UNION ALL

SELECT 
  'Test instalaciones.view:' as tipo,
  public.fn_usuario_tiene_permiso(
    (SELECT id FROM public.usuarios WHERE lower(email) = lower('carlos.irigoyen@gard.cl')),
    'instalaciones.view'
  )::text as email,
  '' as rol;
