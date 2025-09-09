-- Crear tabla de historial si no existe
CREATE TABLE IF NOT EXISTS sueldo_estructuras_servicio_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estructura_id UUID NOT NULL REFERENCES sueldo_estructuras_servicio(id),
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accion VARCHAR(50) NOT NULL,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_historial_estructura_id 
ON sueldo_estructuras_servicio_historial(estructura_id);

CREATE INDEX IF NOT EXISTS idx_historial_fecha 
ON sueldo_estructuras_servicio_historial(fecha);

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
