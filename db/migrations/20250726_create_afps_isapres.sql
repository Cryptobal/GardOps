-- Migración para crear tablas AFPs e ISAPREs
-- Fecha: 2025-01-26
-- Descripción: Crea las tablas de AFPs e ISAPREs con datos iniciales

-- Crear tabla AFPs
CREATE TABLE IF NOT EXISTS public.afps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar AFPs
INSERT INTO public.afps (nombre) VALUES
  ('AFP Habitat'),
  ('AFP Capital'),
  ('AFP Provida'),
  ('AFP Cuprum'),
  ('AFP PlanVital'),
  ('AFP Modelo')
ON CONFLICT (nombre) DO NOTHING;

-- Crear tabla ISAPREs
CREATE TABLE IF NOT EXISTS public.isapres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar ISAPREs
INSERT INTO public.isapres (nombre) VALUES
  ('FONASA'),
  ('Colmena'),
  ('Cruz Blanca'),
  ('Banmédica'),
  ('Nueva Masvida'),
  ('Consalud'),
  ('Vida Tres')
ON CONFLICT (nombre) DO NOTHING;

-- Confirmación
SELECT 'Migración completada: Tablas AFPs e ISAPREs creadas con datos iniciales' as resultado; 