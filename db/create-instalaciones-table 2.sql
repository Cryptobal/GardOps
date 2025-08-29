-- Crear tabla para instalaciones
CREATE TABLE IF NOT EXISTS instalaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    direccion TEXT,
    cliente_id UUID,
    estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'inactiva')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    tenant_id TEXT
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_instalaciones_cliente ON instalaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_estado ON instalaciones(estado);
CREATE INDEX IF NOT EXISTS idx_instalaciones_tenant ON instalaciones(tenant_id);

-- Insertar datos de prueba
INSERT INTO instalaciones (id, nombre, direccion, tenant_id) VALUES 
('7e05a55d-8db6-4c20-b51c-509f09d69f74', 'Instalación de Prueba', 'Dirección de Prueba 123', 'accebf8a-bacc-41fa-9601-ed39cb320a52')
ON CONFLICT (id) DO NOTHING;

-- Insertar puestos operativos de prueba
INSERT INTO as_turnos_puestos_operativos (id, nombre_puesto, instalacion_id, tenant_id) VALUES 
(gen_random_uuid(), 'Puesto 1', '7e05a55d-8db6-4c20-b51c-509f09d69f74', 'accebf8a-bacc-41fa-9601-ed39cb320a52'),
(gen_random_uuid(), 'Puesto 2', '7e05a55d-8db6-4c20-b51c-509f09d69f74', 'accebf8a-bacc-41fa-9601-ed39cb320a52')
ON CONFLICT DO NOTHING; 