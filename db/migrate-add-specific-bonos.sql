-- Migración para agregar campos específicos de bonos
-- Fecha: 2024-08-26
-- Descripción: Agregar campos específicos para cada tipo de bono en estructuras de servicio y guardia

-- =====================================================
-- PASO 1: AGREGAR CAMPOS ESPECÍFICOS A ESTRUCTURAS DE SERVICIO
-- =====================================================

-- Agregar campos específicos para cada bono
ALTER TABLE sueldo_estructuras_servicio 
ADD COLUMN IF NOT EXISTS bono_movilizacion NUMERIC(12,2) DEFAULT 0;

ALTER TABLE sueldo_estructuras_servicio 
ADD COLUMN IF NOT EXISTS bono_colacion NUMERIC(12,2) DEFAULT 0;

ALTER TABLE sueldo_estructuras_servicio 
ADD COLUMN IF NOT EXISTS bono_responsabilidad NUMERIC(12,2) DEFAULT 0;

-- Agregar comentarios
COMMENT ON COLUMN sueldo_estructuras_servicio.bono_movilizacion IS 'Monto específico del bono de movilización';
COMMENT ON COLUMN sueldo_estructuras_servicio.bono_colacion IS 'Monto específico del bono de colación';
COMMENT ON COLUMN sueldo_estructuras_servicio.bono_responsabilidad IS 'Monto específico del bono de responsabilidad';

-- =====================================================
-- PASO 2: AGREGAR CAMPOS ESPECÍFICOS A ESTRUCTURAS DE GUARDIA
-- =====================================================

-- Agregar campos específicos para cada bono en la tabla de items
ALTER TABLE sueldo_estructura_guardia_item 
ADD COLUMN IF NOT EXISTS bono_movilizacion NUMERIC(12,2) DEFAULT 0;

ALTER TABLE sueldo_estructura_guardia_item 
ADD COLUMN IF NOT EXISTS bono_colacion NUMERIC(12,2) DEFAULT 0;

ALTER TABLE sueldo_estructura_guardia_item 
ADD COLUMN IF NOT EXISTS bono_responsabilidad NUMERIC(12,2) DEFAULT 0;

-- Agregar comentarios
COMMENT ON COLUMN sueldo_estructura_guardia_item.bono_movilizacion IS 'Monto específico del bono de movilización';
COMMENT ON COLUMN sueldo_estructura_guardia_item.bono_colacion IS 'Monto específico del bono de colación';
COMMENT ON COLUMN sueldo_estructura_guardia_item.bono_responsabilidad IS 'Monto específico del bono de responsabilidad';

-- =====================================================
-- PASO 3: CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS
-- =====================================================

-- Índices para estructuras de servicio
CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_bono_movilizacion 
ON sueldo_estructuras_servicio(bono_movilizacion) WHERE bono_movilizacion > 0;

CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_bono_colacion 
ON sueldo_estructuras_servicio(bono_colacion) WHERE bono_colacion > 0;

CREATE INDEX IF NOT EXISTS idx_sueldo_estructuras_bono_responsabilidad 
ON sueldo_estructuras_servicio(bono_responsabilidad) WHERE bono_responsabilidad > 0;

-- Índices para estructuras de guardia
CREATE INDEX IF NOT EXISTS idx_guardia_item_bono_movilizacion 
ON sueldo_estructura_guardia_item(bono_movilizacion) WHERE bono_movilizacion > 0;

CREATE INDEX IF NOT EXISTS idx_guardia_item_bono_colacion 
ON sueldo_estructura_guardia_item(bono_colacion) WHERE bono_colacion > 0;

CREATE INDEX IF NOT EXISTS idx_guardia_item_bono_responsabilidad 
ON sueldo_estructura_guardia_item(bono_responsabilidad) WHERE bono_responsabilidad > 0;

-- =====================================================
-- PASO 4: VERIFICAR MIGRACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE '📊 Campos agregados a sueldo_estructuras_servicio: bono_movilizacion, bono_colacion, bono_responsabilidad';
    RAISE NOTICE '📊 Campos agregados a sueldo_estructura_guardia_item: bono_movilizacion, bono_colacion, bono_responsabilidad';
    RAISE NOTICE '📊 Índices creados para optimizar consultas de bonos';
END $$;

