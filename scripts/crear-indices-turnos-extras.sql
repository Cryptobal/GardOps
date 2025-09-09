-- Crear índices para optimizar consultas en turnos_extras
CREATE INDEX IF NOT EXISTS idx_turnos_extras_guardia_id ON turnos_extras(guardia_id);
CREATE INDEX IF NOT EXISTS idx_turnos_extras_instalacion_id ON turnos_extras(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_turnos_extras_fecha ON turnos_extras(fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_extras_estado ON turnos_extras(estado);
CREATE INDEX IF NOT EXISTS idx_turnos_extras_puesto_id ON turnos_extras(puesto_id);
CREATE INDEX IF NOT EXISTS idx_turnos_extras_pauta_id ON turnos_extras(pauta_id); 