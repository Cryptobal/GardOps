-- Crear tabla de valores UF
CREATE TABLE IF NOT EXISTS sueldo_valor_uf (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  valor DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de parámetros generales
CREATE TABLE IF NOT EXISTS sueldo_parametros_generales (
  id SERIAL PRIMARY KEY,
  parametro VARCHAR(100) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  fecha_vigencia DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de AFP
CREATE TABLE IF NOT EXISTS sueldo_afp (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  comision DECIMAL(5,2) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de ISAPRE
CREATE TABLE IF NOT EXISTS sueldo_isapre (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de mutualidad
CREATE TABLE IF NOT EXISTS sueldo_mutualidad (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  tasa_base DECIMAL(5,2) NOT NULL,
  tasa_adicional DECIMAL(5,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de tramos de impuesto
CREATE TABLE IF NOT EXISTS sueldo_tramos_impuesto (
  id SERIAL PRIMARY KEY,
  tramo INTEGER NOT NULL,
  desde DECIMAL(12,2) NOT NULL,
  hasta DECIMAL(12,2),
  factor DECIMAL(5,3) NOT NULL,
  rebaja DECIMAL(12,2) NOT NULL,
  activo BOOLEAN DEFAULT true,
  fecha_vigencia DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar valores UF para 2024-2025
INSERT INTO sueldo_valor_uf (fecha, valor) VALUES
('2024-01-01', 36789.36),
('2024-02-01', 36815.09),
('2024-03-01', 36938.43),
('2024-04-01', 37026.86),
('2024-05-01', 37105.24),
('2024-06-01', 37188.09),
('2024-07-01', 37261.59),
('2024-08-01', 37306.17),
('2024-09-01', 37354.68),
('2024-10-01', 37446.67),
('2024-11-01', 37534.28),
('2024-12-01', 37665.84),
('2025-01-01', 37746.56),
('2025-02-01', 37800.00),
('2025-03-01', 37850.00),
('2025-04-01', 37900.00),
('2025-05-01', 37950.00),
('2025-06-01', 38000.00),
('2025-07-01', 38050.00),
('2025-08-01', 38100.00),
('2025-09-01', 38150.00),
('2025-10-01', 38200.00),
('2025-11-01', 38250.00),
('2025-12-01', 38300.00)
ON CONFLICT (fecha) DO UPDATE 
SET valor = EXCLUDED.valor,
    updated_at = CURRENT_TIMESTAMP;

-- Insertar parámetros generales
INSERT INTO sueldo_parametros_generales (parametro, valor, descripcion, fecha_vigencia) VALUES
('UF_TOPE_IMPONIBLE', 87.8, 'Tope imponible en UF para cotizaciones previsionales', '2025-01-01'),
('SUELDO_MINIMO', 529000, 'Sueldo mínimo legal', '2025-01-01'),
('GRATIFICACION_TOPE_MENSUAL', 209396, 'Tope mensual para gratificación legal', '2025-01-01'),
('HORAS_EXTRAS_MAX_MES', 60, 'Máximo de horas extras permitidas al mes', '2025-01-01'),
('AFC_TRABAJADOR_INDEFINIDO', 0.6, 'Porcentaje AFC trabajador contrato indefinido', '2025-01-01'),
('AFC_EMPLEADOR_INDEFINIDO', 2.4, 'Porcentaje AFC empleador contrato indefinido', '2025-01-01'),
('AFC_EMPLEADOR_PLAZO_FIJO', 3.0, 'Porcentaje AFC empleador contrato plazo fijo', '2025-01-01'),
('SIS_EMPLEADOR', 1.88, 'Porcentaje SIS pagado por empleador', '2025-01-01'),
('REFORMA_PREVISIONAL', 1.0, 'Porcentaje reforma previsional empleador', '2025-01-01')
ON CONFLICT DO NOTHING;

-- Insertar AFPs con tasas 2025
INSERT INTO sueldo_afp (codigo, nombre, comision) VALUES
('capital', 'AFP Capital', 11.44),
('cuprum', 'AFP Cuprum', 11.44),
('habitat', 'AFP Habitat', 11.27),
('modelo', 'AFP Modelo', 10.77),
('planvital', 'AFP PlanVital', 11.10),
('provida', 'AFP ProVida', 11.45),
('uno', 'AFP Uno', 10.69)
ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre,
    comision = EXCLUDED.comision,
    updated_at = CURRENT_TIMESTAMP;

-- Insertar ISAPRES
INSERT INTO sueldo_isapre (codigo, nombre) VALUES
('banmedica', 'Banmédica'),
('consalud', 'Consalud'),
('cruz_blanca', 'Cruz Blanca'),
('colmena', 'Colmena Golden Cross'),
('nueva_masvida', 'Nueva Masvida'),
('vida_tres', 'Vida Tres'),
('fonasa', 'FONASA')
ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre,
    updated_at = CURRENT_TIMESTAMP;

-- Insertar Mutualidades
INSERT INTO sueldo_mutualidad (codigo, nombre, tasa_base, tasa_adicional) VALUES
('achs', 'Asociación Chilena de Seguridad', 0.90, 0),
('ist', 'Instituto de Seguridad del Trabajo', 0.90, 0),
('museg', 'Mutual de Seguridad CChC', 0.90, 0)
ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre,
    tasa_base = EXCLUDED.tasa_base,
    tasa_adicional = EXCLUDED.tasa_adicional,
    updated_at = CURRENT_TIMESTAMP;

-- Insertar tramos de impuesto 2025
INSERT INTO sueldo_tramos_impuesto (tramo, desde, hasta, factor, rebaja, fecha_vigencia) VALUES
(1, 0, 1500000, 0.000, 0, '2025-01-01'),
(2, 1500000.01, 2500000, 0.040, 60000, '2025-01-01'),
(3, 2500000.01, 3500000, 0.080, 160000, '2025-01-01'),
(4, 3500000.01, 4500000, 0.135, 327500, '2025-01-01'),
(5, 4500000.01, 5500000, 0.230, 765000, '2025-01-01'),
(6, 5500000.01, 7500000, 0.304, 1156500, '2025-01-01'),
(7, 7500000.01, 10000000, 0.350, 1656500, '2025-01-01'),
(8, 10000000.01, NULL, 0.400, 2156500, '2025-01-01')
ON CONFLICT DO NOTHING;
