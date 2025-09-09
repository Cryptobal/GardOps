-- Crear tabla para bonos globales
CREATE TABLE IF NOT EXISTS sueldo_bonos_globales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  imponible BOOLEAN NOT NULL DEFAULT true,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices
CREATE INDEX idx_sueldo_bonos_globales_activo ON sueldo_bonos_globales(activo);
CREATE INDEX idx_sueldo_bonos_globales_imponible ON sueldo_bonos_globales(imponible);

-- Comentarios
COMMENT ON TABLE sueldo_bonos_globales IS 'Catálogo global de bonos disponibles para estructuras de servicio';
COMMENT ON COLUMN sueldo_bonos_globales.nombre IS 'Nombre del bono (ej: Colación, Movilización, Responsabilidad)';
COMMENT ON COLUMN sueldo_bonos_globales.imponible IS 'Indica si el bono es imponible para cálculos previsionales';

-- Insertar los tres bonos básicos
INSERT INTO sueldo_bonos_globales (nombre, descripcion, imponible) VALUES
('Colación', 'Bono de colación para alimentación', false),
('Movilización', 'Bono de movilización para transporte', false),
('Responsabilidad', 'Bono por responsabilidad en el cargo', true)
ON CONFLICT (nombre) DO UPDATE SET 
  descripcion = EXCLUDED.descripcion,
  imponible = EXCLUDED.imponible,
  updated_at = NOW();
