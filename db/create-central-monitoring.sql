-- Central de Monitoreo - Módulo completo
-- Nomenclatura: central_* para todas las tablas

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. AGREGAR TELÉFONO A INSTALACIONES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='instalaciones' AND column_name='telefono'
  ) THEN
    ALTER TABLE instalaciones ADD COLUMN telefono TEXT;
    CREATE INDEX IF NOT EXISTS idx_instalaciones_telefono ON instalaciones(telefono);
    COMMENT ON COLUMN instalaciones.telefono IS 'Teléfono de contacto de la instalación para monitoreo nocturno';
  END IF;
END $$;

-- ============================================
-- 2. CONFIGURACIÓN POR INSTALACIÓN
-- ============================================
CREATE TABLE IF NOT EXISTS central_config_instalacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
  habilitado BOOLEAN DEFAULT true,
  intervalo_minutos INT NOT NULL DEFAULT 60,        -- cadencia fija por instalación
  ventana_inicio TIME NOT NULL DEFAULT '21:00',     -- 21:00
  ventana_fin TIME NOT NULL DEFAULT '07:00',        -- 07:00
  modo VARCHAR(20) NOT NULL DEFAULT 'fijo',         -- fijo (por ahora)
  mensaje_template TEXT DEFAULT 'Central de Monitoreo GARD: Confirmar estado de turno en {instalacion} a las {hora}.',
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (instalacion_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_central_config_instalacion_id ON central_config_instalacion(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_central_config_tenant ON central_config_instalacion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_central_config_habilitado ON central_config_instalacion(habilitado);

COMMENT ON TABLE central_config_instalacion IS 'Configuración de monitoreo nocturno por instalación';
COMMENT ON COLUMN central_config_instalacion.intervalo_minutos IS 'Cadencia fija de llamados en minutos';
COMMENT ON COLUMN central_config_instalacion.ventana_inicio IS 'Hora de inicio de monitoreo (formato HH:MM)';
COMMENT ON COLUMN central_config_instalacion.ventana_fin IS 'Hora de fin de monitoreo (formato HH:MM)';

-- ============================================
-- 3. AGENDA Y RESULTADOS DE LLAMADOS
-- ============================================
CREATE TABLE IF NOT EXISTS central_llamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
  guardia_id UUID REFERENCES guardias(id) ON DELETE SET NULL,
  pauta_id BIGINT,                 -- opcional, si se desea vincular a pauta
  puesto_id UUID,                  -- opcional, si se desea vincular a puesto
  programado_para TIMESTAMPTZ NOT NULL,
  ejecutado_en TIMESTAMPTZ,
  canal VARCHAR(20) DEFAULT 'whatsapp',    -- whatsapp|telefonico|sms
  estado VARCHAR(20) DEFAULT 'pendiente',  -- pendiente|exitoso|no_contesta|ocupado|incidente|cancelado
  contacto_tipo VARCHAR(20),               -- instalacion|guardia
  contacto_id UUID,                        -- guardia_id si contacto_tipo = 'guardia'
  contacto_nombre TEXT,                    -- nombre del contacto
  contacto_telefono TEXT,                  -- teléfono usado
  observaciones TEXT,
  sla_segundos INT,
  operador_id UUID,               -- usuarios.id
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_central_llamados_instalacion ON central_llamados(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_central_llamados_programado ON central_llamados(programado_para);
CREATE INDEX IF NOT EXISTS idx_central_llamados_estado ON central_llamados(estado);
CREATE INDEX IF NOT EXISTS idx_central_llamados_tenant ON central_llamados(tenant_id);
CREATE INDEX IF NOT EXISTS idx_central_llamados_contacto ON central_llamados(contacto_tipo, contacto_id);
CREATE INDEX IF NOT EXISTS idx_central_llamados_operador ON central_llamados(operador_id);

COMMENT ON TABLE central_llamados IS 'Agenda y resultados de llamados de monitoreo nocturno';
COMMENT ON COLUMN central_llamados.contacto_tipo IS 'Tipo de contacto: instalacion o guardia';
COMMENT ON COLUMN central_llamados.contacto_id IS 'ID del guardia si se contactó directamente';
COMMENT ON COLUMN central_llamados.contacto_nombre IS 'Nombre del contacto (instalación o guardia)';
COMMENT ON COLUMN central_llamados.contacto_telefono IS 'Teléfono usado para el contacto';

-- ============================================
-- 4. INCIDENTES DETALLADOS
-- ============================================
CREATE TABLE IF NOT EXISTS central_incidentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  llamado_id UUID NOT NULL REFERENCES central_llamados(id) ON DELETE CASCADE,
  tipo VARCHAR(50),                -- ausencia|tardanza|intrusión|accidente|otro
  severidad VARCHAR(20),           -- baja|media|alta|critica
  detalle JSONB,
  evidencia_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID
);

CREATE INDEX IF NOT EXISTS idx_central_incidentes_llamado ON central_incidentes(llamado_id);
CREATE INDEX IF NOT EXISTS idx_central_incidentes_tipo ON central_incidentes(tipo);
CREATE INDEX IF NOT EXISTS idx_central_incidentes_severidad ON central_incidentes(severidad);
CREATE INDEX IF NOT EXISTS idx_central_incidentes_tenant ON central_incidentes(tenant_id);

COMMENT ON TABLE central_incidentes IS 'Incidentes detallados registrados durante monitoreo';
COMMENT ON COLUMN central_incidentes.tipo IS 'Tipo de incidente: ausencia, tardanza, intrusión, accidente, otro';
COMMENT ON COLUMN central_incidentes.severidad IS 'Nivel de severidad: baja, media, alta, critica';

-- ============================================
-- 5. LOGS DE MONITOREO
-- ============================================
CREATE TABLE IF NOT EXISTS central_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accion TEXT NOT NULL,            -- config_updated|llamado_created|llamado_updated|incidente_created
  entidad_tipo TEXT NOT NULL,      -- config|llamado|incidente
  entidad_id UUID,                 -- ID de la entidad afectada
  usuario_id UUID,                 -- usuarios.id
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  contexto TEXT,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_central_logs_accion ON central_logs(accion);
CREATE INDEX IF NOT EXISTS idx_central_logs_entidad ON central_logs(entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_central_logs_usuario ON central_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_central_logs_fecha ON central_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_central_logs_tenant ON central_logs(tenant_id);

COMMENT ON TABLE central_logs IS 'Logs de auditoría para todas las acciones del módulo de monitoreo';

-- ============================================
-- 6. PERMISOS Y ROL RBAC
-- ============================================
-- Insertar permisos de monitoreo (usando nomenclatura rbac_* existente)
INSERT INTO rbac_permisos (code, description) VALUES
  ('central_monitoring.view', 'Ver Central de Monitoreo'),
  ('central_monitoring.record', 'Registrar estados de llamados'),
  ('central_monitoring.configure', 'Configurar cadencia/ventanas por instalación'),
  ('central_monitoring.export', 'Exportar y ver reportes de monitoreo')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

-- Crear rol Monitoring Operator (global, tenant_id NULL)
INSERT INTO rbac_roles (tenant_id, code, name, description, is_system)
VALUES (NULL, 'central_monitoring.operator', 'Central Monitoring Operator', 'Operador de Central de Monitoreo', false)
ON CONFLICT (tenant_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system;

-- Asignar permisos al rol
WITH r AS (
  SELECT id FROM rbac_roles WHERE tenant_id IS NULL AND code = 'central_monitoring.operator'
)
INSERT INTO rbac_roles_permisos (role_id, permission_id)
SELECT r.id, p.id
FROM r, rbac_permisos p
WHERE p.code IN ('central_monitoring.view','central_monitoring.record','central_monitoring.configure','central_monitoring.export')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- 7. VISTAS ÚTILES
-- ============================================
-- Vista para turnos activos nocturnos
CREATE OR REPLACE VIEW central_v_turnos_activos AS
SELECT 
  i.id as instalacion_id,
  i.nombre as instalacion_nombre,
  i.telefono as instalacion_telefono,
  g.id as guardia_id,
  CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_nombre,
  g.telefono as guardia_telefono,
  rs.nombre as rol_nombre,
  rs.hora_inicio,
  rs.hora_termino,
  po.nombre_puesto,
  pm.estado as estado_pauta,
  pm.anio,
  pm.mes,
  pm.dia,
  TO_DATE(CONCAT(pm.anio, '-', pm.mes, '-', pm.dia), 'YYYY-MM-DD') as fecha
FROM instalaciones i
INNER JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id
INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
INNER JOIN as_turnos_pauta_mensual pm ON pm.puesto_id = po.id
LEFT JOIN guardias g ON pm.guardia_id = g.id
WHERE po.activo = true
  AND pm.estado IN ('trabajado', 'T', 'reemplazo', 'cubierto')
  AND g.activo = true
  AND g.telefono IS NOT NULL
  AND g.telefono != '';

COMMENT ON VIEW central_v_turnos_activos IS 'Vista de guardias en turnos activos con teléfonos para monitoreo';

-- Vista para KPIs de monitoreo
CREATE OR REPLACE VIEW central_v_kpis AS
SELECT 
  instalacion_id,
  COUNT(*) as total_llamados,
  COUNT(CASE WHEN estado = 'exitoso' THEN 1 END) as exitosos,
  COUNT(CASE WHEN estado = 'no_contesta' THEN 1 END) as no_contesta,
  COUNT(CASE WHEN estado = 'ocupado' THEN 1 END) as ocupado,
  COUNT(CASE WHEN estado = 'incidente' THEN 1 END) as incidentes,
  COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) as cancelados,
  COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
  AVG(EXTRACT(EPOCH FROM (ejecutado_en - programado_para))/60) as tiempo_promedio_minutos,
  COUNT(CASE WHEN contacto_tipo = 'instalacion' THEN 1 END) as contactos_instalacion,
  COUNT(CASE WHEN contacto_tipo = 'guardia' THEN 1 END) as contactos_guardia
FROM central_llamados
WHERE programado_para >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY instalacion_id;

COMMENT ON VIEW central_v_kpis IS 'KPIs agregados de monitoreo por instalación';

-- ============================================
-- 8. FUNCIONES HELPER
-- ============================================
-- Función para generar agenda de llamados
CREATE OR REPLACE FUNCTION central_fn_generar_agenda(
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_instalacion_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(
  instalacion_id UUID,
  programado_para TIMESTAMPTZ,
  mensaje TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_config RECORD;
  v_instalacion RECORD;
  v_hora_inicio TIME;
  v_hora_fin TIME;
  v_intervalo INT;
  v_tiempo_actual TIMESTAMPTZ;
  v_programado TIMESTAMPTZ;
BEGIN
  -- Obtener configuraciones habilitadas
  FOR v_config IN
    SELECT 
      c.instalacion_id,
      c.intervalo_minutos,
      c.ventana_inicio,
      c.ventana_fin,
      c.mensaje_template,
      i.nombre as instalacion_nombre
    FROM central_config_instalacion c
    JOIN instalaciones i ON i.id = c.instalacion_id
    WHERE c.habilitado = true
      AND (p_instalacion_ids IS NULL OR c.instalacion_id = ANY(p_instalacion_ids))
  LOOP
    -- Calcular ventana para la fecha especificada
    v_hora_inicio := v_config.ventana_inicio;
    v_hora_fin := v_config.ventana_fin;
    v_intervalo := v_config.intervalo_minutos;
    
    -- Generar llamados cada intervalo
    v_tiempo_actual := p_fecha + v_hora_inicio;
    v_programado := p_fecha + v_hora_fin;
    
    WHILE v_tiempo_actual <= v_programado LOOP
      -- Verificar si ya existe un llamado para esta instalación y hora
      IF NOT EXISTS (
        SELECT 1 FROM central_llamados 
        WHERE instalacion_id = v_config.instalacion_id 
          AND programado_para = v_tiempo_actual
      ) THEN
        -- Insertar nuevo llamado
        INSERT INTO central_llamados (
          instalacion_id, 
          programado_para, 
          canal, 
          estado, 
          tenant_id
        ) VALUES (
          v_config.instalacion_id,
          v_tiempo_actual,
          'whatsapp',
          'pendiente',
          (SELECT tenant_id FROM central_config_instalacion WHERE instalacion_id = v_config.instalacion_id LIMIT 1)
        );
        
        -- Retornar información del llamado generado
        instalacion_id := v_config.instalacion_id;
        programado_para := v_tiempo_actual;
        mensaje := REPLACE(REPLACE(
          v_config.mensaje_template,
          '{instalacion}', v_config.instalacion_nombre
        ), '{hora}', TO_CHAR(v_tiempo_actual, 'HH24:MI'));
        
        RETURN NEXT;
      END IF;
      
      -- Avanzar al siguiente intervalo
      v_tiempo_actual := v_tiempo_actual + (v_intervalo || ' minutes')::INTERVAL;
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION central_fn_generar_agenda IS 'Genera agenda de llamados para una fecha específica';

-- ============================================
-- 9. TRIGGERS PARA AUDITORÍA
-- ============================================
-- Trigger para logs automáticos en central_llamados
CREATE OR REPLACE FUNCTION central_fn_log_llamados()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO central_logs (accion, entidad_tipo, entidad_id, datos_nuevos, tenant_id)
    VALUES ('llamado_created', 'llamado', NEW.id, to_jsonb(NEW), NEW.tenant_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO central_logs (accion, entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, tenant_id)
    VALUES ('llamado_updated', 'llamado', NEW.id, to_jsonb(OLD), to_jsonb(NEW), NEW.tenant_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER central_trg_log_llamados
  AFTER INSERT OR UPDATE ON central_llamados
  FOR EACH ROW
  EXECUTE FUNCTION central_fn_log_llamados();

-- Trigger para logs automáticos en central_config_instalacion
CREATE OR REPLACE FUNCTION central_fn_log_config()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO central_logs (accion, entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, tenant_id)
    VALUES ('config_updated', 'config', NEW.id, to_jsonb(OLD), to_jsonb(NEW), NEW.tenant_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER central_trg_log_config
  AFTER UPDATE ON central_config_instalacion
  FOR EACH ROW
  EXECUTE FUNCTION central_fn_log_config();

-- ============================================
-- 10. DATOS DE PRUEBA (OPCIONAL)
-- ============================================
-- Insertar configuración de ejemplo para instalaciones existentes
INSERT INTO central_config_instalacion (instalacion_id, habilitado, intervalo_minutos, tenant_id)
SELECT 
  i.id,
  true,
  60,
  i.tenant_id
FROM instalaciones i
WHERE i.estado = 'Activo'
  AND NOT EXISTS (
    SELECT 1 FROM central_config_instalacion cci WHERE cci.instalacion_id = i.id
  )
LIMIT 5; -- Solo las primeras 5 instalaciones activas

-- ============================================
-- RESUMEN DE CREACIÓN
-- ============================================
SELECT 
  'Central de Monitoreo creado exitosamente' as resultado,
  COUNT(*) as tablas_creadas
FROM information_schema.tables 
WHERE table_name LIKE 'central_%' 
  AND table_schema = 'public';

