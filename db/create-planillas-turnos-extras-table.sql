-- Crear tabla para planillas de turnos extras
CREATE TABLE IF NOT EXISTS planillas_turnos_extras (
    id SERIAL PRIMARY KEY,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id),
    monto_total DECIMAL(10,2) NOT NULL,
    cantidad_turnos INTEGER NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada')),
    fecha_pago TIMESTAMP NULL,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de relación entre planillas y turnos extras
CREATE TABLE IF NOT EXISTS planilla_turno_relacion (
    id SERIAL PRIMARY KEY,
    planilla_id INTEGER REFERENCES planillas_turnos_extras(id) ON DELETE CASCADE,
    turno_extra_id INTEGER REFERENCES turnos_extras(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(planilla_id, turno_extra_id)
);

-- Agregar índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_planillas_turnos_extras_usuario ON planillas_turnos_extras(usuario_id);
CREATE INDEX IF NOT EXISTS idx_planillas_turnos_extras_estado ON planillas_turnos_extras(estado);
CREATE INDEX IF NOT EXISTS idx_planillas_turnos_extras_fecha ON planillas_turnos_extras(fecha_generacion);
CREATE INDEX IF NOT EXISTS idx_planilla_turno_relacion_planilla ON planilla_turno_relacion(planilla_id);
CREATE INDEX IF NOT EXISTS idx_planilla_turno_relacion_turno ON planilla_turno_relacion(turno_extra_id);

-- Agregar columna planilla_id a la tabla turnos_extras existente
ALTER TABLE turnos_extras ADD COLUMN IF NOT EXISTS planilla_id INTEGER REFERENCES planillas_turnos_extras(id);

-- Crear índice para la nueva columna
CREATE INDEX IF NOT EXISTS idx_turnos_extras_planilla_id ON turnos_extras(planilla_id); 