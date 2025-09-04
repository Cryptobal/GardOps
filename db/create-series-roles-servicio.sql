-- =====================================================
-- REFACTORIZACIÓN: ROLES DE SERVICIO CON SERIES
-- =====================================================
-- Este script implementa la nueva estructura para manejar
-- horarios variables por día en roles de servicio

-- 1. Agregar campos a tabla principal
ALTER TABLE as_turnos_roles_servicio 
ADD COLUMN IF NOT EXISTS tiene_horarios_variables BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS duracion_ciclo_dias INTEGER,
ADD COLUMN IF NOT EXISTS horas_turno_promedio DECIMAL(4,2);

-- 2. Crear tabla de series de días
CREATE TABLE IF NOT EXISTS as_turnos_series_dias (
  id SERIAL PRIMARY KEY,
  rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
  posicion_en_ciclo INTEGER NOT NULL, -- 1, 2, 3, 4, 5, 6, 7, 8...
  es_dia_trabajo BOOLEAN NOT NULL,
  hora_inicio TIME,
  hora_termino TIME,
  horas_turno DECIMAL(4,2) DEFAULT 0,
  observaciones TEXT,
  tenant_id UUID, -- Heredado del rol de servicio
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_posicion_positiva CHECK (posicion_en_ciclo > 0),
  CONSTRAINT chk_horarios_trabajo CHECK (
    (es_dia_trabajo = TRUE AND hora_inicio IS NOT NULL AND hora_termino IS NOT NULL) OR
    (es_dia_trabajo = FALSE AND hora_inicio IS NULL AND hora_termino IS NULL)
  ),
  CONSTRAINT chk_horas_turno_positivas CHECK (horas_turno >= 0)
);

-- 3. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_series_rol_posicion 
ON as_turnos_series_dias(rol_servicio_id, posicion_en_ciclo);

CREATE INDEX IF NOT EXISTS idx_series_rol_trabajo 
ON as_turnos_series_dias(rol_servicio_id, es_dia_trabajo);

-- 4. Crear función para calcular horas de turno automáticamente
CREATE OR REPLACE FUNCTION calcular_horas_turno_series(
  hora_inicio TIME,
  hora_termino TIME
) RETURNS DECIMAL(4,2) AS $$
DECLARE
  horas DECIMAL(4,2);
BEGIN
  -- Calcular diferencia en horas
  horas := EXTRACT(EPOCH FROM (hora_termino - hora_inicio)) / 3600;
  
  -- Manejar turnos que cruzan la medianoche
  IF horas <= 0 THEN
    horas := horas + 24;
  END IF;
  
  RETURN ROUND(horas, 2);
END;
$$ LANGUAGE plpgsql;

-- 5. Crear trigger para calcular horas automáticamente
CREATE OR REPLACE FUNCTION trigger_calcular_horas_series()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo calcular si es día de trabajo y tiene horarios
  IF NEW.es_dia_trabajo = TRUE AND NEW.hora_inicio IS NOT NULL AND NEW.hora_termino IS NOT NULL THEN
    NEW.horas_turno := calcular_horas_turno_series(NEW.hora_inicio, NEW.hora_termino);
  ELSE
    NEW.horas_turno := 0;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_series_calcular_horas
  BEFORE INSERT OR UPDATE ON as_turnos_series_dias
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calcular_horas_series();

-- 6. Función para actualizar promedio de horas en rol principal
CREATE OR REPLACE FUNCTION actualizar_promedio_horas_rol()
RETURNS TRIGGER AS $$
DECLARE
  promedio DECIMAL(4,2);
  duracion INTEGER;
BEGIN
  -- Calcular promedio de horas de días de trabajo
  SELECT 
    ROUND(AVG(horas_turno), 2),
    COUNT(*)
  INTO promedio, duracion
  FROM as_turnos_series_dias 
  WHERE rol_servicio_id = COALESCE(NEW.rol_servicio_id, OLD.rol_servicio_id)
    AND es_dia_trabajo = TRUE;
  
  -- Actualizar rol principal
  UPDATE as_turnos_roles_servicio 
  SET 
    horas_turno_promedio = COALESCE(promedio, 0),
    duracion_ciclo_dias = duracion,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.rol_servicio_id, OLD.rol_servicio_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_promedio_rol
  AFTER INSERT OR UPDATE OR DELETE ON as_turnos_series_dias
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_promedio_horas_rol();

-- 7. Función utilitaria para obtener horario de un día específico
CREATE OR REPLACE FUNCTION obtener_horario_dia_rol(
  p_rol_servicio_id UUID,
  p_posicion_ciclo INTEGER
) RETURNS TABLE(
  es_dia_trabajo BOOLEAN,
  hora_inicio TIME,
  hora_termino TIME,
  horas_turno DECIMAL(4,2),
  observaciones TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.es_dia_trabajo,
    s.hora_inicio,
    s.hora_termino,
    s.horas_turno,
    s.observaciones
  FROM as_turnos_series_dias s
  WHERE s.rol_servicio_id = p_rol_servicio_id
    AND s.posicion_en_ciclo = p_posicion_ciclo;
END;
$$ LANGUAGE plpgsql;

-- 8. Función para verificar integridad de series
CREATE OR REPLACE FUNCTION verificar_integridad_serie(
  p_rol_servicio_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  dias_trabajo INTEGER;
  dias_descanso INTEGER;
  total_dias INTEGER;
  dias_serie INTEGER;
BEGIN
  -- Obtener configuración del rol
  SELECT rs.dias_trabajo, rs.dias_descanso
  INTO dias_trabajo, dias_descanso
  FROM as_turnos_roles_servicio rs
  WHERE rs.id = p_rol_servicio_id;
  
  total_dias := dias_trabajo + dias_descanso;
  
  -- Contar días en la serie
  SELECT COUNT(*)
  INTO dias_serie
  FROM as_turnos_series_dias
  WHERE rol_servicio_id = p_rol_servicio_id;
  
  -- Verificar que coincida
  IF dias_serie != total_dias THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar que no haya duplicados en posiciones
  IF EXISTS (
    SELECT 1 
    FROM as_turnos_series_dias 
    WHERE rol_servicio_id = p_rol_servicio_id
    GROUP BY posicion_en_ciclo
    HAVING COUNT(*) > 1
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. Comentarios para documentación
COMMENT ON TABLE as_turnos_series_dias IS 'Detalle día a día de la serie de un rol de servicio';
COMMENT ON COLUMN as_turnos_series_dias.posicion_en_ciclo IS 'Posición en el ciclo (1, 2, 3, 4, 5, 6, 7, 8...)';
COMMENT ON COLUMN as_turnos_series_dias.es_dia_trabajo IS 'TRUE si es día de trabajo, FALSE si es día libre';
COMMENT ON COLUMN as_turnos_roles_servicio.tiene_horarios_variables IS 'TRUE si usa series, FALSE si usa horarios fijos';
COMMENT ON COLUMN as_turnos_roles_servicio.horas_turno_promedio IS 'Promedio de horas de días de trabajo (calculado automáticamente)';

-- 10. Ejemplo de datos para testing (comentado)
/*
-- Ejemplo: Rol 5x2 con horarios variables
INSERT INTO as_turnos_series_dias (rol_servicio_id, posicion_en_ciclo, es_dia_trabajo, hora_inicio, hora_termino, observaciones) VALUES
('rol-5x2-id', 1, TRUE, '08:00', '20:00', 'Lunes'),
('rol-5x2-id', 2, TRUE, '08:00', '20:00', 'Martes'),
('rol-5x2-id', 3, TRUE, '08:00', '20:00', 'Miércoles'),
('rol-5x2-id', 4, TRUE, '08:00', '20:00', 'Jueves'),
('rol-5x2-id', 5, TRUE, '08:00', '17:00', 'Viernes corto'),
('rol-5x2-id', 6, FALSE, NULL, NULL, 'Sábado libre'),
('rol-5x2-id', 7, FALSE, NULL, NULL, 'Domingo libre');
*/

-- ✅ Estructura de series para roles de servicio creada exitosamente
