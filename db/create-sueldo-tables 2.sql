-- =====================================================
-- TABLAS DE CONFIGURACIÓN PARA CÁLCULO DE SUELDOS
-- Normativa Chilena 2025
-- =====================================================

-- 1. Tabla de AFPs con sus tasas oficiales
CREATE TABLE IF NOT EXISTS sueldo_afp (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    tasa_cotizacion DECIMAL(5,2) NOT NULL, -- Tasa total (incluye SIS)
    comision DECIMAL(5,2) NOT NULL, -- Comisión AFP
    sis DECIMAL(5,2) NOT NULL DEFAULT 1.88, -- Seguro de Invalidez y Sobrevivencia
    activo BOOLEAN DEFAULT true,
    fecha_vigencia DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar AFPs con tasas oficiales 2025
INSERT INTO sueldo_afp (codigo, nombre, tasa_cotizacion, comision, sis, fecha_vigencia) VALUES
('capital', 'AFP Capital', 11.44, 1.44, 1.88, '2025-01-01'),
('cuprum', 'AFP Cuprum', 11.44, 1.44, 1.88, '2025-01-01'),
('habitat', 'AFP Habitat', 11.27, 1.27, 1.88, '2025-01-01'),
('modelo', 'AFP Modelo', 10.77, 0.77, 1.88, '2025-01-01'),
('planvital', 'AFP PlanVital', 11.10, 1.10, 1.88, '2025-01-01'),
('provida', 'AFP ProVida', 11.45, 1.45, 1.88, '2025-01-01'),
('uno', 'AFP UNO', 10.69, 0.69, 1.88, '2025-01-01')
ON CONFLICT (codigo) DO UPDATE SET 
    tasa_cotizacion = EXCLUDED.tasa_cotizacion,
    comision = EXCLUDED.comision,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Tabla de ISAPREs
CREATE TABLE IF NOT EXISTS sueldo_isapre (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar ISAPREs principales
INSERT INTO sueldo_isapre (codigo, nombre) VALUES
('fonasa', 'FONASA'),
('banmedica', 'Banmédica'),
('consalud', 'Consalud'),
('colmena', 'Colmena Golden Cross'),
('cruz_blanca', 'Cruz Blanca'),
('nueva_masvida', 'Nueva Masvida'),
('vida_tres', 'Vida Tres')
ON CONFLICT (codigo) DO NOTHING;

-- 3. Tabla de Mutualidades
CREATE TABLE IF NOT EXISTS sueldo_mutualidad (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    tasa_base DECIMAL(5,2) NOT NULL DEFAULT 0.90, -- Tasa básica
    tasa_adicional DECIMAL(5,2) DEFAULT 0.00, -- Tasa adicional por siniestralidad
    activo BOOLEAN DEFAULT true,
    fecha_vigencia DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar Mutualidades
INSERT INTO sueldo_mutualidad (codigo, nombre, tasa_base, fecha_vigencia) VALUES
('achs', 'ACHS', 0.90, '2025-01-01'),
('mutual', 'Mutual de Seguridad', 0.90, '2025-01-01'),
('ist', 'IST', 0.90, '2025-01-01'),
('isl', 'ISL', 0.90, '2025-01-01')
ON CONFLICT (codigo) DO UPDATE SET 
    tasa_base = EXCLUDED.tasa_base,
    updated_at = CURRENT_TIMESTAMP;

-- 4. Tabla de Parámetros Generales
CREATE TABLE IF NOT EXISTS sueldo_parametros_generales (
    id SERIAL PRIMARY KEY,
    parametro VARCHAR(100) NOT NULL UNIQUE,
    valor DECIMAL(15,2) NOT NULL,
    descripcion TEXT,
    fecha_vigencia DATE NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar Parámetros Generales 2025
INSERT INTO sueldo_parametros_generales (parametro, valor, descripcion, fecha_vigencia) VALUES
('UF_TOPE_IMPONIBLE', 87.80, 'Tope imponible en UF para cotizaciones previsionales', '2025-01-01'),
('INGRESO_MINIMO', 529000.00, 'Ingreso mínimo mensual', '2025-01-01'),
('TOPE_GRATIFICACION_ANUAL', 2512750.00, 'Tope anual gratificación (4.75 ingresos mínimos)', '2025-01-01'),
('TOPE_GRATIFICACION_MENSUAL', 209396.00, 'Tope mensual gratificación (4.75 IM / 12)', '2025-01-01'),
('TASA_FONASA', 7.00, 'Tasa de cotización FONASA (%)', '2025-01-01'),
('HORAS_SEMANALES_JORNADA', 44, 'Jornada semanal legal en horas (44 desde abril 2024)', '2024-04-26'),
('AFC_TRABAJADOR_INDEFINIDO', 0.60, 'AFC trabajador contrato indefinido (%)', '2025-01-01'),
('AFC_EMPLEADOR_INDEFINIDO', 2.40, 'AFC empleador contrato indefinido (%)', '2025-01-01'),
('AFC_EMPLEADOR_PLAZO_FIJO', 3.00, 'AFC empleador contrato plazo fijo (%)', '2025-01-01'),
('SIS_EMPLEADOR', 1.88, 'SIS empleador (%)', '2025-01-01'),
('REFORMA_PREVISIONAL', 1.00, 'Reforma previsional empleador (%)', '2025-01-01'),
('MUTUALIDAD_BASE', 0.90, 'Tasa base mutualidad (%)', '2025-01-01')
ON CONFLICT (parametro) DO UPDATE SET 
    valor = EXCLUDED.valor,
    descripcion = EXCLUDED.descripcion,
    updated_at = CURRENT_TIMESTAMP;

-- 5. Tabla de Tramos de Impuesto Único
CREATE TABLE IF NOT EXISTS sueldo_tramos_impuesto (
    id SERIAL PRIMARY KEY,
    tramo INTEGER NOT NULL,
    desde DECIMAL(12,2) NOT NULL,
    hasta DECIMAL(12,2),
    factor DECIMAL(5,3) NOT NULL,
    rebaja DECIMAL(12,2) NOT NULL,
    activo BOOLEAN DEFAULT true,
    fecha_vigencia DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar Tramos de Impuesto 2025
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

-- 6. Tabla de Historial de Cálculos de Sueldo
CREATE TABLE IF NOT EXISTS sueldo_historial_calculos (
    id SERIAL PRIMARY KEY,
    guardia_id INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    sueldo_base DECIMAL(15,2) NOT NULL,
    sueldo_liquido DECIMAL(15,2) NOT NULL,
    costo_empresa DECIMAL(15,2) NOT NULL,
    valor_uf_utilizado DECIMAL(10,2) NOT NULL,
    fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parametros_utilizados JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guardia_id, mes, anio)
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_sueldo_afp_codigo ON sueldo_afp(codigo);
CREATE INDEX idx_sueldo_isapre_codigo ON sueldo_isapre(codigo);
CREATE INDEX idx_sueldo_mutualidad_codigo ON sueldo_mutualidad(codigo);
CREATE INDEX idx_sueldo_parametros_parametro ON sueldo_parametros_generales(parametro);
CREATE INDEX idx_sueldo_tramos_vigencia ON sueldo_tramos_impuesto(fecha_vigencia, activo);
CREATE INDEX idx_sueldo_historial_guardia ON sueldo_historial_calculos(guardia_id);
CREATE INDEX idx_sueldo_historial_fecha ON sueldo_historial_calculos(mes, anio);

-- Comentarios sobre la eliminación de la tabla sueldo_valor_uf
COMMENT ON TABLE sueldo_afp IS 'AFPs con tasas oficiales 2025. Los valores UF se obtienen en tiempo real desde la API de la CMF.';
COMMENT ON TABLE sueldo_parametros_generales IS 'Parámetros del sistema de sueldos. Los valores UF se obtienen en tiempo real desde la API de la CMF.';
