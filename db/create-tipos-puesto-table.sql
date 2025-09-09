-- Crear tabla para catálogo de tipos de puesto
CREATE TABLE IF NOT EXISTS cat_tipos_puesto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    emoji VARCHAR(10) DEFAULT '📍',
    color VARCHAR(20) DEFAULT 'gray',
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- Constraint único por nombre y tenant para evitar duplicados
    CONSTRAINT unique_tipo_puesto_tenant UNIQUE(nombre, tenant_id)
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_tipos_puesto_activo ON cat_tipos_puesto(activo);
CREATE INDEX IF NOT EXISTS idx_tipos_puesto_tenant ON cat_tipos_puesto(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tipos_puesto_orden ON cat_tipos_puesto(orden);

-- Agregar columna tipo_puesto_id a la tabla de puestos operativos
ALTER TABLE as_turnos_puestos_operativos 
ADD COLUMN IF NOT EXISTS tipo_puesto_id UUID REFERENCES cat_tipos_puesto(id);

-- Crear índice para la nueva columna
CREATE INDEX IF NOT EXISTS idx_puestos_operativos_tipo ON as_turnos_puestos_operativos(tipo_puesto_id);

-- Insertar tipos de puesto predefinidos
INSERT INTO cat_tipos_puesto (nombre, descripcion, emoji, color, orden, activo) VALUES
('Portería Principal', 'Control de acceso principal', '🚪', 'blue', 1, true),
('Portería Secundaria', 'Control de acceso secundario', '🚶', 'sky', 2, true),
('CCTV', 'Centro de control y monitoreo', '📹', 'purple', 3, true),
('Guardia Perimetral', 'Vigilancia del perímetro exterior', '👮', 'green', 4, true),
('Guardia Interior', 'Vigilancia de áreas internas', '🛡️', 'emerald', 5, true),
('Recepción', 'Atención y control en recepción', '🏢', 'orange', 6, true),
('Garita Vehicular', 'Control de acceso vehicular', '🚗', 'red', 7, true),
('Ronda', 'Patrullaje y rondas de vigilancia', '🔄', 'yellow', 8, true),
('Supervisor', 'Supervisión de guardias', '⭐', 'indigo', 9, true),
('Móvil', 'Unidad móvil de respuesta', '🚓', 'teal', 10, true),
('Control Central', 'Centro de mando y control', '🎛️', 'slate', 11, true),
('Bodega', 'Vigilancia de bodegas', '📦', 'brown', 12, true)
ON CONFLICT (nombre, tenant_id) DO NOTHING;

-- Función para validar si un tipo de puesto puede ser eliminado
CREATE OR REPLACE FUNCTION puede_eliminar_tipo_puesto(tipo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar si el tipo está siendo usado por algún puesto operativo
    RETURN NOT EXISTS (
        SELECT 1 FROM as_turnos_puestos_operativos 
        WHERE tipo_puesto_id = tipo_id 
        AND activo = true
    );
END;
$$ LANGUAGE plpgsql;

-- Función para contar puestos usando un tipo
CREATE OR REPLACE FUNCTION contar_puestos_por_tipo(tipo_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total INTEGER;
BEGIN
    SELECT COUNT(*) INTO total
    FROM as_turnos_puestos_operativos 
    WHERE tipo_puesto_id = tipo_id 
    AND activo = true;
    
    RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cat_tipos_puesto_updated_at 
BEFORE UPDATE ON cat_tipos_puesto
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comentarios descriptivos
COMMENT ON TABLE cat_tipos_puesto IS 'Catálogo maestro de tipos de puestos operativos';
COMMENT ON COLUMN cat_tipos_puesto.emoji IS 'Emoji representativo del tipo de puesto para UI';
COMMENT ON COLUMN cat_tipos_puesto.color IS 'Color para badges en UI (tailwind colors)';
COMMENT ON COLUMN cat_tipos_puesto.orden IS 'Orden de presentación en listas';
