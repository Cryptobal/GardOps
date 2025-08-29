-- Crear tabla para puestos operativos
CREATE TABLE IF NOT EXISTS as_turnos_puestos_operativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_puesto TEXT NOT NULL,
    instalacion_id UUID NOT NULL,
    rol_servicio_id UUID,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    tenant_id TEXT
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_puestos_operativos_instalacion ON as_turnos_puestos_operativos(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_puestos_operativos_rol ON as_turnos_puestos_operativos(rol_servicio_id);
CREATE INDEX IF NOT EXISTS idx_puestos_operativos_estado ON as_turnos_puestos_operativos(estado);
CREATE INDEX IF NOT EXISTS idx_puestos_operativos_tenant ON as_turnos_puestos_operativos(tenant_id); 