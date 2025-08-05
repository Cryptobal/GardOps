-- Script para actualizar tabla turnos_extras con campos de pago
-- Ejecutar este script para agregar los campos necesarios para el control de pagos

-- 1. Agregar campo pagado (boolean con default false)
ALTER TABLE turnos_extras 
ADD COLUMN IF NOT EXISTS pagado BOOLEAN DEFAULT FALSE;

-- 2. Agregar campo fecha_pago (fecha cuando se realizó el pago)
ALTER TABLE turnos_extras 
ADD COLUMN IF NOT EXISTS fecha_pago DATE;

-- 3. Agregar campo observaciones_pago (notas sobre el pago)
ALTER TABLE turnos_extras 
ADD COLUMN IF NOT EXISTS observaciones_pago TEXT;

-- 4. Agregar campo usuario_pago (quien marcó como pagado)
ALTER TABLE turnos_extras 
ADD COLUMN IF NOT EXISTS usuario_pago VARCHAR(255);

-- 5. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_turnos_extras_pagado 
ON turnos_extras(pagado);

CREATE INDEX IF NOT EXISTS idx_turnos_extras_fecha_pago 
ON turnos_extras(fecha_pago);

CREATE INDEX IF NOT EXISTS idx_turnos_extras_fecha_pagado 
ON turnos_extras(fecha, pagado);

-- 6. Comentarios para documentar los campos
COMMENT ON COLUMN turnos_extras.pagado IS 'Indica si el turno extra ha sido pagado';
COMMENT ON COLUMN turnos_extras.fecha_pago IS 'Fecha en que se realizó el pago del turno extra';
COMMENT ON COLUMN turnos_extras.observaciones_pago IS 'Observaciones o notas sobre el pago';
COMMENT ON COLUMN turnos_extras.usuario_pago IS 'Usuario que marcó el turno extra como pagado';

-- Verificar la estructura actualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'turnos_extras'
ORDER BY ordinal_position;