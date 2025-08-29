-- Corregir permisos del Central de Monitoreo

-- 1. Insertar permisos correctamente
INSERT INTO permisos (clave, descripcion, categoria) VALUES
('central_monitoring.view', 'Ver Central de Monitoreo', 'central_monitoring'),
('central_monitoring.record', 'Registrar Llamadas', 'central_monitoring'),
('central_monitoring.configure', 'Configurar Monitoreo', 'central_monitoring'),
('central_monitoring.export', 'Exportar Reportes', 'central_monitoring')
ON CONFLICT (clave) DO NOTHING;

-- 2. Insertar rol correctamente (sin tenant_id para rol global)
INSERT INTO roles (nombre, descripcion) VALUES
('central_monitoring.operator', 'Operador de Central de Monitoreo')
ON CONFLICT (tenant_id, nombre) DO NOTHING;

-- 3. Asignar permisos al rol
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id 
FROM roles r, permisos p 
WHERE r.nombre = 'central_monitoring.operator' 
  AND r.tenant_id IS NULL
  AND p.clave IN ('central_monitoring.view', 'central_monitoring.record', 'central_monitoring.configure', 'central_monitoring.export')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 4. Asignar rol al usuario carlos.irigoyen@gard.cl
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT u.id, r.id
FROM usuarios u, roles r
WHERE u.email = 'carlos.irigoyen@gard.cl'
  AND r.nombre = 'central_monitoring.operator'
  AND r.tenant_id IS NULL

