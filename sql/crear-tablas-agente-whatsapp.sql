-- =====================================================
-- TABLAS NECESARIAS PARA AGENTE DE WHATSAPP
-- Base de datos: Neon PostgreSQL
-- =====================================================

-- 1. Tabla: central_conversaciones (Memoria de 15 días)
CREATE TABLE IF NOT EXISTS central_conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono TEXT NOT NULL,
  instalacion_id UUID REFERENCES instalaciones(id),
  llamado_id UUID,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('enviado', 'recibido')),
  metadatos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_conversaciones_telefono ON central_conversaciones(telefono);
CREATE INDEX IF NOT EXISTS idx_conversaciones_fecha ON central_conversaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversaciones_llamado ON central_conversaciones(llamado_id);

-- 2. Verificar/Ajustar tabla: central_llamados
-- Esta tabla debería existir, pero vamos a asegurarnos de que tenga todas las columnas necesarias

-- Agregar columnas si no existen
DO $$ 
BEGIN
  -- contacto_telefono
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'central_llamados' 
    AND column_name = 'contacto_telefono'
  ) THEN
    ALTER TABLE central_llamados ADD COLUMN contacto_telefono TEXT;
  END IF;

  -- contacto_tipo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'central_llamados' 
    AND column_name = 'contacto_tipo'
  ) THEN
    ALTER TABLE central_llamados ADD COLUMN contacto_tipo VARCHAR(20) DEFAULT 'instalacion';
  END IF;

  -- contacto_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'central_llamados' 
    AND column_name = 'contacto_id'
  ) THEN
    ALTER TABLE central_llamados ADD COLUMN contacto_id UUID;
  END IF;

  -- contacto_nombre
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'central_llamados' 
    AND column_name = 'contacto_nombre'
  ) THEN
    ALTER TABLE central_llamados ADD COLUMN contacto_nombre TEXT;
  END IF;

  -- observaciones
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'central_llamados' 
    AND column_name = 'observaciones'
  ) THEN
    ALTER TABLE central_llamados ADD COLUMN observaciones TEXT;
  END IF;

  -- ejecutado_en
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'central_llamados' 
    AND column_name = 'ejecutado_en'
  ) THEN
    ALTER TABLE central_llamados ADD COLUMN ejecutado_en TIMESTAMPTZ;
  END IF;

END $$;

-- 3. Índices adicionales para central_llamados
CREATE INDEX IF NOT EXISTS idx_central_llamados_telefono ON central_llamados(contacto_telefono);
CREATE INDEX IF NOT EXISTS idx_central_llamados_programado ON central_llamados(programado_para);

-- 4. Verificar tabla: central_incidentes
-- Agregar campos si no existen
DO $$ 
BEGIN
  -- detalle
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'central_incidentes' 
    AND column_name = 'detalle'
  ) THEN
    ALTER TABLE central_incidentes ADD COLUMN detalle TEXT;
  END IF;
END $$;

-- =====================================================
-- CONSULTAS DE VERIFICACIÓN
-- =====================================================

-- Verificar que las tablas existen
SELECT 
  tablename, 
  schemaname
FROM pg_tables 
WHERE tablename IN ('central_llamados', 'central_conversaciones', 'central_incidentes', 'instalaciones')
ORDER BY tablename;

-- Verificar columnas de central_llamados
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'central_llamados'
ORDER BY ordinal_position;

-- Verificar columnas de central_conversaciones
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'central_conversaciones'
ORDER BY ordinal_position;

