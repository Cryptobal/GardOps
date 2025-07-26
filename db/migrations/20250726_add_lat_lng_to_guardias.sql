-- Migración para agregar campos de georreferenciación a la tabla guardias
-- Fecha: 2025-01-26
-- Descripción: Agrega campos lat y lng para almacenar coordenadas geográficas

ALTER TABLE public.guardias
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN public.guardias.lat IS 'Latitud de la ubicación del guardia';
COMMENT ON COLUMN public.guardias.lng IS 'Longitud de la ubicación del guardia';

-- Crear un índice compuesto para optimizar búsquedas por ubicación
CREATE INDEX IF NOT EXISTS idx_guardias_location ON public.guardias (lat, lng);

-- Confirmación
SELECT 'Migración completada: Campos lat y lng agregados a tabla guardias' as resultado; 