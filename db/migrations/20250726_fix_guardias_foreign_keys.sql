-- Migración para corregir foreign keys en tabla guardias
-- Fecha: 2025-01-26  
-- Descripción: Agrega columnas con foreign keys para banco, salud (isapre) y AFP

-- Agregar columnas con foreign keys
DO $$ 
BEGIN 
  -- Agregar banco_id si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'banco_id' AND table_schema = 'public') THEN
    ALTER TABLE public.guardias ADD COLUMN banco_id UUID;
    RAISE NOTICE 'Campo banco_id agregado a guardias';
  END IF;
  
  -- Agregar salud_id si no existe  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'salud_id' AND table_schema = 'public') THEN
    ALTER TABLE public.guardias ADD COLUMN salud_id UUID;
    RAISE NOTICE 'Campo salud_id agregado a guardias';
  END IF;
  
  -- Agregar afp_id si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guardias' AND column_name = 'afp_id' AND table_schema = 'public') THEN
    ALTER TABLE public.guardias ADD COLUMN afp_id UUID;
    RAISE NOTICE 'Campo afp_id agregado a guardias';
  END IF;
END $$;

-- Crear foreign keys si no existen
DO $$
BEGIN
  -- FK para banco_id -> bancos(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'guardias_banco_id_fkey' 
    AND table_name = 'guardias' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.guardias 
    ADD CONSTRAINT guardias_banco_id_fkey 
    FOREIGN KEY (banco_id) REFERENCES public.bancos(id);
    RAISE NOTICE 'FK guardias_banco_id_fkey creada';
  END IF;
  
  -- FK para salud_id -> isapres(id)  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'guardias_salud_id_fkey' 
    AND table_name = 'guardias' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.guardias 
    ADD CONSTRAINT guardias_salud_id_fkey 
    FOREIGN KEY (salud_id) REFERENCES public.isapres(id);
    RAISE NOTICE 'FK guardias_salud_id_fkey creada';
  END IF;
  
  -- FK para afp_id -> afps(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'guardias_afp_id_fkey' 
    AND table_name = 'guardias' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.guardias 
    ADD CONSTRAINT guardias_afp_id_fkey 
    FOREIGN KEY (afp_id) REFERENCES public.afps(id);
    RAISE NOTICE 'FK guardias_afp_id_fkey creada';
  END IF;
END $$;

-- Agregar comentarios
COMMENT ON COLUMN public.guardias.banco_id IS 'ID del banco (FK a bancos.id)';
COMMENT ON COLUMN public.guardias.salud_id IS 'ID de ISAPRE/FONASA (FK a isapres.id)';
COMMENT ON COLUMN public.guardias.afp_id IS 'ID de AFP (FK a afps.id)';

-- Confirmación
SELECT 'Migración completada: Foreign keys agregadas a tabla guardias' as resultado; 