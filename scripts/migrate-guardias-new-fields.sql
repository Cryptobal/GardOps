-- Migración para agregar nuevos campos a la tabla guardias
-- Campos: monto_anticipo, pin, dias_vacaciones_pendientes, fecha_ingreso, fecha_finiquito

-- 1. Agregar campo monto_anticipo (entero sin decimales, máximo 6 dígitos)
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS monto_anticipo INTEGER CHECK (monto_anticipo >= 0 AND monto_anticipo <= 999999);

-- 2. Agregar campo pin (4 dígitos únicos)
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS pin VARCHAR(4) UNIQUE CHECK (pin ~ '^[0-9]{4}$');

-- 3. Agregar campo dias_vacaciones_pendientes (decimal con 2 decimales)
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS dias_vacaciones_pendientes DECIMAL(5,2) DEFAULT 0.00 CHECK (dias_vacaciones_pendientes >= 0);

-- 4. Agregar campo fecha_ingreso
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;

-- 5. Agregar campo fecha_finiquito
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS fecha_finiquito DATE;

-- 6. Crear índice para búsquedas por PIN (ya es único, pero útil para performance)
CREATE INDEX IF NOT EXISTS idx_guardias_pin ON guardias(pin);

-- 7. Crear índice para búsquedas por fecha_ingreso
CREATE INDEX IF NOT EXISTS idx_guardias_fecha_ingreso ON guardias(fecha_ingreso);

-- 8. Crear índice para búsquedas por fecha_finiquito
CREATE INDEX IF NOT EXISTS idx_guardias_fecha_finiquito ON guardias(fecha_finiquito);

-- 9. Crear función para generar PIN único automáticamente
CREATE OR REPLACE FUNCTION generar_pin_unico() RETURNS VARCHAR(4) AS $$
DECLARE
    nuevo_pin VARCHAR(4);
    pin_existe BOOLEAN;
BEGIN
    LOOP
        -- Generar PIN de 4 dígitos aleatorio
        nuevo_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- Verificar si el PIN ya existe
        SELECT EXISTS(SELECT 1 FROM guardias WHERE pin = nuevo_pin) INTO pin_existe;
        
        -- Si no existe, salir del bucle
        IF NOT pin_existe THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN nuevo_pin;
END;
$$ LANGUAGE plpgsql;

-- 10. Crear trigger para asignar PIN automáticamente al crear guardia
CREATE OR REPLACE FUNCTION asignar_pin_automatico() RETURNS TRIGGER AS $$
BEGIN
    -- Solo asignar PIN si no se proporcionó uno
    IF NEW.pin IS NULL OR NEW.pin = '' THEN
        NEW.pin := generar_pin_unico();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Crear el trigger
DROP TRIGGER IF EXISTS trigger_asignar_pin_guardias ON guardias;
CREATE TRIGGER trigger_asignar_pin_guardias
    BEFORE INSERT ON guardias
    FOR EACH ROW
    EXECUTE FUNCTION asignar_pin_automatico();

-- 12. Comentarios para documentar los campos
COMMENT ON COLUMN guardias.monto_anticipo IS 'Monto del anticipo en pesos chilenos (sin decimales, máximo 6 dígitos)';
COMMENT ON COLUMN guardias.pin IS 'PIN único de 4 dígitos para acceso a sistema de rondas';
COMMENT ON COLUMN guardias.dias_vacaciones_pendientes IS 'Días de vacaciones pendientes (se actualiza mensualmente con 1.25 días)';
COMMENT ON COLUMN guardias.fecha_ingreso IS 'Fecha de ingreso del guardia a la empresa';
COMMENT ON COLUMN guardias.fecha_finiquito IS 'Fecha de finiquito del guardia (solo para guardias inactivos)';

-- 13. Verificar que la migración se ejecutó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'guardias' 
    AND column_name IN ('monto_anticipo', 'pin', 'dias_vacaciones_pendientes', 'fecha_ingreso', 'fecha_finiquito')
ORDER BY column_name;
