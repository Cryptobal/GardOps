-- Crear tabla para estructuras de servicio por instalación y rol
CREATE TABLE IF NOT EXISTS sueldo_estructuras_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
  rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
  nombre_bono TEXT NOT NULL,
  monto INTEGER NOT NULL,
  imponible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para mejorar el rendimiento
  CONSTRAINT unique_instalacion_rol_bono UNIQUE(instalacion_id, rol_servicio_id, nombre_bono)
);

-- Crear índices
CREATE INDEX idx_sueldo_estructuras_instalacion ON sueldo_estructuras_servicio(instalacion_id);
CREATE INDEX idx_sueldo_estructuras_rol ON sueldo_estructuras_servicio(rol_servicio_id);
CREATE INDEX idx_sueldo_estructuras_instalacion_rol ON sueldo_estructuras_servicio(instalacion_id, rol_servicio_id);

-- Comentarios
COMMENT ON TABLE sueldo_estructuras_servicio IS 'Estructura de sueldos por instalación y rol de servicio';
COMMENT ON COLUMN sueldo_estructuras_servicio.nombre_bono IS 'Nombre del bono (ej: Sueldo base, Movilización, Riesgo)';
COMMENT ON COLUMN sueldo_estructuras_servicio.monto IS 'Monto del bono en pesos';
COMMENT ON COLUMN sueldo_estructuras_servicio.imponible IS 'Indica si el bono es imponible para cálculos previsionales';
