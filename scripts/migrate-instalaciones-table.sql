-- Migrar tabla instalaciones al esquema correcto

-- Agregar columna comuna si no existe
ALTER TABLE instalaciones ADD COLUMN IF NOT EXISTS comuna VARCHAR(100);

-- Renombrar lat a latitud si existe
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instalaciones' AND column_name = 'lat') THEN
        ALTER TABLE instalaciones RENAME COLUMN lat TO latitud;
    END IF;
END $$;

-- Renombrar lng a longitud si existe
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instalaciones' AND column_name = 'lng') THEN
        ALTER TABLE instalaciones RENAME COLUMN lng TO longitud;
    END IF;
END $$;

-- Cambiar el tipo de latitud y longitud a DECIMAL si es necesario
ALTER TABLE instalaciones ALTER COLUMN latitud TYPE DECIMAL(10, 8);
ALTER TABLE instalaciones ALTER COLUMN longitud TYPE DECIMAL(11, 8);

-- Actualizar estados de 'Activa' a 'Activo' y 'Inactiva' a 'Inactivo'
UPDATE instalaciones SET estado = 'Activo' WHERE estado = 'Activa';
UPDATE instalaciones SET estado = 'Inactivo' WHERE estado = 'Inactiva';

-- Modificar la constraint de estado para usar 'Activo' e 'Inactivo'
ALTER TABLE instalaciones DROP CONSTRAINT IF EXISTS check_instalacion_estado;
ALTER TABLE instalaciones DROP CONSTRAINT IF EXISTS instalaciones_estado_check;
ALTER TABLE instalaciones ADD CONSTRAINT instalaciones_estado_check 
    CHECK (estado IN ('Activo', 'Inactivo'));

-- Crear índices faltantes
CREATE INDEX IF NOT EXISTS idx_instalaciones_comuna ON instalaciones(comuna);

-- Verificar la estructura final
SELECT 'Migración completada' as resultado; 