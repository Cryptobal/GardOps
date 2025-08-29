-- Corregir errores del Central de Monitoreo

-- 1. Eliminar vista existente y recrearla
DROP VIEW IF EXISTS central_v_turnos_activos;

-- 2. Recrear vista con estructura correcta
CREATE OR REPLACE VIEW central_v_turnos_activos AS
SELECT 
  i.id as instalacion_id,
  i.nombre as instalacion_nombre,
  i.telefono as instalacion_telefono,
  g.id as guardia_id,
  COALESCE(CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre), 'Sin asignar') as guardia_nombre,
  g.telefono as guardia_telefono,
  rs.nombre as rol_nombre,
  rs.hora_inicio,
  rs.hora_termino,
  po.nombre_puesto,
  po.id as puesto_id,
  pm.estado as estado_pauta,
  pm.anio,
  pm.mes,
  pm.dia,
  pm.id as pauta_id,
  cci.habilitado as monitoreo_habilitado,
  cci.intervalo_minutos,
  cci.ventana_inicio,
  cci.ventana_fin,
  cci.modo,
  cci.mensaje_template
FROM instalaciones i
INNER JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id
INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
LEFT JOIN as_turnos_pauta_mensual pm ON pm.puesto_id = po.id
LEFT JOIN guardias g ON pm.guardia_id = g.id
LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
WHERE po.activo = true
  AND pm.estado = 'Activo'
  AND cci.habilitado = true;

-- 3. Insertar permisos correctamente
INSERT INTO permisos (clave, descripcion, categoria) VALUES
('central_monitoring.view', 'Ver Central de Monitoreo', 'central_monitoring'),
('central_monitoring.record', 'Registrar Llamadas', 'central_monitoring'),
('central_monitoring.configure', 'Configurar Monitoreo', 'central_monitoring'),
('central_monitoring.export', 'Exportar Reportes', 'central_monitoring')
ON CONFLICT (clave) DO NOTHING;

-- 4. Insertar rol correctamente
INSERT INTO roles (nombre, descripcion) VALUES
('central_monitoring.operator', 'Operador de Central de Monitoreo')
ON CONFLICT (nombre) DO NOTHING;

-- 5. Asignar permisos al rol
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id 
FROM roles r, permisos p 
WHERE r.nombre = 'central_monitoring.operator' 
  AND p.clave IN ('central_monitoring.view', 'central_monitoring.record', 'central_monitoring.configure', 'central_monitoring.export')
ON CONFLICT DO NOTHING;
