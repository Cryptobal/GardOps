-- =====================================================
-- CREACIÓN DE TABLAS PARA LÓGICA DE ASIGNACIÓN DE PPCs
-- =====================================================

-- Crear tabla puestos_por_cubrir (PPCs)
CREATE TABLE IF NOT EXISTS puestos_por_cubrir (
    id SERIAL PRIMARY KEY,
    requisito_puesto_id INTEGER NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    observaciones TEXT,
    cantidad_faltante INTEGER DEFAULT 1,
    prioridad VARCHAR(50) DEFAULT 'Normal',
    fecha_deteccion TIMESTAMP DEFAULT NOW(),
    fecha_limite_cobertura DATE,
    estado VARCHAR(50) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Asignado', 'Cancelado', 'Completado')),
    guardia_asignado_id UUID REFERENCES guardias(id),
    fecha_asignacion TIMESTAMP,
    fecha_cierre TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    tenant_id UUID
);

-- Crear tabla asignaciones_guardias (historial de asignaciones)
CREATE TABLE IF NOT EXISTS asignaciones_guardias (
    id SERIAL PRIMARY KEY,
    guardia_id UUID NOT NULL REFERENCES guardias(id),
    requisito_puesto_id INTEGER NOT NULL,
    ppc_id INTEGER REFERENCES puestos_por_cubrir(id),
    tipo_asignacion VARCHAR(50) DEFAULT 'PPC' CHECK (tipo_asignacion IN ('PPC', 'Reasignación', 'Turno Regular')),
    fecha_inicio DATE NOT NULL,
    fecha_termino DATE,
    estado VARCHAR(50) DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Finalizada', 'Cancelada')),
    motivo_termino VARCHAR(255),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    tenant_id UUID
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_ppc_estado ON puestos_por_cubrir(estado);
CREATE INDEX IF NOT EXISTS idx_ppc_guardia_asignado ON puestos_por_cubrir(guardia_asignado_id);
CREATE INDEX IF NOT EXISTS idx_ppc_requisito ON puestos_por_cubrir(requisito_puesto_id);
CREATE INDEX IF NOT EXISTS idx_ppc_fecha_asignacion ON puestos_por_cubrir(fecha_asignacion);

CREATE INDEX IF NOT EXISTS idx_asignaciones_guardia ON asignaciones_guardias(guardia_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_estado ON asignaciones_guardias(estado);
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha_inicio ON asignaciones_guardias(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha_termino ON asignaciones_guardias(fecha_termino);
CREATE INDEX IF NOT EXISTS idx_asignaciones_requisito ON asignaciones_guardias(requisito_puesto_id);

-- Crear constraint para evitar asignaciones activas duplicadas
ALTER TABLE asignaciones_guardias 
ADD CONSTRAINT unique_active_assignment 
EXCLUDE USING btree (guardia_id WITH =) 
WHERE (estado = 'Activa' AND fecha_termino IS NULL);

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ppc_updated_at 
    BEFORE UPDATE ON puestos_por_cubrir 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asignaciones_updated_at 
    BEFORE UPDATE ON asignaciones_guardias 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar datos de ejemplo para testing
INSERT INTO puestos_por_cubrir (
    requisito_puesto_id, 
    motivo, 
    observaciones, 
    estado,
    tenant_id
) VALUES 
(1, 'Licencia médica', 'Guardia con licencia hasta 15/08', 'Pendiente', (SELECT id FROM tenants LIMIT 1)),
(1, 'Falta aviso', 'Guardia no se presentó', 'Pendiente', (SELECT id FROM tenants LIMIT 1))
ON CONFLICT DO NOTHING;

-- Verificar que las tablas se crearon correctamente
SELECT 
    'puestos_por_cubrir' as tabla,
    COUNT(*) as registros
FROM puestos_por_cubrir
UNION ALL
SELECT 
    'asignaciones_guardias' as tabla,
    COUNT(*) as registros
FROM asignaciones_guardias;

-- Mostrar estructura de las tablas creadas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('puestos_por_cubrir', 'asignaciones_guardias')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position; 