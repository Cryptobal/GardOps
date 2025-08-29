-- Script adaptado para agregar constraint de no-solape a estructuras de servicio

-- 1. Agregar columna generada 'periodo'
ALTER TABLE sueldo_estructura_instalacion
  DROP COLUMN IF EXISTS periodo;

ALTER TABLE sueldo_estructura_instalacion
  ADD COLUMN periodo daterange
  GENERATED ALWAYS AS (
    daterange(vigencia_desde, COALESCE(vigencia_hasta, 'infinity'::date), '[]')
  ) STORED;

-- 2. Crear extensión btree_gist si no existe
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 3. Eliminar constraint de no-solape si existe
ALTER TABLE sueldo_estructura_instalacion
  DROP CONSTRAINT IF EXISTS sueldo_estructura_instalacion_no_overlap;

-- 4. Agregar constraint de exclusión para evitar solapamientos
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
