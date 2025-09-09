-- Script para crear tabla turnos_extras según documentación
-- Ejecutar en base de datos GardOps

CREATE TABLE IF NOT EXISTS turnos_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guardia_id UUID NOT NULL REFERENCES guardias(id),
    instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
    puesto_id UUID NOT NULL REFERENCES as_turnos_puestos_operativos(id),
    pauta_id UUID NOT NULL REFERENCES as_turnos_pauta_mensual(id),
    fecha DATE NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('reemplazo', 'ppc')),
    valor DECIMAL(10,2) NOT NULL DEFAULT 0,
    pagado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_pago DATE NULL,
    observaciones_pago TEXT NULL,
    usuario_pago VARCHAR(255) NULL,
    tenant_id UUID NOT NULL DEFAULT 'accebf8a-bacc-41fa-9601-ed39cb320a52',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_turnos_extras_guardia_id ON turnos_extras(guardia_id);
CREATE INDEX IF NOT EXISTS idx_turnos_extras_instalacion_id ON turnos_extras(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_turnos_extras_fecha ON turnos_extras(fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_extras_estado ON turnos_extras(estado);
CREATE INDEX IF NOT EXISTS idx_turnos_extras_pagado ON turnos_extras(pagado);
CREATE INDEX IF NOT EXISTS idx_turnos_extras_tenant_id ON turnos_extras(tenant_id);

-- Índice compuesto para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_turnos_extras_guardia_fecha ON turnos_extras(guardia_id, fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_extras_instalacion_fecha ON turnos_extras(instalacion_id, fecha);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_turnos_extras_updated_at 
    BEFORE UPDATE ON turnos_extras 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE turnos_extras IS 'Registro de turnos extras (reemplazos y PPC)';
COMMENT ON COLUMN turnos_extras.estado IS 'Estado del turno: reemplazo o ppc';
COMMENT ON COLUMN turnos_extras.valor IS 'Valor calculado desde valor_turno_extra de la instalación';
COMMENT ON COLUMN turnos_extras.pagado IS 'Indica si el turno extra ha sido pagado';
COMMENT ON COLUMN turnos_extras.observaciones_pago IS 'Comentarios sobre el pago realizado';
COMMENT ON COLUMN turnos_extras.usuario_pago IS 'Usuario que realizó el pago'; 