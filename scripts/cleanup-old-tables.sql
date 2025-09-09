-- Primero respaldamos los datos por si acaso
CREATE TABLE IF NOT EXISTS backup_sueldo_estructuras_roles AS 
SELECT * FROM sueldo_estructuras_roles;

-- Eliminar triggers y funciones asociadas
DROP TRIGGER IF EXISTS trigger_crear_estructura_sueldo ON as_turnos_roles_servicio;
DROP TRIGGER IF EXISTS trigger_inactivar_estructura_cascada ON as_turnos_roles_servicio;
DROP FUNCTION IF EXISTS crear_estructura_sueldo_automatica();
DROP FUNCTION IF EXISTS inactivar_estructura_sueldo_cascada();

-- Eliminar la tabla
DROP TABLE IF EXISTS sueldo_estructuras_roles;

-- Asegurar que sueldo_estructuras_servicio tiene los campos necesarios
DO $$ 
BEGIN
  -- Agregar columna fecha_inactivacion si no existe
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

  -- Agregar columna historial si no existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sueldo_estructuras_servicio' 
    AND column_name = 'historial'
  ) THEN
    ALTER TABLE sueldo_estructuras_servicio 
    ADD COLUMN historial JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_estructuras_servicio_activo 
ON sueldo_estructuras_servicio(activo);

CREATE INDEX IF NOT EXISTS idx_estructuras_servicio_fecha_inactivacion 
ON sueldo_estructuras_servicio(fecha_inactivacion) 
WHERE fecha_inactivacion IS NOT NULL;

-- Crear trigger para mantener fecha_inactivacion y historial
CREATE OR REPLACE FUNCTION update_estructura_servicio()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar fecha_inactivacion
  IF NEW.activo = false AND OLD.activo = true THEN
    NEW.fecha_inactivacion = NOW();
    -- Agregar entrada al historial
    NEW.historial = jsonb_build_array(
      jsonb_build_object(
        'fecha', NOW(),
        'accion', 'INACTIVACION',
        'datos_anteriores', to_jsonb(OLD),
        'datos_nuevos', to_jsonb(NEW)
      )
    ) || COALESCE(OLD.historial, '[]'::jsonb);
  ELSIF NEW.activo = true AND OLD.activo = false THEN
    NEW.fecha_inactivacion = NULL;
    -- Agregar entrada al historial
    NEW.historial = jsonb_build_array(
      jsonb_build_object(
        'fecha', NOW(),
        'accion', 'REACTIVACION',
        'datos_anteriores', to_jsonb(OLD),
        'datos_nuevos', to_jsonb(NEW)
      )
    ) || COALESCE(OLD.historial, '[]'::jsonb);
  END IF;
  
  -- Actualizar updated_at
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_estructura_servicio 
ON sueldo_estructuras_servicio;

CREATE TRIGGER trigger_update_estructura_servicio
BEFORE UPDATE ON sueldo_estructuras_servicio
FOR EACH ROW
EXECUTE FUNCTION update_estructura_servicio();
