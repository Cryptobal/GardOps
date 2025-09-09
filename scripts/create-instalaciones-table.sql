-- Crear tabla instalaciones
CREATE TABLE IF NOT EXISTS instalaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  direccion TEXT NOT NULL,
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  ciudad VARCHAR(100),
  comuna VARCHAR(100),
  valor_turno_extra DECIMAL(10, 2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_instalaciones_cliente_id ON instalaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_estado ON instalaciones(estado);
CREATE INDEX IF NOT EXISTS idx_instalaciones_ciudad ON instalaciones(ciudad);
CREATE INDEX IF NOT EXISTS idx_instalaciones_comuna ON instalaciones(comuna);

-- Insertar algunos datos de ejemplo
INSERT INTO instalaciones (nombre, cliente_id, direccion, latitud, longitud, ciudad, comuna, valor_turno_extra, estado) VALUES
('Sede Principal GARD', (SELECT id FROM clientes LIMIT 1), 'Av. Libertador Bernardo O''Higgins 1234, Santiago', -33.4489, -70.6693, 'Santiago', 'Santiago', 50000, 'Activo'),
('Oficina Regional Valparaíso', (SELECT id FROM clientes LIMIT 1), 'Calle Prat 567, Valparaíso', -33.0472, -71.6127, 'Valparaíso', 'Valparaíso', 45000, 'Activo')
ON CONFLICT DO NOTHING;

SELECT 'Tabla instalaciones creada exitosamente' as resultado; 