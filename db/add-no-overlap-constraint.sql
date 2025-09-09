-- Script para agregar constraint de no-solape a estructuras de servicio
-- Este script debe ejecutarse después de que las tablas estén creadas

-- 1. Agregar columnas necesarias si no existen
ALTER TABLE sueldo_estructura_instalacion
  ADD COLUMN IF NOT EXISTS vigencia_desde date,
  ADD COLUMN IF NOT EXISTS vigencia_hasta date NULL;

-- 2. Actualizar vigencia_desde si es NULL
UPDATE sueldo_estructura_instalacion
SET vigencia_desde = COALESCE(vigencia_desde, date_trunc('month', CURRENT_DATE)::date)
WHERE vigencia_desde IS NULL;

-- 3. Hacer vigencia_desde NOT NULL
ALTER TABLE sueldo_estructura_instalacion
  ALTER COLUMN vigencia_desde SET NOT NULL;

-- 4. Eliminar columna periodo si existe (para recrearla como generada)
ALTER TABLE sueldo_estructura_instalacion
  DROP COLUMN IF EXISTS periodo;

-- 5. Crear columna generada 'periodo'
ALTER TABLE sueldo_estructura_instalacion
  ADD COLUMN periodo daterange
  GENERATED ALWAYS AS (
    daterange(vigencia_desde, COALESCE(vigencia_hasta, 'infinity'::date), '[]')
  ) STORED;

-- 6. Crear extensión btree_gist si no existe
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 7. Eliminar constraint de no-solape si existe
ALTER TABLE sueldo_estructura_instalacion
  DROP CONSTRAINT IF EXISTS sueldo_estructura_instalacion_no_overlap;

-- 8. Agregar constraint de exclusión para evitar solapamientos
ALTER TABLE sueldo_estructura_instalacion
  ADD CONSTRAINT sueldo_estructura_instalacion_no_overlap
  EXCLUDE USING gist (
    instalacion_id WITH =,
    rol_servicio_id WITH =,
    periodo       WITH &&
  );

-- Comentarios
COMMENT ON CONSTRAINT sueldo_estructura_instalacion_no_overlap ON sueldo_estructura_instalacion 
IS 'Evita que existan estructuras solapadas para la misma instalación y rol de servicio';

COMMENT ON COLUMN sueldo_estructura_instalacion.periodo 
IS 'Rango de fechas de vigencia de la estructura (generado automáticamente)';

COMMENT ON COLUMN sueldo_estructura_instalacion.vigencia_hasta 
IS 'Fecha hasta la cual es válida la estructura (NULL = sin límite)';
