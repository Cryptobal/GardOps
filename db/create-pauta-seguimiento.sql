-- Tabla para seguimiento de guardias en pauta diaria
-- Permite registrar estados y comentarios sin saturar la vista principal

CREATE TABLE IF NOT EXISTS pauta_seguimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pauta_id BIGINT NOT NULL,
  estado_seguimiento VARCHAR(20) DEFAULT 'sin_info' CHECK (estado_seguimiento IN ('sin_info', 'en_camino', 'en_puesto', 'no_contesta')),
  comentario TEXT,
  operador_id UUID REFERENCES usuarios(id),
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Índices para performance
  CONSTRAINT unique_pauta_seguimiento UNIQUE (pauta_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_pauta_seguimiento_pauta_id ON pauta_seguimiento(pauta_id);
CREATE INDEX IF NOT EXISTS idx_pauta_seguimiento_tenant ON pauta_seguimiento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pauta_seguimiento_estado ON pauta_seguimiento(estado_seguimiento);
CREATE INDEX IF NOT EXISTS idx_pauta_seguimiento_updated ON pauta_seguimiento(updated_at);

-- Comentarios para documentación
COMMENT ON TABLE pauta_seguimiento IS 'Seguimiento de estados y comentarios de guardias en pauta diaria';
COMMENT ON COLUMN pauta_seguimiento.estado_seguimiento IS 'Estado del guardia: sin_info, en_camino, en_puesto, no_contesta';
COMMENT ON COLUMN pauta_seguimiento.comentario IS 'Observaciones del operador sobre el guardia';
COMMENT ON COLUMN pauta_seguimiento.operador_id IS 'Usuario que actualizó el seguimiento';
