-- Crear tabla de logs para instalaciones
CREATE TABLE IF NOT EXISTS logs_instalaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instalacion_id UUID NOT NULL,
    accion TEXT NOT NULL,
    usuario TEXT NOT NULL DEFAULT 'Admin',
    tipo TEXT NOT NULL DEFAULT 'manual',
    contexto TEXT,
    fecha TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    -- Índices para mejorar performance
    CONSTRAINT fk_logs_instalaciones_instalacion 
        FOREIGN KEY (instalacion_id) 
        REFERENCES instalaciones(id) 
        ON DELETE CASCADE
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_logs_instalaciones_instalacion_id ON logs_instalaciones(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_logs_instalaciones_fecha ON logs_instalaciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_logs_instalaciones_tipo ON logs_instalaciones(tipo);

-- Insertar algunos logs de ejemplo para la instalación existente
INSERT INTO logs_instalaciones (instalacion_id, accion, usuario, tipo, contexto, fecha) VALUES
('fb0d4f19-75f3-457e-8181-df032266441c', 'Instalación creada', 'Admin', 'sistema', 'Creación inicial de la instalación', NOW() - INTERVAL '2 days'),
('fb0d4f19-75f3-457e-8181-df032266441c', 'Datos actualizados', 'Admin', 'manual', 'Actualización de información básica', NOW() - INTERVAL '1 day'),
('fb0d4f19-75f3-457e-8181-df032266441c', 'Ubicación modificada', 'Admin', 'manual', 'Cambio de coordenadas GPS', NOW() - INTERVAL '12 hours'),
('fb0d4f19-75f3-457e-8181-df032266441c', 'Estado cambiado a Activo', 'Admin', 'manual', 'Activación de la instalación', NOW() - INTERVAL '6 hours');

-- Verificar que se creó correctamente
SELECT 
    'logs_instalaciones' as tabla,
    COUNT(*) as total_registros,
    MIN(fecha) as fecha_mas_antigua,
    MAX(fecha) as fecha_mas_reciente
FROM logs_instalaciones; 