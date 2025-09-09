-- Crear tabla para pauta mensual
CREATE TABLE IF NOT EXISTS as_turnos_pauta_mensual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puesto_id UUID NOT NULL,
    guardia_id UUID,
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    dia INTEGER NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('trabajado', 'libre', 'permiso', 'licencia')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    tenant_id TEXT
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_pauta_mensual_puesto ON as_turnos_pauta_mensual(puesto_id);
CREATE INDEX IF NOT EXISTS idx_pauta_mensual_guardia ON as_turnos_pauta_mensual(guardia_id);
CREATE INDEX IF NOT EXISTS idx_pauta_mensual_fecha ON as_turnos_pauta_mensual(anio, mes, dia);
CREATE INDEX IF NOT EXISTS idx_pauta_mensual_estado ON as_turnos_pauta_mensual(estado);
CREATE INDEX IF NOT EXISTS idx_pauta_mensual_tenant ON as_turnos_pauta_mensual(tenant_id);

-- Crear índice único para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_pauta_mensual_unique 
ON as_turnos_pauta_mensual(puesto_id, anio, mes, dia); 