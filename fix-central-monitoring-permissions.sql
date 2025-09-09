-- Script para verificar y corregir permisos de Central de Monitoreo
-- Ejecutar en la base de datos

-- 1. Verificar si los permisos existen
SELECT 'Verificando permisos existentes...' as info;
SELECT code, description FROM rbac_permisos WHERE code LIKE 'central_monitoring.%';

-- 2. Insertar permisos si no existen
INSERT INTO rbac_permisos (code, description) VALUES
  ('central_monitoring.view', 'Ver Central de Monitoreo'),
  ('central_monitoring.record', 'Registrar estados de llamados'),
  ('central_monitoring.configure', 'Configurar cadencia/ventanas por instalación'),
  ('central_monitoring.export', 'Exportar y ver reportes de monitoreo')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- 3. Verificar rol de operador
SELECT 'Verificando rol de operador...' as info;
SELECT * FROM rbac_roles WHERE code = 'central_monitoring.operator';

-- 4. Crear rol si no existe
INSERT INTO rbac_roles (tenant_id, code, name, description, is_system)
VALUES (NULL, 'central_monitoring.operator', 'Central Monitoring Operator', 'Operador de Central de Monitoreo', false)
ON CONFLICT (tenant_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 5. Obtener IDs
DO $$
DECLARE
  rol_id UUID;
  perm_view_id UUID;
  perm_record_id UUID;
  perm_configure_id UUID;
  perm_export_id UUID;
BEGIN
  -- Obtener ID del rol
  SELECT id INTO rol_id FROM rbac_roles WHERE code = 'central_monitoring.operator' AND tenant_id IS NULL;
  
  -- Obtener IDs de permisos
  SELECT id INTO perm_view_id FROM rbac_permisos WHERE code = 'central_monitoring.view';
  SELECT id INTO perm_record_id FROM rbac_permisos WHERE code = 'central_monitoring.record';
  SELECT id INTO perm_configure_id FROM rbac_permisos WHERE code = 'central_monitoring.configure';
  SELECT id INTO perm_export_id FROM rbac_permisos WHERE code = 'central_monitoring.export';
  
  -- Asignar permisos al rol
  INSERT INTO rbac_roles_permisos (rol_id, permiso_id) VALUES
    (rol_id, perm_view_id),
    (rol_id, perm_record_id),
    (rol_id, perm_configure_id),
    (rol_id, perm_export_id)
  ON CONFLICT (rol_id, permiso_id) DO NOTHING;
  
  RAISE NOTICE 'Permisos asignados al rol central_monitoring.operator';
END $$;

-- 6. Verificar asignaciones
SELECT 'Verificando asignaciones de permisos...' as info;
SELECT 
  r.name as rol,
  p.code as permiso,
  p.description as descripcion_permiso
FROM rbac_roles r
JOIN rbac_roles_permisos rp ON r.id = rp.rol_id
JOIN rbac_permisos p ON rp.permiso_id = p.id
WHERE r.code = 'central_monitoring.operator';

-- 7. Verificar tabla central_llamados
SELECT 'Verificando tabla central_llamados...' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'central_llamados'
ORDER BY ordinal_position;

-- 8. Verificar datos de ejemplo
SELECT 'Verificando datos de ejemplo...' as info;
SELECT COUNT(*) as total_llamados FROM central_llamados;
SELECT estado, COUNT(*) as cantidad FROM central_llamados GROUP BY estado;
