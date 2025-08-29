-- =====================================================
-- MIGRACIÓN A SISTEMA DE PARÁMETROS MENSUALES
-- Convierte las tablas actuales al nuevo sistema de versionado
-- =====================================================

-- 1. MIGRAR TABLA sueldo_parametros_generales
-- =====================================================

-- Crear tabla temporal con nueva estructura
CREATE TABLE IF NOT EXISTS sueldo_parametros_generales_new (
    id SERIAL PRIMARY KEY,
    periodo VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
    parametro VARCHAR(100) NOT NULL,
    valor DECIMAL(15,4) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(periodo, parametro)
);

-- Migrar datos existentes al período 2025-01
INSERT INTO sueldo_parametros_generales_new (periodo, parametro, valor, descripcion)
SELECT 
    '2025-01' as periodo,
    parametro,
    valor,
    CASE 
        WHEN parametro = 'UF_TOPE_IMPONIBLE' THEN 'Tope imponible en UF para cotizaciones previsionales'
        WHEN parametro = 'SUELDO_MINIMO' THEN 'Sueldo mínimo legal'
        WHEN parametro = 'GRATIFICACION_TOPE_MENSUAL' THEN 'Tope mensual para gratificación legal'
        WHEN parametro = 'HORAS_EXTRAS_MAX_MES' THEN 'Máximo de horas extras permitidas al mes'
        WHEN parametro = 'AFC_TRABAJADOR_INDEFINIDO' THEN 'Porcentaje AFC trabajador contrato indefinido'
        WHEN parametro = 'AFC_EMPLEADOR_INDEFINIDO' THEN 'Porcentaje AFC empleador contrato indefinido'
        WHEN parametro = 'AFC_EMPLEADOR_PLAZO_FIJO' THEN 'Porcentaje AFC empleador contrato plazo fijo'
        WHEN parametro = 'SIS_EMPLEADOR' THEN 'Porcentaje SIS pagado por empleador'
        WHEN parametro = 'REFORMA_PREVISIONAL' THEN 'Porcentaje reforma previsional empleador'
        WHEN parametro = 'UF_TOPE_AFC' THEN 'UF Tope AFC'
        WHEN parametro = 'HORAS_SEMANALES_JORNADA' THEN 'Jornada semanal legal en horas'
        WHEN parametro = 'TASA_REFORMA_2025' THEN 'Tasa reforma previsional 2025'
        WHEN parametro = 'TASA_SIS' THEN 'Tasa SIS'
        ELSE 'Parámetro del sistema'
    END as descripcion
FROM sueldo_parametros_generales;

-- Eliminar tabla antigua y renombrar nueva
DROP TABLE sueldo_parametros_generales;
ALTER TABLE sueldo_parametros_generales_new RENAME TO sueldo_parametros_generales;

-- 2. MIGRAR TABLA sueldo_afp
-- =====================================================

-- Crear tabla temporal con nueva estructura
CREATE TABLE IF NOT EXISTS sueldo_afp_new (
    id SERIAL PRIMARY KEY,
    periodo VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tasa DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(periodo, codigo)
);

-- Migrar datos existentes al período 2025-01 (convertir de decimal a porcentaje)
INSERT INTO sueldo_afp_new (periodo, codigo, nombre, tasa)
SELECT 
    '2025-01' as periodo,
    LOWER(REPLACE(nombre, 'AFP ', '')) as codigo,
    nombre,
    (comision + porcentaje_fondo) * 100 as tasa -- Convertir a porcentaje
FROM sueldo_afp;

-- Eliminar tabla antigua y renombrar nueva
DROP TABLE sueldo_afp;
ALTER TABLE sueldo_afp_new RENAME TO sueldo_afp;

-- 3. MIGRAR TABLA sueldo_tramos_impuesto
-- =====================================================

-- Crear tabla temporal con nueva estructura
CREATE TABLE IF NOT EXISTS sueldo_tramos_impuesto_new (
    id SERIAL PRIMARY KEY,
    periodo VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
    tramo INTEGER NOT NULL,
    desde DECIMAL(15,2) NOT NULL,
    hasta DECIMAL(15,2), -- NULL para el último tramo
    factor DECIMAL(5,4) NOT NULL,
    rebaja DECIMAL(15,2) NOT NULL,
    tasa_max DECIMAL(5,4), -- Nuevo campo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(periodo, tramo)
);

-- Migrar datos existentes al período 2025-01
INSERT INTO sueldo_tramos_impuesto_new (periodo, tramo, desde, hasta, factor, rebaja, tasa_max)
SELECT 
    '2025-01' as periodo,
    tramo,
    desde,
    hasta,
    factor,
    rebaja,
    CASE 
        WHEN tramo = 1 THEN 0.00
        WHEN tramo = 2 THEN 0.02
        WHEN tramo = 3 THEN 0.05
        WHEN tramo = 4 THEN 0.07
        WHEN tramo = 5 THEN 0.11
        WHEN tramo = 6 THEN 0.16
        WHEN tramo = 7 THEN 0.27
        WHEN tramo = 8 THEN 0.40
        ELSE 0.00
    END as tasa_max
FROM sueldo_tramos_impuesto;

-- Eliminar tabla antigua y renombrar nueva
DROP TABLE sueldo_tramos_impuesto;
ALTER TABLE sueldo_tramos_impuesto_new RENAME TO sueldo_tramos_impuesto;

-- 4. CREAR NUEVA TABLA sueldo_asignacion_familiar
-- =====================================================

CREATE TABLE IF NOT EXISTS sueldo_asignacion_familiar (
    id SERIAL PRIMARY KEY,
    periodo VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
    tramo VARCHAR(10) NOT NULL, -- A, B, C, D, etc.
    desde DECIMAL(15,2) NOT NULL,
    hasta DECIMAL(15,2), -- NULL para el último tramo
    monto DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(periodo, tramo)
);

-- Insertar datos iniciales para 2025-01
INSERT INTO sueldo_asignacion_familiar (periodo, tramo, desde, hasta, monto) VALUES
('2025-01', '-', 0, 0, 0),
('2025-01', 'A', 1, 620251, 22007),
('2025-01', 'B', 620252, 905941, 13505),
('2025-01', 'C', 905942, 1412957, 4267),
('2025-01', 'D', 1412958, NULL, 0);

-- 5. INSERTAR PARÁMETROS FALTANTES DE LA IMAGEN
-- =====================================================

-- Insertar parámetros de 2025-08 (según la imagen)
INSERT INTO sueldo_parametros_generales (periodo, parametro, valor, descripcion) VALUES
('2025-08', 'UF_ULTIMO_DIA', 39133, 'Valor UF último día del mes'),
('2025-08', 'FAC_SIS', 0.0188, 'Factor SIS (Seguro de Invalidez y Sobrevivencia)'),
('2025-08', 'FAC_SS', 0.009, 'Factor SS (Seguro Social)'),
('2025-08', 'FAC_AFP_EMP', 0.001, 'Factor AFP Empleador'),
('2025-08', 'FAC_RENT_PROT', 0.009, 'Factor Renta Protegida'),
('2025-08', 'UF_TOPE_AFP', 87.8, 'UF Tope AFP'),
('2025-08', 'UF_TOPE_AFC', 131.9, 'UF Tope AFC'),
('2025-08', 'UF_TOPE_INP', 60, 'UF Tope INP'),
('2025-08', 'UF_TOPE_APV_MENSUAL', 50, 'UF Tope APV Mensual'),
('2025-08', 'UF_TOPE_APV_ANUAL', 600, 'UF Tope APV Anual'),
('2025-08', 'MIN_IMPO', 529000, 'Mínimo imponible general'),
('2025-08', 'MIN_IMPO_18_65', 394622, 'Mínimo imponible -18 +65 años'),
('2025-08', 'MIN_IMPO_TRAB_CASA_PART', 529000, 'Mínimo imponible trabajador casa particular'),
('2025-08', 'AFC_EMP_INDEF', 0.024, 'AFC Empleador Indefinido'),
('2025-08', 'AFC_EMP_FIJO', 0.03, 'AFC Empleador Fijo'),
('2025-08', 'AFC_EMPL_INDEF', 0.006, 'AFC Empleado Indefinido'),
('2025-08', 'AFC_EMPL_FIJO', 0, 'AFC Empleado Fijo'),
('2025-08', 'UTM', 68647, 'Unidad Tributaria Mensual')
ON CONFLICT (periodo, parametro) DO UPDATE SET 
    valor = EXCLUDED.valor,
    updated_at = CURRENT_TIMESTAMP;

-- 6. INSERTAR AFPs ACTUALIZADAS DE 2025-08
-- =====================================================

INSERT INTO sueldo_afp (periodo, codigo, nombre, tasa) VALUES
('2025-08', 'HABITAT', 'AFP Habitat', 11.27),
('2025-08', 'PROVIDA', 'AFP ProVida', 11.45),
('2025-08', 'PLANVITAL', 'AFP PlanVital', 11.16),
('2025-08', 'CUPRUM', 'AFP Cuprum', 11.44),
('2025-08', 'EMPART', 'AFP Empart', 21.84),
('2025-08', 'INP_SSS', 'INP SSS', 18.84),
('2025-08', 'CAPITAL', 'AFP Capital', 11.44),
('2025-08', 'MODELO', 'AFP Modelo', 10.58),
('2025-08', 'UNO', 'AFP Uno', 10.49),
('2025-08', 'CADDEMED', 'AFP Caddemed', 20.2)
ON CONFLICT (periodo, codigo) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    tasa = EXCLUDED.tasa,
    updated_at = CURRENT_TIMESTAMP;

-- 7. INSERTAR TRAMOS DE IMPUESTO ACTUALIZADOS DE 2025-08
-- =====================================================

INSERT INTO sueldo_tramos_impuesto (periodo, tramo, desde, hasta, factor, rebaja, tasa_max) VALUES
('2025-08', 1, 0, 926735, 0.0000, 0, 0),
('2025-08', 2, 926735, 2059410, 0.0400, 37069.38, 0.02),
('2025-08', 3, 2059410, 3432350, 0.0800, 119445.78, 0.05),
('2025-08', 4, 3432350, 4805290, 0.1350, 308225.03, 0.07),
('2025-08', 5, 4805290, 6178230, 0.2300, 764727.58, 0.11),
('2025-08', 6, 6178230, 8237640, 0.3040, 1221916.6, 0.16),
('2025-08', 7, 8237640, 21280570, 0.3500, 1600848.04, 0.27)
ON CONFLICT (periodo, tramo) DO UPDATE SET 
    desde = EXCLUDED.desde,
    hasta = EXCLUDED.hasta,
    factor = EXCLUDED.factor,
    rebaja = EXCLUDED.rebaja,
    tasa_max = EXCLUDED.tasa_max,
    updated_at = CURRENT_TIMESTAMP;

-- 8. INSERTAR ASIGNACIÓN FAMILIAR DE 2025-08
-- =====================================================

INSERT INTO sueldo_asignacion_familiar (periodo, tramo, desde, hasta, monto) VALUES
('2025-08', '-', 0, 0, 0),
('2025-08', 'A', 1, 620251, 22007),
('2025-08', 'B', 620252, 905941, 13505),
('2025-08', 'C', 905942, 1412957, 4267),
('2025-08', 'D', 1412958, NULL, 0)
ON CONFLICT (periodo, tramo) DO UPDATE SET 
    desde = EXCLUDED.desde,
    hasta = EXCLUDED.hasta,
    monto = EXCLUDED.monto,
    updated_at = CURRENT_TIMESTAMP;

-- 9. CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================

CREATE INDEX idx_parametros_periodo ON sueldo_parametros_generales(periodo);
CREATE INDEX idx_afp_periodo ON sueldo_afp(periodo);
CREATE INDEX idx_tramos_periodo ON sueldo_tramos_impuesto(periodo);
CREATE INDEX idx_asignacion_periodo ON sueldo_asignacion_familiar(periodo);

-- 10. CREAR FUNCIONES AUTOMÁTICAS
-- =====================================================

-- Función para obtener parámetros del último mes disponible
CREATE OR REPLACE FUNCTION obtener_parametros_mensuales(fecha_consulta DATE)
RETURNS TABLE (
    parametro VARCHAR(100),
    valor DECIMAL(15,4),
    descripcion TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT pm.parametro, pm.valor, pm.descripcion
    FROM sueldo_parametros_generales pm
    WHERE pm.periodo = (
        SELECT MAX(periodo) 
        FROM sueldo_parametros_generales 
        WHERE periodo <= TO_CHAR(fecha_consulta, 'YYYY-MM')
    );
END;
$$ LANGUAGE plpgsql;

-- Función para obtener asignación familiar del último mes disponible
CREATE OR REPLACE FUNCTION obtener_asignacion_familiar(fecha_consulta DATE)
RETURNS TABLE (
    tramo VARCHAR(10),
    desde DECIMAL(15,2),
    hasta DECIMAL(15,2),
    monto DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT af.tramo, af.desde, af.hasta, af.monto
    FROM sueldo_asignacion_familiar af
    WHERE af.periodo = (
        SELECT MAX(periodo) 
        FROM sueldo_asignacion_familiar 
        WHERE periodo <= TO_CHAR(fecha_consulta, 'YYYY-MM')
    )
    ORDER BY af.desde;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener AFPs del último mes disponible
CREATE OR REPLACE FUNCTION obtener_afps_mensuales(fecha_consulta DATE)
RETURNS TABLE (
    codigo VARCHAR(50),
    nombre VARCHAR(100),
    tasa DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT am.codigo, am.nombre, am.tasa
    FROM sueldo_afp am
    WHERE am.periodo = (
        SELECT MAX(periodo) 
        FROM sueldo_afp 
        WHERE periodo <= TO_CHAR(fecha_consulta, 'YYYY-MM')
    )
    ORDER BY am.codigo;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener tramos de impuesto del último mes disponible
CREATE OR REPLACE FUNCTION obtener_tramos_impuesto(fecha_consulta DATE)
RETURNS TABLE (
    tramo INTEGER,
    desde DECIMAL(15,2),
    hasta DECIMAL(15,2),
    factor DECIMAL(5,4),
    rebaja DECIMAL(15,2),
    tasa_max DECIMAL(5,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT tim.tramo, tim.desde, tim.hasta, tim.factor, tim.rebaja, tim.tasa_max
    FROM sueldo_tramos_impuesto tim
    WHERE tim.periodo = (
        SELECT MAX(periodo) 
        FROM sueldo_tramos_impuesto 
        WHERE periodo <= TO_CHAR(fecha_consulta, 'YYYY-MM')
    )
    ORDER BY tim.tramo;
END;
$$ LANGUAGE plpgsql;

-- Función para copiar parámetros de un mes a otro
CREATE OR REPLACE FUNCTION copiar_parametros_mes(periodo_origen VARCHAR(7), periodo_destino VARCHAR(7))
RETURNS VOID AS $$
BEGIN
    -- Copiar parámetros generales
    INSERT INTO sueldo_parametros_generales (periodo, parametro, valor, descripcion)
    SELECT periodo_destino, parametro, valor, descripcion
    FROM sueldo_parametros_generales
    WHERE periodo = periodo_origen
    ON CONFLICT (periodo, parametro) DO UPDATE SET 
        valor = EXCLUDED.valor,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Copiar AFPs
    INSERT INTO sueldo_afp (periodo, codigo, nombre, tasa)
    SELECT periodo_destino, codigo, nombre, tasa
    FROM sueldo_afp
    WHERE periodo = periodo_origen
    ON CONFLICT (periodo, codigo) DO UPDATE SET 
        nombre = EXCLUDED.nombre,
        tasa = EXCLUDED.tasa,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Copiar tramos de impuesto
    INSERT INTO sueldo_tramos_impuesto (periodo, tramo, desde, hasta, factor, rebaja, tasa_max)
    SELECT periodo_destino, tramo, desde, hasta, factor, rebaja, tasa_max
    FROM sueldo_tramos_impuesto
    WHERE periodo = periodo_origen
    ON CONFLICT (periodo, tramo) DO UPDATE SET 
        desde = EXCLUDED.desde,
        hasta = EXCLUDED.hasta,
        factor = EXCLUDED.factor,
        rebaja = EXCLUDED.rebaja,
        tasa_max = EXCLUDED.tasa_max,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Copiar asignación familiar
    INSERT INTO sueldo_asignacion_familiar (periodo, tramo, desde, hasta, monto)
    SELECT periodo_destino, tramo, desde, hasta, monto
    FROM sueldo_asignacion_familiar
    WHERE periodo = periodo_origen
    ON CONFLICT (periodo, tramo) DO UPDATE SET 
        desde = EXCLUDED.desde,
        hasta = EXCLUDED.hasta,
        monto = EXCLUDED.monto,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
