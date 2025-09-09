-- 1. Crear configuración de monitoreo para todas las instalaciones con turnos planificados hoy
INSERT INTO central_config_instalacion (
  instalacion_id,
  habilitado,
  intervalo_minutos,
  ventana_inicio,
  ventana_fin,
  modo,
  mensaje_template,
  created_at,
  updated_at
)
SELECT DISTINCT
  i.id as instalacion_id,
  true as habilitado,
  60 as intervalo_minutos,
  '21:00'::time as ventana_inicio,
  '07:00'::time as ventana_fin,
  'whatsapp' as modo,
  'Hola, soy de la central de monitoreo. ¿Todo bien en la instalación?' as mensaje_template,
  NOW() as created_at,
  NOW() as updated_at
FROM instalaciones i
INNER JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id
INNER JOIN as_turnos_pauta_mensual pm ON pm.puesto_id = po.id
WHERE pm.estado = 'planificado'
  AND po.activo = true
  AND pm.anio = EXTRACT(YEAR FROM CURRENT_DATE)
  AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE)
  AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE)
  AND NOT EXISTS (
    SELECT 1 FROM central_config_instalacion cci 
    WHERE cci.instalacion_id = i.id
  )
;

-- 2. Habilitar monitoreo para instalaciones que ya tienen configuración pero están deshabilitadas
UPDATE central_config_instalacion 
SET habilitado = true, updated_at = NOW()
WHERE habilitado = false;

-- 2. Verificar que el usuario carlos.irigoyen@gard.cl tenga TODOS los permisos
-- Asignar rol de super admin si no lo tiene
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT 
  u.id as usuario_id,
  r.id as rol_id
FROM usuarios u
CROSS JOIN roles r
WHERE u.email = 'carlos.irigoyen@gard.cl'
  AND r.nombre IN ('admin', 'super_admin', 'central_monitoring.operator')
  AND NOT EXISTS (
    SELECT 1 FROM usuarios_roles ur 
    WHERE ur.usuario_id = u.id AND ur.rol_id = r.id
  );

-- 3. Verificar permisos específicos del central de monitoreo
INSERT INTO usuarios_permisos (usuario_id, permiso_id)
SELECT 
  u.id as usuario_id,
  p.id as permiso_id
FROM usuarios u
CROSS JOIN permisos p
WHERE u.email = 'carlos.irigoyen@gard.cl'
  AND p.clave LIKE 'central_monitoring%'
  AND NOT EXISTS (
    SELECT 1 FROM usuarios_permisos up 
    WHERE up.usuario_id = u.id AND up.permiso_id = p.id
  );

-- 4. Verificar que el usuario tenga todos los permisos del sistema
SELECT 
  'Permisos del usuario carlos.irigoyen@gard.cl:' as info;
SELECT 
  p.clave,
  p.nombre,
  p.categoria
FROM usuarios u
INNER JOIN usuarios_permisos up ON up.usuario_id = u.id
INNER JOIN permisos p ON p.id = up.permiso_id
WHERE u.email = 'carlos.irigoyen@gard.cl'
ORDER BY p.categoria, p.clave;

-- 5. Verificar roles del usuario
SELECT 
  'Roles del usuario carlos.irigoyen@gard.cl:' as info;
SELECT 
  r.nombre,
  r.descripcion
FROM usuarios u
INNER JOIN usuarios_roles ur ON ur.usuario_id = u.id
INNER JOIN roles r ON r.id = ur.rol_id
WHERE u.email = 'carlos.irigoyen@gard.cl'
ORDER BY r.nombre;
