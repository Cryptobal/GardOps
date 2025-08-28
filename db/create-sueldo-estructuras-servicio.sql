-- Crear tabla sueldo_estructuras_servicio si no existe
CREATE TABLE IF NOT EXISTS sueldo_estructuras_servicio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instalacion_id UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
    rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
    sueldo_base NUMERIC(12,2) NOT NULL DEFAULT 0,
    bono_id UUID REFERENCES sueldo_bonos_globales(id) ON DELETE SET NULL,
    monto NUMERIC(12,2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_inactivacion TIMESTAMP NULL,
    descripcion TEXT NULL,
    creado_por TEXT NOT NULL DEFAULT 'sistema',
    actualizado_por TEXT NULL,
    actualizado_en TIMESTAMP NULL
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_instalacion ON sueldo_estructuras_servicio(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_rol ON sueldo_estructuras_servicio(rol_servicio_id);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_instalacion_rol ON sueldo_estructuras_servicio(instalacion_id, rol_servicio_id);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_bono ON sueldo_estructuras_servicio(bono_id);
CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_activo ON sueldo_estructuras_servicio(activo);

-- Crear constraint único para evitar duplicados
ALTER TABLE sueldo_estructuras_servicio 
ADD CONSTRAINT uk_sueldo_estructuras_instalacion_rol 
UNIQUE (instalacion_id, rol_servicio_id);

-- Agregar comentarios
COMMENT ON TABLE sueldo_estructuras_servicio IS 'Estructura de sueldos por instalación y rol de servicio';
COMMENT ON COLUMN sueldo_estructuras_servicio.sueldo_base IS 'Sueldo base de la estructura';
COMMENT ON COLUMN sueldo_estructuras_servicio.bono_id IS 'Referencia al bono global';
COMMENT ON COLUMN sueldo_estructuras_servicio.monto IS 'Monto del bono en pesos';
COMMENT ON COLUMN sueldo_estructuras_servicio.activo IS 'Indica si la estructura está activa';
COMMENT ON COLUMN sueldo_estructuras_servicio.fecha_inactivacion IS 'Fecha cuando se inactivó la estructura';
