-- Agregar columna fecha_inactivacion si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sueldo_estructuras_servicio' 
    AND column_name = 'fecha_inactivacion'
  ) THEN
    ALTER TABLE sueldo_estructuras_servicio 
    ADD COLUMN fecha_inactivacion TIMESTAMP NULL;
    
    -- Actualizar registros existentes inactivos
    UPDATE sueldo_estructuras_servicio
    SET fecha_inactivacion = updated_at
    WHERE activo = false AND fecha_inactivacion IS NULL;
  END IF;
END $$;

-- Crear índice para optimizar búsquedas por estado activo
CREATE INDEX IF NOT EXISTS idx_estructuras_servicio_activo 
ON sueldo_estructuras_servicio(activo);

-- Crear índice para búsquedas por fecha de inactivación
CREATE INDEX IF NOT EXISTS idx_estructuras_servicio_fecha_inactivacion 
ON sueldo_estructuras_servicio(fecha_inactivacion) 
WHERE fecha_inactivacion IS NOT NULL;

-- Crear trigger para mantener fecha_inactivacion
CREATE OR REPLACE FUNCTION update_fecha_inactivacion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activo = false AND OLD.activo = true THEN
    NEW.fecha_inactivacion = NOW();
  ELSIF NEW.activo = true AND OLD.activo = false THEN
    NEW.fecha_inactivacion = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fecha_inactivacion 
ON sueldo_estructuras_servicio;

CREATE TRIGGER trigger_update_fecha_inactivacion
BEFORE UPDATE ON sueldo_estructuras_servicio
FOR EACH ROW
WHEN (NEW.activo IS DISTINCT FROM OLD.activo)
EXECUTE FUNCTION update_fecha_inactivacion();
