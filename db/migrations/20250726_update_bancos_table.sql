-- Migración para actualizar tabla bancos con bancos chilenos oficiales
-- Fecha: 2025-01-26
-- Descripción: Elimina todos los bancos existentes y agrega solo los bancos oficiales con códigos

-- Limpiar tabla bancos existente
TRUNCATE TABLE public.bancos RESTART IDENTITY CASCADE;

-- Agregar columna codigo si no existe
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bancos' AND column_name = 'codigo' AND table_schema = 'public') THEN
    ALTER TABLE public.bancos ADD COLUMN codigo VARCHAR(3) UNIQUE;
    RAISE NOTICE 'Campo codigo agregado a bancos';
  END IF;
END $$;

-- Insertar bancos oficiales chilenos con códigos
INSERT INTO public.bancos (codigo, nombre) VALUES
  ('001', 'Banco de Chile'),
  ('009', 'Banco Internacional'),
  ('012', 'Banco del Estado de Chile (BancoEstado)'),
  ('014', 'Scotiabank Chile (BancoDesarrollo)'),
  ('016', 'Banco de Crédito e Inversiones (BCI)'),
  ('028', 'Banco BICE'),
  ('031', 'HSBC Bank Chile'),
  ('037', 'Banco Santander Chile'),
  ('039', 'Banco Itaú Corpbanca (Itaú Chile)'),
  ('049', 'Banco Security'),
  ('051', 'Banco Falabella'),
  ('052', 'Deutsche Bank (Chile)'),
  ('053', 'Banco Ripley'),
  ('054', 'Rabobank Chile'),
  ('055', 'Banco Consorcio'),
  ('056', 'Banco Penta'),
  ('059', 'Banco BTG Pactual Chile'),
  ('062', 'Tanner Banco Digital');

-- Crear índice para código
CREATE INDEX IF NOT EXISTS idx_bancos_codigo ON public.bancos (codigo);

-- Agregar comentarios
COMMENT ON COLUMN public.bancos.codigo IS 'Código oficial del banco según SBIF/CMF';
COMMENT ON COLUMN public.bancos.nombre IS 'Nombre oficial del banco';

-- Confirmación
SELECT 'Migración completada: Tabla bancos actualizada con 18 bancos oficiales' as resultado; 