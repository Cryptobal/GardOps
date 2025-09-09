-- Migración para añadir campos de ubicación geográfica a guardias
-- Ejecutar en orden de dependencias

-- 1. Verificar si la tabla guardias existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guardias') THEN
        RAISE EXCEPTION 'La tabla guardias no existe. Ejecuta primero la migración de guardias.';
    END IF;
END $$;

-- 2. Añadir columnas de ubicación geográfica
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8) NULL,
ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8) NULL,
ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS comuna VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS region VARCHAR(100) NULL;

-- 3. Crear índices para búsquedas geográficas
CREATE INDEX IF NOT EXISTS idx_guardias_location ON guardias(latitud, longitud);
CREATE INDEX IF NOT EXISTS idx_guardias_ciudad ON guardias(ciudad);
CREATE INDEX IF NOT EXISTS idx_guardias_comuna ON guardias(comuna);

-- 4. Comentarios para documentación
COMMENT ON COLUMN guardias.latitud IS 'Latitud geográfica de la ubicación del guardia';
COMMENT ON COLUMN guardias.longitud IS 'Longitud geográfica de la ubicación del guardia';
COMMENT ON COLUMN guardias.ciudad IS 'Ciudad de residencia del guardia';
COMMENT ON COLUMN guardias.comuna IS 'Comuna de residencia del guardia';
COMMENT ON COLUMN guardias.region IS 'Región de residencia del guardia';

-- 5. Verificar la migración
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'guardias' 
AND column_name IN ('latitud', 'longitud', 'ciudad', 'comuna', 'region')
ORDER BY column_name; 