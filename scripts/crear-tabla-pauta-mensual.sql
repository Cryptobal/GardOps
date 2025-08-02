-- Crear tabla para almacenar la pauta mensual de turnos
CREATE TABLE IF NOT EXISTS as_turnos_pauta_mensual (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instalacion_id TEXT NOT NULL,
    guardia_id TEXT NOT NULL,
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    dia INTEGER NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('trabajado', 'libre', 'permiso')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para optimizar consultas
    INDEX idx_instalacion_anio_mes (instalacion_id, anio, mes),
    INDEX idx_guardia (guardia_id),
    INDEX idx_fecha (anio, mes, dia),
    
    -- Restricción única para evitar duplicados
    UNIQUE(instalacion_id, guardia_id, anio, mes, dia)
);

-- Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_as_turnos_pauta_mensual_updated_at
    AFTER UPDATE ON as_turnos_pauta_mensual
    FOR EACH ROW
BEGIN
    UPDATE as_turnos_pauta_mensual 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END; 