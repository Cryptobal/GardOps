-- =====================================================
-- CENTRAL DE MONITOREO V2 - BASADO EN PAUTA DIARIA
-- =====================================================

-- 1. AGREGAR TELÉFONO A INSTALACIONES
ALTER TABLE instalaciones ADD COLUMN IF NOT EXISTS telefono TEXT;
CREATE INDEX IF NOT EXISTS idx_instalaciones_telefono ON instalaciones(telefono);
ALTER TABLE instalaciones DROP CONSTRAINT IF EXISTS chk_instalaciones_telefono_formato;
ALTER TABLE instalaciones ADD CONSTRAINT chk_instalaciones_telefono_formato 
  CHECK (telefono IS NULL OR telefono ~ '^[0-9]{9}$');

-- 2. CONFIGURACIÓN DE MONITOREO POR INSTALACIÓN
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

-- 3. LLAMADAS AUTOMÁTICAS BASADAS EN PAUTA DIARIA
CREATE TABLE IF NOT EXISTS central_llamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
  guardia_id UUID REFERENCES guardias(id) ON DELETE SET NULL,
  pauta_id BIGINT, -- Referencia a la pauta diaria
  puesto_id UUID,  -- Referencia al puesto operativo
  programado_para TIMESTAMPTZ NOT NULL,
  ejecutado_en TIMESTAMPTZ,
  canal VARCHAR(20) DEFAULT 'whatsapp' CHECK (canal IN ('whatsapp', 'telefonico')),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'exitoso', 'no_contesta', 'ocupado', 'incidente', 'cancelado', 'no_registrado')),
  contacto_tipo VARCHAR(20) CHECK (contacto_tipo IN ('instalacion', 'guardia')),
  contacto_id UUID,
  contacto_nombre TEXT,
  contacto_telefono TEXT,
  observaciones TEXT,
  sla_segundos INT,
  operador_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INCIDENTES
CREATE TABLE IF NOT EXISTS central_incidentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  llamado_id UUID NOT NULL REFERENCES central_llamados(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  severidad VARCHAR(20) DEFAULT 'baja' CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
  detalle TEXT,
  evidencia_url TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. LOGS DE AUDITORÍA
CREATE TABLE IF NOT EXISTS central_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accion VARCHAR(50) NOT NULL,
  entidad_tipo VARCHAR(50) NOT NULL,
  entidad_id UUID,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  contexto TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ÍNDICES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_central_llamados_instalacion ON central_llamados(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_central_llamados_programado ON central_llamados(programado_para);
CREATE INDEX IF NOT EXISTS idx_central_llamados_estado ON central_llamados(estado);
CREATE INDEX IF NOT EXISTS idx_central_llamados_pauta ON central_llamados(pauta_id);
CREATE INDEX IF NOT EXISTS idx_central_config_habilitado ON central_config_instalacion(habilitado);

-- 7. VISTA DE TURNOS ACTIVOS CON MONITOREO
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

-- 8. VISTA DE KPIs
CREATE OR REPLACE VIEW central_v_kpis AS
SELECT 
  COUNT(*) as total_llamados,
  COUNT(CASE WHEN estado = 'exitoso' THEN 1 END) as exitosos,
  COUNT(CASE WHEN estado = 'no_contesta' THEN 1 END) as no_contesta,
  COUNT(CASE WHEN estado = 'ocupado' THEN 1 END) as ocupado,
  COUNT(CASE WHEN estado = 'incidente' THEN 1 END) as incidentes,
  COUNT(CASE WHEN estado = 'no_registrado' THEN 1 END) as no_registrado,
  COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
  AVG(CASE WHEN sla_segundos IS NOT NULL THEN sla_segundos END) as sla_promedio,
  ROUND(
    (COUNT(CASE WHEN estado = 'exitoso' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
  ) as tasa_exito
FROM central_llamados;

-- 9. FUNCIÓN PARA GENERAR LLAMADAS DESDE PAUTA DIARIA
CREATE OR REPLACE FUNCTION central_fn_generar_llamadas_desde_pauta()
RETURNS void AS $$
DECLARE
  turno RECORD;
  hora_actual TIME := CURRENT_TIME;
  fecha_actual DATE := CURRENT_DATE;
  llamada_hora TIME;
  llamada_timestamp TIMESTAMPTZ;
BEGIN
  -- Recorrer todos los turnos activos con monitoreo habilitado
  FOR turno IN 
    SELECT * FROM central_v_turnos_activos 
    WHERE monitoreo_habilitado = true
  LOOP
    -- Verificar si el turno está en la ventana de monitoreo
    IF (turno.ventana_inicio <= turno.ventana_fin AND 
        hora_actual BETWEEN turno.ventana_inicio AND turno.ventana_fin) OR
       (turno.ventana_inicio > turno.ventana_fin AND 
        (hora_actual >= turno.ventana_inicio OR hora_actual <= turno.ventana_fin)) THEN
      
      -- Calcular la hora de la llamada basada en el intervalo
      llamada_hora := turno.ventana_inicio;
      WHILE llamada_hora <= turno.ventana_fin LOOP
        -- Si la ventana cruza la medianoche
        IF turno.ventana_inicio > turno.ventana_fin AND llamada_hora < turno.ventana_inicio THEN
          llamada_timestamp := fecha_actual + INTERVAL '1 day' + llamada_hora;
        ELSE
          llamada_timestamp := fecha_actual + llamada_hora;
        END IF;
        
        -- Verificar si ya existe una llamada para esta hora
        IF NOT EXISTS (
          SELECT 1 FROM central_llamados 
          WHERE instalacion_id = turno.instalacion_id 
            AND pauta_id = turno.pauta_id
            AND DATE(programado_para) = fecha_actual
            AND EXTRACT(HOUR FROM programado_para) = EXTRACT(HOUR FROM llamada_timestamp)
        ) THEN
          -- Insertar nueva llamada
          INSERT INTO central_llamados (
            instalacion_id, guardia_id, pauta_id, puesto_id, programado_para,
            contacto_tipo, contacto_id, contacto_nombre, contacto_telefono,
            tenant_id
          ) VALUES (
            turno.instalacion_id,
            turno.guardia_id,
            turno.pauta_id,
            turno.puesto_id,
            llamada_timestamp,
            CASE 
              WHEN turno.guardia_telefono IS NOT NULL THEN 'guardia'
              WHEN turno.instalacion_telefono IS NOT NULL THEN 'instalacion'
              ELSE 'instalacion'
            END,
            CASE 
              WHEN turno.guardia_telefono IS NOT NULL THEN turno.guardia_id
              ELSE turno.instalacion_id
            END,
            CASE 
              WHEN turno.guardia_telefono IS NOT NULL THEN turno.guardia_nombre
              ELSE turno.instalacion_nombre
            END,
            COALESCE(turno.guardia_telefono, turno.instalacion_telefono),
            turno.tenant_id
          );
        END IF;
        
        -- Siguiente hora según intervalo
        llamada_hora := llamada_hora + (turno.intervalo_minutos * INTERVAL '1 minute');
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 10. FUNCIÓN PARA MARCAR LLAMADAS NO REGISTRADAS
CREATE OR REPLACE FUNCTION central_fn_marcar_llamadas_no_registradas()
RETURNS void AS $$
BEGIN
  -- Marcar como no registradas las llamadas que ya pasaron su hora
  UPDATE central_llamados 
  SET estado = 'no_registrado', updated_at = now()
  WHERE estado = 'pendiente' 
    AND programado_para < now() - INTERVAL '1 hour'
    AND DATE(programado_para) = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 11. TRIGGERS PARA AUDITORÍA
CREATE OR REPLACE FUNCTION central_fn_log_llamados()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO central_logs (accion, entidad_tipo, entidad_id, datos_nuevos, contexto)
    VALUES ('INSERT', 'central_llamados', NEW.id, to_jsonb(NEW), 'Nueva llamada programada');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO central_logs (accion, entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, contexto)
    VALUES ('UPDATE', 'central_llamados', NEW.id, to_jsonb(OLD), to_jsonb(NEW), 'Llamada actualizada');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO central_logs (accion, entidad_tipo, entidad_id, datos_anteriores, contexto)
    VALUES ('DELETE', 'central_llamados', OLD.id, to_jsonb(OLD), 'Llamada eliminada');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_central_llamados_log
  AFTER INSERT OR UPDATE OR DELETE ON central_llamados
  FOR EACH ROW EXECUTE FUNCTION central_fn_log_llamados();

CREATE OR REPLACE FUNCTION central_fn_log_config()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO central_logs (accion, entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, contexto)
    VALUES ('UPDATE', 'central_config_instalacion', NEW.id, to_jsonb(OLD), to_jsonb(NEW), 'Configuración actualizada');
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_central_config_log
  AFTER UPDATE ON central_config_instalacion
  FOR EACH ROW EXECUTE FUNCTION central_fn_log_config();

-- 12. PERMISOS RBAC
INSERT INTO permisos (clave, nombre, descripcion, categoria) VALUES
('central_monitoring.view', 'Ver Central de Monitoreo', 'Acceso al dashboard principal', 'central_monitoring'),
('central_monitoring.record', 'Registrar Llamadas', 'Marcar estado de llamadas', 'central_monitoring'),
('central_monitoring.configure', 'Configurar Monitoreo', 'Configurar instalaciones', 'central_monitoring'),
('central_monitoring.export', 'Exportar Reportes', 'Generar reportes CSV/PDF', 'central_monitoring')
ON CONFLICT (clave) DO NOTHING;

-- 13. ROL DE OPERADOR
INSERT INTO roles (nombre, descripcion) VALUES
('central_monitoring.operator', 'Operador de Central de Monitoreo')
ON CONFLICT (nombre) DO NOTHING;

-- 14. ASIGNAR PERMISOS AL ROL
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id 
FROM roles r, permisos p 
WHERE r.nombre = 'central_monitoring.operator' 
  AND p.clave IN ('central_monitoring.view', 'central_monitoring.record', 'central_monitoring.configure', 'central_monitoring.export')
ON CONFLICT DO NOTHING;

-- 15. JOB PARA GENERAR LLAMADAS AUTOMÁTICAMENTE (se ejecuta cada hora)
-- Nota: Esto se puede implementar con pg_cron o un job externo
-- SELECT cron.schedule('generar-llamadas', '0 * * * *', 'SELECT central_fn_generar_llamadas_desde_pauta();');

-- 16. JOB PARA MARCAR LLAMADAS NO REGISTRADAS (se ejecuta cada 5 minutos)
-- SELECT cron.schedule('marcar-no-registradas', '*/5 * * * *', 'SELECT central_fn_marcar_llamadas_no_registradas();');

COMMENT ON TABLE central_config_instalacion IS 'Configuración de monitoreo por instalación';
COMMENT ON TABLE central_llamados IS 'Llamadas automáticas basadas en pauta diaria';
COMMENT ON TABLE central_incidentes IS 'Incidentes reportados durante monitoreo';
COMMENT ON TABLE central_logs IS 'Logs de auditoría para todas las acciones';
COMMENT ON VIEW central_v_turnos_activos IS 'Vista de turnos activos con monitoreo habilitado';
COMMENT ON VIEW central_v_kpis IS 'Vista de KPIs del sistema de monitoreo';
