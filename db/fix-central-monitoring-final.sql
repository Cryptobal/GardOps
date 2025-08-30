-- =====================================================
-- CORRECCIÓN FINAL DEL CENTRAL DE MONITOREO
-- =====================================================

-- 1. Crear tabla central_config_instalacion si no existe
CREATE TABLE IF NOT EXISTS central_config_instalacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
  habilitado BOOLEAN DEFAULT false,
  intervalo_minutos INT DEFAULT 60 CHECK (intervalo_minutos > 0),
  ventana_inicio TIME DEFAULT '21:00',
  ventana_fin TIME DEFAULT '07:00',
  modo VARCHAR(20) DEFAULT 'whatsapp' CHECK (modo IN ('whatsapp', 'telefonico')),
  mensaje_template TEXT DEFAULT 'Hola, soy de la central de monitoreo. ¿Todo bien en la instalación?',
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instalacion_id, tenant_id)
);

-- 2. Crear tabla central_llamados si no existe
CREATE TABLE IF NOT EXISTS central_llamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
  guardia_id UUID REFERENCES guardias(id) ON DELETE SET NULL,
  pauta_id UUID REFERENCES as_turnos_pauta_mensual(id) ON DELETE CASCADE,
  programado_para TIMESTAMPTZ NOT NULL,
  ejecutado_en TIMESTAMPTZ,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'exitoso', 'no_contesta', 'ocupado', 'incidente', 'cancelado')),
  contacto_tipo VARCHAR(20) DEFAULT 'instalacion' CHECK (contacto_tipo IN ('instalacion', 'guardia')),
  contacto_telefono TEXT,
  observaciones TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Crear tabla central_incidentes si no existe
CREATE TABLE IF NOT EXISTS central_incidentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  llamado_id UUID NOT NULL REFERENCES central_llamados(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  severidad VARCHAR(20) DEFAULT 'baja' CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
  descripcion TEXT,
  accion_tomada TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Agregar columna telefono a instalaciones si no existe
ALTER TABLE instalaciones ADD COLUMN IF NOT EXISTS telefono TEXT;

-- 5. Crear índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_central_llamados_instalacion ON central_llamados(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_central_llamados_programado ON central_llamados(programado_para);
CREATE INDEX IF NOT EXISTS idx_central_llamados_estado ON central_llamados(estado);
CREATE INDEX IF NOT EXISTS idx_central_llamados_pauta ON central_llamados(pauta_id);
CREATE INDEX IF NOT EXISTS idx_central_config_habilitado ON central_config_instalacion(habilitado);

-- 6. Eliminar vista existente y recrearla
DROP VIEW IF EXISTS central_v_turnos_activos;

-- 7. Recrear vista con estructura correcta
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

-- 8. Insertar permisos correctamente (usando INSERT IGNORE pattern)
INSERT INTO permisos (clave, descripcion, categoria) 
SELECT 'central_monitoring.view', 'Ver Central de Monitoreo', 'central_monitoring'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE clave = 'central_monitoring.view');

INSERT INTO permisos (clave, descripcion, categoria) 
SELECT 'central_monitoring.record', 'Registrar Llamadas', 'central_monitoring'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE clave = 'central_monitoring.record');

INSERT INTO permisos (clave, descripcion, categoria) 
SELECT 'central_monitoring.configure', 'Configurar Monitoreo', 'central_monitoring'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE clave = 'central_monitoring.configure');

INSERT INTO permisos (clave, descripcion, categoria) 
SELECT 'central_monitoring.export', 'Exportar Reportes', 'central_monitoring'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE clave = 'central_monitoring.export');

-- 9. Insertar rol correctamente
INSERT INTO roles (nombre, descripcion) 
SELECT 'central_monitoring.operator', 'Operador de Central de Monitoreo'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'central_monitoring.operator');

-- 10. Asignar permisos al rol (usando INSERT IGNORE pattern)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id 
FROM roles r, permisos p 
WHERE r.nombre = 'central_monitoring.operator' 
  AND p.clave IN ('central_monitoring.view', 'central_monitoring.record', 'central_monitoring.configure', 'central_monitoring.export')
  AND NOT EXISTS (
    SELECT 1 FROM roles_permisos rp 
    WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );

-- 11. Asignar rol al usuario carlos.irigoyen@gard.cl si existe
INSERT INTO usuarios_roles (usuario_id, rol_id)
SELECT u.id, r.id
FROM usuarios u, roles r
WHERE u.email = 'carlos.irigoyen@gard.cl'
  AND r.nombre = 'central_monitoring.operator'
  AND NOT EXISTS (
    SELECT 1 FROM usuarios_roles ur 
    WHERE ur.usuario_id = u.id AND ur.rol_id = r.id
  );

-- 12. Verificar que todo esté correcto
SELECT 'Permisos creados:' as info, COUNT(*) as count FROM permisos WHERE clave LIKE 'central_monitoring.%'
UNION ALL
SELECT 'Rol creado:', COUNT(*) FROM roles WHERE nombre = 'central_monitoring.operator'
UNION ALL
SELECT 'Permisos asignados al rol:', COUNT(*) FROM roles_permisos rp 
JOIN roles r ON rp.rol_id = r.id 
WHERE r.nombre = 'central_monitoring.operator';

