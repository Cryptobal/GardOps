-- Script para agregar campo de horas extras al sistema de turnos
-- Ejecutar en base de datos GardOps

-- 1. Agregar campo horas_extras a la tabla principal de pauta mensual
ALTER TABLE as_turnos_pauta_mensual 
ADD COLUMN IF NOT EXISTS horas_extras DECIMAL(10,2) DEFAULT 0;

-- 2. Agregar campo horas_extras a la tabla de turnos extras (si no existe)
ALTER TABLE turnos_extras 
ADD COLUMN IF NOT EXISTS horas_extras DECIMAL(10,2) DEFAULT 0;

-- 3. Crear índice para optimizar consultas por horas extras
CREATE INDEX IF NOT EXISTS idx_pauta_horas_extras ON as_turnos_pauta_mensual(horas_extras);
CREATE INDEX IF NOT EXISTS idx_turnos_extras_horas_extras ON turnos_extras(horas_extras);

-- 4. Agregar comentarios a los campos para documentación
COMMENT ON COLUMN as_turnos_pauta_mensual.horas_extras IS 'Monto de horas extras realizadas por el guardia en este turno';
COMMENT ON COLUMN turnos_extras.horas_extras IS 'Monto de horas extras realizadas en este turno extra';

-- 5. Crear función para calcular total de horas extras por guardia en un mes
CREATE OR REPLACE FUNCTION calcular_horas_extras_mes(
  guardia_id_param UUID,
  mes_param INTEGER,
  anio_param INTEGER
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_horas_extras DECIMAL(10,2) := 0;
BEGIN
  -- Sumar horas extras de turnos regulares
  SELECT COALESCE(SUM(horas_extras), 0)
  INTO total_horas_extras
  FROM as_turnos_pauta_mensual pm
  WHERE pm.guardia_id = guardia_id_param
    AND EXTRACT(MONTH FROM pm.fecha) = mes_param
    AND EXTRACT(YEAR FROM pm.fecha) = anio_param
    AND pm.horas_extras > 0;
  
  -- Sumar horas extras de turnos extras
  SELECT total_horas_extras + COALESCE(SUM(te.horas_extras), 0)
  INTO total_horas_extras
  FROM turnos_extras te
  WHERE te.guardia_id = guardia_id_param
    AND EXTRACT(MONTH FROM te.fecha) = mes_param
    AND EXTRACT(YEAR FROM te.fecha) = anio_param
    AND te.horas_extras > 0;
  
  RETURN total_horas_extras;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear vista para facilitar consultas de horas extras
CREATE OR REPLACE VIEW v_horas_extras_consolidada AS
SELECT 
  pm.id as pauta_id,
  pm.guardia_id,
  pm.fecha,
  pm.instalacion_id,
  pm.puesto_id,
  pm.rol_id,
  pm.horas_extras,
  'turno_regular' as tipo_turno,
  pm.created_at,
  pm.updated_at
FROM as_turnos_pauta_mensual pm
WHERE pm.horas_extras > 0

UNION ALL

SELECT 
  te.id as pauta_id,
  te.guardia_id,
  te.fecha,
  te.instalacion_id,
  te.puesto_id,
  NULL as rol_id,
  te.horas_extras,
  'turno_extra' as tipo_turno,
  te.created_at,
  te.updated_at
FROM turnos_extras te
WHERE te.horas_extras > 0;

-- 7. Crear trigger para actualizar updated_at cuando cambien las horas extras
CREATE OR REPLACE FUNCTION trigger_update_horas_extras()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a la tabla de pauta mensual
DROP TRIGGER IF EXISTS trigger_pauta_horas_extras_updated ON as_turnos_pauta_mensual;
CREATE TRIGGER trigger_pauta_horas_extras_updated
  BEFORE UPDATE ON as_turnos_pauta_mensual
  FOR EACH ROW
  WHEN (OLD.horas_extras IS DISTINCT FROM NEW.horas_extras)
  EXECUTE FUNCTION trigger_update_horas_extras();

-- Aplicar trigger a la tabla de turnos extras
DROP TRIGGER IF EXISTS trigger_turnos_extras_horas_extras_updated ON turnos_extras;
CREATE TRIGGER trigger_turnos_extras_horas_extras_updated
  BEFORE UPDATE ON turnos_extras
  FOR EACH ROW
  WHEN (OLD.horas_extras IS DISTINCT FROM NEW.horas_extras)
  EXECUTE FUNCTION trigger_update_horas_extras();



