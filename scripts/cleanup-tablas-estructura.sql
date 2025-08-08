-- Script para limpiar y ordenar tablas de estructuras y servicios

-- 1. Crear nueva tabla de historial con prefijo sueldo_
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE tablename = 'sueldo_historial_estructuras'
  ) THEN
    CREATE TABLE sueldo_historial_estructuras (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rol_servicio_id UUID NOT NULL,
      estructura_id UUID NOT NULL,
      accion VARCHAR(50) NOT NULL,
      fecha_accion TIMESTAMP NOT NULL DEFAULT NOW(),
      detalles TEXT,
      usuario_id UUID,
      datos_anteriores JSONB,
      datos_nuevos JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Crear índices en la nueva tabla
    CREATE INDEX idx_sueldo_historial_estructura_id 
    ON sueldo_historial_estructuras(estructura_id);

    CREATE INDEX idx_sueldo_historial_fecha 
    ON sueldo_historial_estructuras(fecha_accion);

    CREATE INDEX idx_sueldo_historial_rol 
    ON sueldo_historial_estructuras(rol_servicio_id);
  END IF;
END $$;

-- 2. Eliminar tablas antiguas si existen
DROP TABLE IF EXISTS historial_estructuras_servicio CASCADE;
DROP TABLE IF EXISTS historial_roles_servicio CASCADE;

-- 3. Verificar y crear tabla principal si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE tablename = 'sueldo_estructuras_servicio'
  ) THEN
    CREATE TABLE sueldo_estructuras_servicio (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      instalacion_id UUID NOT NULL,
      rol_servicio_id UUID NOT NULL,
      sueldo_base INTEGER NOT NULL DEFAULT 0,
      bono_id UUID,
      monto INTEGER NOT NULL DEFAULT 0,
      activo BOOLEAN NOT NULL DEFAULT true,
      fecha_inactivacion TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_instalacion_rol_bono UNIQUE(instalacion_id, rol_servicio_id, bono_id)
    );

    -- Crear índices
    CREATE INDEX idx_sueldo_estructuras_instalacion 
    ON sueldo_estructuras_servicio(instalacion_id);

    CREATE INDEX idx_sueldo_estructuras_rol 
    ON sueldo_estructuras_servicio(rol_servicio_id);

    CREATE INDEX idx_sueldo_estructuras_activo 
    ON sueldo_estructuras_servicio(activo);
  END IF;
END $$;

-- 4. Verificar y crear tabla de bonos globales si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE tablename = 'sueldo_bonos_globales'
  ) THEN
    CREATE TABLE sueldo_bonos_globales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre VARCHAR(100) NOT NULL UNIQUE,
      descripcion TEXT,
      imponible BOOLEAN NOT NULL DEFAULT true,
      activo BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Crear índices
    CREATE INDEX idx_sueldo_bonos_globales_activo 
    ON sueldo_bonos_globales(activo);

    CREATE INDEX idx_sueldo_bonos_globales_imponible 
    ON sueldo_bonos_globales(imponible);
  END IF;
END $$;