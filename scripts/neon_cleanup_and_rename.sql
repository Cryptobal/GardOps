-- Neon cleanup & rename to enforce sueldo_ prefix and consistency

-- 1) Renombrar historial_estructuras_servicio -> sueldo_historial_estructuras (con respaldo)
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'historial_estructuras_servicio'
  ) THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS backup_historial_estructuras_servicio AS TABLE historial_estructuras_servicio';
    EXECUTE 'ALTER TABLE historial_estructuras_servicio RENAME TO sueldo_historial_estructuras';
  END IF;
END
$do$;

-- 2) Renombrar historial_roles_servicio -> sueldo_historial_roles (con respaldo)
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'historial_roles_servicio'
  ) THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS backup_historial_roles_servicio AS TABLE historial_roles_servicio';
    EXECUTE 'ALTER TABLE historial_roles_servicio RENAME TO sueldo_historial_roles';
  END IF;
END
$do$;

-- 3) Crear vistas de compatibilidad con nombres antiguos para no romper el código
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sueldo_historial_estructuras'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW historial_estructuras_servicio AS SELECT * FROM sueldo_historial_estructuras';
  END IF;
END
$do$;

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sueldo_historial_roles'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW historial_roles_servicio AS SELECT * FROM sueldo_historial_roles';
  END IF;
END
$do$;

-- 4) Respaldar y eliminar sueldo_estructuras_roles (no usado)
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sueldo_estructuras_roles'
  ) THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS backup_sueldo_estructuras_roles AS TABLE sueldo_estructuras_roles';
    EXECUTE 'DROP TABLE IF EXISTS sueldo_estructuras_roles CASCADE';
  END IF;
END
$do$;

-- 5) Asegurar columnas requeridas en sueldo_estructuras_servicio
--    activo, fecha_inactivacion, sueldo_base, bono_id
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sueldo_estructuras_servicio'
  ) THEN
    -- sueldo_base
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'sueldo_estructuras_servicio' AND column_name = 'sueldo_base'
    ) THEN
      EXECUTE 'ALTER TABLE sueldo_estructuras_servicio ADD COLUMN sueldo_base INTEGER NOT NULL DEFAULT 0';
    END IF;

    -- bono_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'sueldo_estructuras_servicio' AND column_name = 'bono_id'
    ) THEN
      EXECUTE 'ALTER TABLE sueldo_estructuras_servicio ADD COLUMN bono_id UUID NULL';
    END IF;

    -- activo
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'sueldo_estructuras_servicio' AND column_name = 'activo'
    ) THEN
      EXECUTE 'ALTER TABLE sueldo_estructuras_servicio ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true';
    END IF;

    -- fecha_inactivacion
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'sueldo_estructuras_servicio' AND column_name = 'fecha_inactivacion'
    ) THEN
      EXECUTE 'ALTER TABLE sueldo_estructuras_servicio ADD COLUMN fecha_inactivacion TIMESTAMP NULL';
    END IF;
  END IF;
END
$do$;
