-- Agregar columnas faltantes a la tabla sueldo_estructura_instalacion
ALTER TABLE sueldo_estructura_instalacion 
ADD COLUMN IF NOT EXISTS sueldo_base INTEGER NOT NULL DEFAULT 0;

ALTER TABLE sueldo_estructura_instalacion 
ADD COLUMN IF NOT EXISTS bono_1 INTEGER NOT NULL DEFAULT 0;

ALTER TABLE sueldo_estructura_instalacion 
ADD COLUMN IF NOT EXISTS bono_2 INTEGER NOT NULL DEFAULT 0;

ALTER TABLE sueldo_estructura_instalacion 
ADD COLUMN IF NOT EXISTS bono_3 INTEGER NOT NULL DEFAULT 0;

ALTER TABLE sueldo_estructura_instalacion 
ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT true;

-- Agregar comentarios
COMMENT ON COLUMN sueldo_estructura_instalacion.sueldo_base IS 'Sueldo base de la estructura';
COMMENT ON COLUMN sueldo_estructura_instalacion.bono_1 IS 'Bono de colación (no imponible)';
COMMENT ON COLUMN sueldo_estructura_instalacion.bono_2 IS 'Bono de movilización (no imponible)';
COMMENT ON COLUMN sueldo_estructura_instalacion.bono_3 IS 'Bono de responsabilidad (imponible)';
COMMENT ON COLUMN sueldo_estructura_instalacion.activa IS 'Indica si la estructura está activa';

