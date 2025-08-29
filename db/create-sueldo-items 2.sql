-- Crear tabla para ítems globales de sueldo
CREATE TABLE IF NOT EXISTS sueldo_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  clase VARCHAR(20) NOT NULL CHECK (clase IN ('HABER', 'DESCUENTO')),
  naturaleza VARCHAR(20) NOT NULL CHECK (naturaleza IN ('IMPONIBLE', 'NO_IMPONIBLE')),
  descripcion TEXT,
  formula_json JSONB,
  tope_modo VARCHAR(20) NOT NULL DEFAULT 'NONE' CHECK (tope_modo IN ('NONE', 'MONTO', 'PORCENTAJE')),
  tope_valor DECIMAL(15,2),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_sueldo_item_activo ON sueldo_item(activo);
CREATE INDEX idx_sueldo_item_clase ON sueldo_item(clase);
CREATE INDEX idx_sueldo_item_naturaleza ON sueldo_item(naturaleza);
CREATE INDEX idx_sueldo_item_codigo ON sueldo_item(codigo);

-- Comentarios
COMMENT ON TABLE sueldo_item IS 'Catálogo global de ítems de sueldo (haberes y descuentos)';
COMMENT ON COLUMN sueldo_item.codigo IS 'Código único del ítem (auto-generado desde nombre)';
COMMENT ON COLUMN sueldo_item.nombre IS 'Nombre del ítem (ej: Colación, Movilización, Descuento por ausencia)';
COMMENT ON COLUMN sueldo_item.clase IS 'Tipo de ítem: HABER (suma al sueldo) o DESCUENTO (resta del sueldo)';
COMMENT ON COLUMN sueldo_item.naturaleza IS 'Naturaleza para efectos previsionales: IMPONIBLE o NO_IMPONIBLE';
COMMENT ON COLUMN sueldo_item.descripcion IS 'Descripción opcional del ítem';
COMMENT ON COLUMN sueldo_item.formula_json IS 'Fórmula de cálculo en formato JSON (opcional)';
COMMENT ON COLUMN sueldo_item.tope_modo IS 'Tipo de tope aplicable: NONE, MONTO, PORCENTAJE';
COMMENT ON COLUMN sueldo_item.tope_valor IS 'Valor del tope (visible si tope_modo != NONE)';

-- Insertar ítems básicos de ejemplo
INSERT INTO sueldo_item (codigo, nombre, clase, naturaleza, descripcion, tope_modo) VALUES
('colacion', 'Colación', 'HABER', 'NO_IMPONIBLE', 'Bono de colación para alimentación', 'NONE'),
('movilizacion', 'Movilización', 'HABER', 'NO_IMPONIBLE', 'Bono de movilización para transporte', 'NONE'),
('responsabilidad', 'Responsabilidad', 'HABER', 'IMPONIBLE', 'Bono por responsabilidad en el cargo', 'NONE'),
('descuento_ausencia', 'Descuento por Ausencia', 'DESCUENTO', 'IMPONIBLE', 'Descuento por días de ausencia', 'PORCENTAJE'),
('descuento_anticipo', 'Descuento por Anticipo', 'DESCUENTO', 'IMPONIBLE', 'Descuento por anticipos de sueldo', 'MONTO')
ON CONFLICT (codigo) DO UPDATE SET 
  nombre = EXCLUDED.nombre,
  clase = EXCLUDED.clase,
  naturaleza = EXCLUDED.naturaleza,
  descripcion = EXCLUDED.descripcion,
  tope_modo = EXCLUDED.tope_modo,
  updated_at = NOW();
