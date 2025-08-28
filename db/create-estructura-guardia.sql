-- Tablas para Estructuras por Guardia

-- Extensiones necesarias para exclusión por rango
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Cabecera de estructura por guardia
CREATE TABLE IF NOT EXISTS sueldo_estructura_guardia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardia_id UUID NOT NULL REFERENCES guardias(id) ON DELETE CASCADE,
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- rango materializado para exclusión (incluye ambos extremos)
  periodo DATERANGE GENERATED ALWAYS AS (daterange(vigencia_desde, COALESCE(vigencia_hasta, 'infinity'::date), '[]')) STORED
);

-- Evitar solapes por guardia en el mismo período
DO $$ BEGIN
  ALTER TABLE sueldo_estructura_guardia
  ADD CONSTRAINT sueldo_estructura_guardia_no_overlap
  EXCLUDE USING gist (
    guardia_id WITH =,
    periodo WITH &&
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_guardia_guardia ON sueldo_estructura_guardia(guardia_id);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_guardia_periodo ON sueldo_estructura_guardia USING gist(periodo);

-- Detalle de ítems de estructura por guardia
CREATE TABLE IF NOT EXISTS sueldo_estructura_guardia_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estructura_guardia_id UUID NOT NULL REFERENCES sueldo_estructura_guardia(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES sueldo_item(id) ON DELETE RESTRICT,
  monto DECIMAL(15,2) NOT NULL DEFAULT 0,
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evitar solape de vigencia del mismo ítem en la misma estructura
CREATE UNIQUE INDEX IF NOT EXISTS uq_guardia_item_inicio
ON sueldo_estructura_guardia_item(estructura_guardia_id, item_id, vigencia_desde);

CREATE INDEX IF NOT EXISTS idx_guardia_item_estructura ON sueldo_estructura_guardia_item(estructura_guardia_id);
CREATE INDEX IF NOT EXISTS idx_guardia_item_item ON sueldo_estructura_guardia_item(item_id);
CREATE INDEX IF NOT EXISTS idx_guardia_item_activo ON sueldo_estructura_guardia_item(activo);

COMMENT ON TABLE sueldo_estructura_guardia IS 'Cabecera de estructuras salariales personalizadas por guardia';
COMMENT ON TABLE sueldo_estructura_guardia_item IS 'Ítems de la estructura salarial del guardia';


