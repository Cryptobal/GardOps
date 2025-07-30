-- Script para agregar columna instalacion_id a la tabla guardias
-- Ejecutar en la base de datos de producción

-- 1. Agregar la columna instalacion_id
ALTER TABLE guardias 
ADD COLUMN instalacion_id UUID;

-- 2. Crear índice para mejorar el rendimiento de consultas
CREATE INDEX idx_guardias_instalacion_id ON guardias(instalacion_id);

-- 3. Agregar restricción de clave foránea (opcional, descomentar si se desea)
-- ALTER TABLE guardias 
-- ADD CONSTRAINT fk_guardias_instalacion 
-- FOREIGN KEY (instalacion_id) REFERENCES instalaciones(id);

-- 4. Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'guardias' AND column_name = 'instalacion_id';

-- 5. Mostrar estadísticas de la tabla
SELECT 
    COUNT(*) as total_guardias,
    COUNT(instalacion_id) as guardias_con_instalacion,
    COUNT(*) - COUNT(instalacion_id) as guardias_sin_instalacion
FROM guardias; 