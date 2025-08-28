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
('HORAS_SEMANALES_JORNADA', 42, 'Jornada semanal legal en horas (42 desde abril 2026)', '2026-04-26'),
('HORAS_SEMANALES_JORNADA', 40, 'Jornada semanal legal en horas (40 desde abril 2028)', '2028-04-26')
ON CONFLICT (parametro) DO UPDATE SET 
    valor = EXCLUDED.valor,
    fecha_vigencia = EXCLUDED.fecha_vigencia,
    updated_at = CURRENT_TIMESTAMP;

-- 5. Tabla de Tramos de Impuesto Único
CREATE TABLE IF NOT EXISTS sueldo_tramos_impuesto (
    id SERIAL PRIMARY KEY,
    tramo INTEGER NOT NULL,
    desde DECIMAL(15,2) NOT NULL,
    hasta DECIMAL(15,2), -- NULL para el último tramo
    factor DECIMAL(5,4) NOT NULL, -- Factor de impuesto (0.04 = 4%)
    rebaja DECIMAL(15,2) NOT NULL,
    fecha_vigencia DATE NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tramo, fecha_vigencia)
);

-- Insertar Tramos de Impuesto Único 2025
INSERT INTO sueldo_tramos_impuesto (tramo, desde, hasta, factor, rebaja, fecha_vigencia) VALUES
(1, 0, 1500000, 0.0000, 0, '2025-01-01'),
(2, 1500000, 2500000, 0.0400, 60000, '2025-01-01'),
(3, 2500000, 3500000, 0.0800, 160000, '2025-01-01'),
(4, 3500000, 4500000, 0.1350, 327500, '2025-01-01'),
(5, 4500000, 5500000, 0.2300, 765000, '2025-01-01'),
(6, 5500000, 7500000, 0.3040, 1156500, '2025-01-01'),
(7, 7500000, 10000000, 0.3500, 1656500, '2025-01-01'),
(8, 10000000, NULL, 0.4000, 2156500, '2025-01-01')
ON CONFLICT (tramo, fecha_vigencia) DO UPDATE SET 
    desde = EXCLUDED.desde,
    hasta = EXCLUDED.hasta,
    factor = EXCLUDED.factor,
    rebaja = EXCLUDED.rebaja,
    updated_at = CURRENT_TIMESTAMP;

-- 6. Tabla de Valores UF
CREATE TABLE IF NOT EXISTS sueldo_valor_uf (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    valor DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar algunos valores UF de ejemplo (actualizar con valores reales)
INSERT INTO sueldo_valor_uf (fecha, valor) VALUES
('2025-01-01', 38000.00),
('2025-02-01', 38100.00),
('2025-03-01', 38200.00),
('2025-04-01', 38300.00),
('2025-05-01', 38400.00),
('2025-06-01', 38500.00),
('2025-07-01', 38600.00),
('2025-08-01', 38700.00),
('2025-09-01', 38800.00),
('2025-10-01', 38900.00),
('2025-11-01', 39000.00),
('2025-12-01', 39100.00)
ON CONFLICT (fecha) DO UPDATE SET 
    valor = EXCLUDED.valor,
    updated_at = CURRENT_TIMESTAMP;

-- 7. Tabla de Historial de Cálculos de Sueldo
CREATE TABLE IF NOT EXISTS sueldo_historial_calculos (
    id SERIAL PRIMARY KEY,
    guardia_id INTEGER,
    fecha_calculo DATE NOT NULL,
    mes_periodo INTEGER NOT NULL,
    anio_periodo INTEGER NOT NULL,
    
    -- Datos de entrada
    sueldo_base DECIMAL(15,2) NOT NULL,
    afp_codigo VARCHAR(50),
    isapre_codigo VARCHAR(50),
    mutualidad_codigo VARCHAR(50),
    tipo_contrato VARCHAR(50),
    
    -- Imponible
    gratificacion_legal DECIMAL(15,2),
    horas_extras DECIMAL(15,2),
    comisiones DECIMAL(15,2),
    bonos DECIMAL(15,2),
    total_imponible DECIMAL(15,2),
    
    -- No Imponible
    colacion DECIMAL(15,2),
    movilizacion DECIMAL(15,2),
    viatico DECIMAL(15,2),
    desgaste DECIMAL(15,2),
    asignacion_familiar DECIMAL(15,2),
    total_no_imponible DECIMAL(15,2),
    
    -- Cotizaciones
    cotizacion_afp DECIMAL(15,2),
    cotizacion_salud DECIMAL(15,2),
    cotizacion_afc DECIMAL(15,2),
    total_cotizaciones DECIMAL(15,2),
    
    -- Impuesto
    base_tributable DECIMAL(15,2),
    impuesto_unico DECIMAL(15,2),
    
    -- Descuentos
    anticipos DECIMAL(15,2),
    descuentos_judiciales DECIMAL(15,2),
    otros_descuentos DECIMAL(15,2),
    total_descuentos DECIMAL(15,2),
    
    -- Resultado
    sueldo_liquido DECIMAL(15,2),
    
    -- Costos Empleador
    empleador_sis DECIMAL(15,2),
    empleador_afc DECIMAL(15,2),
    empleador_mutual DECIMAL(15,2),
    empleador_reforma DECIMAL(15,2),
    empleador_total DECIMAL(15,2),
    
    -- Metadata
    usuario_calculo VARCHAR(100),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_sueldo_historial_guardia ON sueldo_historial_calculos(guardia_id);
CREATE INDEX idx_sueldo_historial_periodo ON sueldo_historial_calculos(anio_periodo, mes_periodo);
CREATE INDEX idx_sueldo_historial_fecha ON sueldo_historial_calculos(fecha_calculo);

-- Crear índices para las otras tablas
CREATE INDEX idx_sueldo_afp_codigo ON sueldo_afp(codigo);
CREATE INDEX idx_sueldo_isapre_codigo ON sueldo_isapre(codigo);
CREATE INDEX idx_sueldo_mutualidad_codigo ON sueldo_mutualidad(codigo);
CREATE INDEX idx_sueldo_parametros_parametro ON sueldo_parametros_generales(parametro);
CREATE INDEX idx_sueldo_tramos_vigencia ON sueldo_tramos_impuesto(fecha_vigencia, activo);
CREATE INDEX idx_sueldo_uf_fecha ON sueldo_valor_uf(fecha);

-- Función para obtener el valor UF de una fecha
CREATE OR REPLACE FUNCTION obtener_valor_uf(fecha_consulta DATE)
RETURNS DECIMAL AS $$
DECLARE
    valor_uf DECIMAL;
BEGIN
    -- Buscar el valor UF para el primer día del mes
    SELECT valor INTO valor_uf
    FROM sueldo_valor_uf
    WHERE fecha = DATE_TRUNC('month', fecha_consulta)
    LIMIT 1;
    
    -- Si no encuentra, buscar el valor más cercano anterior
    IF valor_uf IS NULL THEN
        SELECT valor INTO valor_uf
        FROM sueldo_valor_uf
        WHERE fecha <= fecha_consulta
        ORDER BY fecha DESC
        LIMIT 1;
    END IF;
    
    -- Si aún no encuentra, usar un valor por defecto
    IF valor_uf IS NULL THEN
        valor_uf := 38000.00; -- Valor por defecto
    END IF;
    
    RETURN valor_uf;
END;
$$ LANGUAGE plpgsql;
