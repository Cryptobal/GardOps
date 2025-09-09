-- Script para limpiar y consolidar tablas

-- Eliminar tablas antiguas
DROP TABLE IF EXISTS historial_estructuras_servicio CASCADE;
DROP TABLE IF EXISTS historial_roles_servicio CASCADE;
DROP TABLE IF EXISTS sueldo_estructuras_roles CASCADE;
DROP TABLE IF EXISTS sueldo_estructuras_servicio CASCADE;
DROP TABLE IF EXISTS sueldo_estructuras CASCADE;
DROP TABLE IF EXISTS sueldo_historial CASCADE;

-- Crear tabla principal de estructuras
CREATE TABLE sueldo_estructuras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id UUID NOT NULL,
  rol_servicio_id UUID NOT NULL,
  sueldo_base INTEGER NOT NULL DEFAULT 0,
  bono_id UUID,
  monto INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_inactivacion TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Crear restricción única
ALTER TABLE sueldo_estructuras 
ADD CONSTRAINT unique_instalacion_rol_bono 
UNIQUE(instalacion_id, rol_servicio_id, bono_id);

-- Crear tabla de historial
CREATE TABLE sueldo_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estructura_id UUID NOT NULL,
  rol_servicio_id UUID NOT NULL,
  accion VARCHAR(50) NOT NULL,
  fecha_accion TIMESTAMP NOT NULL DEFAULT NOW(),
  detalles TEXT,
  usuario_id UUID,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Crear índices en sueldo_estructuras
CREATE INDEX idx_sueldo_estructuras_instalacion 
ON sueldo_estructuras(instalacion_id);

CREATE INDEX idx_sueldo_estructuras_rol 
ON sueldo_estructuras(rol_servicio_id);

CREATE INDEX idx_sueldo_estructuras_activo 
ON sueldo_estructuras(activo);

-- Crear índices en sueldo_historial
CREATE INDEX idx_sueldo_historial_estructura 
ON sueldo_historial(estructura_id);

CREATE INDEX idx_sueldo_historial_fecha 
ON sueldo_historial(fecha_accion);

CREATE INDEX idx_sueldo_historial_rol 
ON sueldo_historial(rol_servicio_id);

-- Las restricciones de clave foránea se agregarán después
-- cuando las tablas referenciadas existan