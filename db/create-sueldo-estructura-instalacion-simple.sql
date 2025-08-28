-- Crear tabla para estructuras de servicio por instalación con campos específicos
CREATE TABLE IF NOT EXISTS sueldo_estructura_instalacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
  rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
  sueldo_base INTEGER NOT NULL DEFAULT 0,
  bono_1 INTEGER NOT NULL DEFAULT 0, -- Colación
  bono_2 INTEGER NOT NULL DEFAULT 0, -- Movilización
  bono_3 INTEGER NOT NULL DEFAULT 0, -- Responsabilidad
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para mejorar el rendimiento
  CONSTRAINT unique_instalacion_rol_activa UNIQUE(instalacion_id, rol_servicio_id, activa)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_instalacion_instalacion ON sueldo_estructura_instalacion(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_instalacion_rol ON sueldo_estructura_instalacion(rol_servicio_id);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_instalacion_activa ON sueldo_estructura_instalacion(activa);

-- Comentarios
COMMENT ON TABLE sueldo_estructura_instalacion IS 'Estructura de sueldos por instalación y rol de servicio';
COMMENT ON COLUMN sueldo_estructura_instalacion.sueldo_base IS 'Sueldo base de la estructura';
COMMENT ON COLUMN sueldo_estructura_instalacion.bono_1 IS 'Bono de colación (no imponible)';
COMMENT ON COLUMN sueldo_estructura_instalacion.bono_2 IS 'Bono de movilización (no imponible)';
COMMENT ON COLUMN sueldo_estructura_instalacion.bono_3 IS 'Bono de responsabilidad (imponible)';
COMMENT ON COLUMN sueldo_estructura_instalacion.activa IS 'Indica si la estructura está activa';

