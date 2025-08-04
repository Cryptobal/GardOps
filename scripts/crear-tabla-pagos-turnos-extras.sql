-- Crear tabla para registrar pagos de turnos extras
CREATE TABLE IF NOT EXISTS pagos_turnos_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardia_id UUID NOT NULL REFERENCES guardias(id),
  instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
  puesto_id UUID NOT NULL REFERENCES as_turnos_puestos_operativos(id),
  pauta_id INTEGER NOT NULL REFERENCES as_turnos_pauta_mensual(id),
  fecha DATE NOT NULL,
  estado TEXT CHECK (estado IN ('reemplazo', 'ppc')),
  valor NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 