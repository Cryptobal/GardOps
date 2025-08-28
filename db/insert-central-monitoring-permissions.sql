-- Insertar permisos de Central de Monitoreo
-- Usando las tablas base de RBAC

-- Insertar permisos en la tabla base
INSERT INTO permisos (clave, descripcion, categoria) VALUES
  ('central_monitoring.view', 'Permite ver la Central de Monitoreo y sus datos', 'monitoring'),
  ('central_monitoring.record', 'Permite registrar el resultado de llamados de monitoreo', 'monitoring'),
  ('central_monitoring.configure', 'Permite configurar la cadencia y ventanas de monitoreo por instalación', 'monitoring'),
  ('central_monitoring.export', 'Permite exportar reportes y datos de monitoreo', 'monitoring')
ON CONFLICT (clave) DO UPDATE SET 
  descripcion = EXCLUDED.descripcion,
  categoria = EXCLUDED.categoria;

-- Crear rol Monitoring Operator (sin tenant_id para que sea global)
INSERT INTO roles (nombre, descripcion, tenant_id, activo) 
VALUES ('Central Monitoring Operator', 'Operador de Central de Monitoreo', NULL, true)
ON CONFLICT (nombre) DO UPDATE SET
  descripcion = EXCLUDED.descripcion,
  activo = EXCLUDED.activo;

-- Asignar permisos al rol
WITH r AS (
  SELECT id FROM roles WHERE nombre = 'Central Monitoring Operator'
), p AS (
  SELECT id FROM permisos WHERE clave IN ('central_monitoring.view','central_monitoring.record','central_monitoring.configure','central_monitoring.export')
)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM r, p
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Verificar inserción
SELECT 
  'Permisos insertados:' as resultado,
  COUNT(*) as total
FROM permisos 
WHERE clave LIKE 'central_monitoring.%';

SELECT 
  'Rol creado:' as resultado,
  nombre,
  descripcion
FROM roles 
WHERE nombre = 'Central Monitoring Operator';
