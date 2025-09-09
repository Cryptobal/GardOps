-- Crear tabla para estructuras de servicio por instalación y rol
CREATE TABLE IF NOT EXISTS sueldo_estructuras_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
  rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
  sueldo_base INTEGER NOT NULL DEFAULT 0,
  bono_id UUID REFERENCES sueldo_bonos_globales(id) ON DELETE CASCADE,
  monto INTEGER NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_inactivacion TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para mejorar el rendimiento
  CONSTRAINT unique_instalacion_rol_bono UNIQUE(instalacion_id, rol_servicio_id, bono_id)
);

-- Crear índices
CREATE INDEX idx_sueldo_estructuras_instalacion ON sueldo_estructuras_servicio(instalacion_id);
CREATE INDEX idx_sueldo_estructuras_rol ON sueldo_estructuras_servicio(rol_servicio_id);
CREATE INDEX idx_sueldo_estructuras_instalacion_rol ON sueldo_estructuras_servicio(instalacion_id, rol_servicio_id);
CREATE INDEX idx_sueldo_estructuras_bono ON sueldo_estructuras_servicio(bono_id);
CREATE INDEX idx_sueldo_estructuras_activo ON sueldo_estructuras_servicio(activo);

-- Comentarios
COMMENT ON TABLE sueldo_estructuras_servicio IS 'Estructura de sueldos por instalación y rol de servicio';
COMMENT ON COLUMN sueldo_estructuras_servicio.sueldo_base IS 'Sueldo base de la estructura';
COMMENT ON COLUMN sueldo_estructuras_servicio.bono_id IS 'Referencia al bono global';
COMMENT ON COLUMN sueldo_estructuras_servicio.monto IS 'Monto del bono en pesos';
COMMENT ON COLUMN sueldo_estructuras_servicio.activo IS 'Indica si la estructura está activa';
COMMENT ON COLUMN sueldo_estructuras_servicio.fecha_inactivacion IS 'Fecha cuando se inactivó la estructura';
