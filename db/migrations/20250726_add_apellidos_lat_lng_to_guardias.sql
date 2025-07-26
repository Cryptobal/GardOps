-- Migración para agregar apellidos y confirmar lat/lng en tabla guardias
-- Fecha: 2025-01-26
-- Descripción: Agrega campos apellido_paterno y apellido_materno, confirma lat/lng

-- Agregar campos apellidos (solo si no existen)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'apellido_paterno' AND table_schema = 'public') THEN
    ALTER TABLE public.guardias ADD COLUMN apellido_paterno VARCHAR(255);
    RAISE NOTICE 'Campo apellido_paterno agregado a guardias';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'apellido_materno' AND table_schema = 'public') THEN
    ALTER TABLE public.guardias ADD COLUMN apellido_materno VARCHAR(255);
    RAISE NOTICE 'Campo apellido_materno agregado a guardias';
  END IF;
  
  -- Confirmar que lat y lng existen
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'lat' AND table_schema = 'public') THEN
    ALTER TABLE public.guardias ADD COLUMN lat DOUBLE PRECISION;
    RAISE NOTICE 'Campo lat agregado a guardias';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'lng' AND table_schema = 'public') THEN
    ALTER TABLE public.guardias ADD COLUMN lng DOUBLE PRECISION;
    RAISE NOTICE 'Campo lng agregado a guardias';
  END IF;
END $$;

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN public.guardias.apellido_paterno IS 'Apellido paterno del guardia';
COMMENT ON COLUMN public.guardias.apellido_materno IS 'Apellido materno del guardia';
COMMENT ON COLUMN public.guardias.lat IS 'Latitud de la ubicación del guardia';
COMMENT ON COLUMN public.guardias.lng IS 'Longitud de la ubicación del guardia';

-- Crear índice compuesto para optimizar búsquedas por ubicación (si no existe)
CREATE INDEX IF NOT EXISTS idx_guardias_location ON public.guardias (lat, lng);

-- Confirmación
SELECT 'Migración completada: Campos apellidos y georreferenciación agregados a tabla guardias' as resultado; 