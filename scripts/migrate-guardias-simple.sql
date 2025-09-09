-- Migración simplificada para agregar nuevos campos a la tabla guardias

-- 1. Agregar campo monto_anticipo (entero sin decimales, máximo 6 dígitos)
ALTER TABLE guardias ADD COLUMN IF NOT EXISTS monto_anticipo INTEGER CHECK (monto_anticipo >= 0 AND monto_anticipo <= 999999);

-- 2. Agregar campo pin (4 dígitos únicos)
ALTER TABLE guardias ADD COLUMN IF NOT EXISTS pin VARCHAR(4) UNIQUE CHECK (pin ~ '^[0-9]{4}$');

-- 3. Agregar campo dias_vacaciones_pendientes (decimal con 2 decimales)
ALTER TABLE guardias ADD COLUMN IF NOT EXISTS dias_vacaciones_pendientes DECIMAL(5,2) DEFAULT 0.00 CHECK (dias_vacaciones_pendientes >= 0);

-- 4. Agregar campo fecha_ingreso
ALTER TABLE guardias ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;

-- 5. Agregar campo fecha_finiquito
ALTER TABLE guardias ADD COLUMN IF NOT EXISTS fecha_finiquito DATE;

-- 6. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_guardias_pin ON guardias(pin);
CREATE INDEX IF NOT EXISTS idx_guardias_fecha_ingreso ON guardias(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_guardias_fecha_finiquito ON guardias(fecha_finiquito);
