-- Crear tabla para estructuras de servicio por instalación
CREATE TABLE IF NOT EXISTS sueldo_estructura_instalacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
  rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  vigencia_desde DATE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para mejorar el rendimiento
  CONSTRAINT unique_instalacion_rol_version UNIQUE(instalacion_id, rol_servicio_id, version)
);

-- Crear tabla para ítems de estructura de servicio
CREATE TABLE IF NOT EXISTS sueldo_estructura_inst_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estructura_id UUID NOT NULL REFERENCES sueldo_estructura_instalacion(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES sueldo_item(id) ON DELETE CASCADE,
  monto DECIMAL(15,2) NOT NULL DEFAULT 0,
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para mejorar el rendimiento
  CONSTRAINT unique_estructura_item_vigencia UNIQUE(estructura_id, item_id, vigencia_desde)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_instalacion_instalacion ON sueldo_estructura_instalacion(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_instalacion_rol ON sueldo_estructura_instalacion(rol_servicio_id);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_instalacion_activo ON sueldo_estructura_instalacion(activo);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_inst_item_estructura ON sueldo_estructura_inst_item(estructura_id);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_inst_item_item ON sueldo_estructura_inst_item(item_id);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_inst_item_activo ON sueldo_estructura_inst_item(activo);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_inst_item_vigencia ON sueldo_estructura_inst_item(vigencia_desde, vigencia_hasta);

-- Comentarios
COMMENT ON TABLE sueldo_estructura_instalacion IS 'Cabecera de estructuras de servicio por instalación y rol';
COMMENT ON COLUMN sueldo_estructura_instalacion.version IS 'Versión de la estructura (para control de cambios)';
COMMENT ON COLUMN sueldo_estructura_instalacion.vigencia_desde IS 'Fecha desde la cual es válida la estructura';
COMMENT ON COLUMN sueldo_estructura_instalacion.activo IS 'Indica si la estructura está activa';

COMMENT ON TABLE sueldo_estructura_inst_item IS 'Detalle de ítems de estructura de servicio';
COMMENT ON COLUMN sueldo_estructura_inst_item.monto IS 'Monto del ítem en la estructura';
COMMENT ON COLUMN sueldo_estructura_inst_item.vigencia_desde IS 'Fecha desde la cual es válido el ítem';
COMMENT ON COLUMN sueldo_estructura_inst_item.vigencia_hasta IS 'Fecha hasta la cual es válido el ítem (NULL = sin límite)';
COMMENT ON COLUMN sueldo_estructura_inst_item.activo IS 'Indica si el ítem está activo en la estructura';
