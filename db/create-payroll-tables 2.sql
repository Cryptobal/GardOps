-- Crear tabla para payroll runs (procesos de nómina mensual)
CREATE TABLE IF NOT EXISTS payroll_run (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    anio INTEGER NOT NULL CHECK (anio >= 2020),
    estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'procesando', 'completado', 'cancelado')),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_procesamiento TIMESTAMP WITH TIME ZONE NULL,
    usuario_creacion UUID REFERENCES usuarios(id),
    observaciones TEXT,
    tenant_id UUID NOT NULL DEFAULT 'accebf8a-bacc-41fa-9601-ed39cb320a52',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(instalacion_id, mes, anio)
);

-- Crear tabla para ítems extras de payroll
CREATE TABLE IF NOT EXISTS payroll_items_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_run(id) ON DELETE CASCADE,
    guardia_id UUID NOT NULL REFERENCES guardias(id),
    item_id UUID REFERENCES sueldo_item(id), -- Referencia al catálogo de ítems
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('haber_imponible', 'haber_no_imponible', 'descuento')),
    nombre VARCHAR(100) NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    glosa TEXT,
    tenant_id UUID NOT NULL DEFAULT 'accebf8a-bacc-41fa-9601-ed39cb320a52',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payroll_run_id, guardia_id, nombre, tipo)
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_payroll_run_instalacion_mes_anio ON payroll_run(instalacion_id, mes, anio);
CREATE INDEX IF NOT EXISTS idx_payroll_run_estado ON payroll_run(estado);
CREATE INDEX IF NOT EXISTS idx_payroll_run_fecha_creacion ON payroll_run(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_payroll_run_tenant ON payroll_run(tenant_id);

CREATE INDEX IF NOT EXISTS idx_payroll_items_extras_payroll_run ON payroll_items_extras(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_extras_guardia ON payroll_items_extras(guardia_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_extras_item ON payroll_items_extras(item_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_extras_tipo ON payroll_items_extras(tipo);
CREATE INDEX IF NOT EXISTS idx_payroll_items_extras_tenant ON payroll_items_extras(tenant_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_payroll_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payroll_run_updated_at 
    BEFORE UPDATE ON payroll_run 
    FOR EACH ROW 
    EXECUTE FUNCTION update_payroll_updated_at();

CREATE TRIGGER update_payroll_items_extras_updated_at 
    BEFORE UPDATE ON payroll_items_extras 
    FOR EACH ROW 
    EXECUTE FUNCTION update_payroll_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE payroll_run IS 'Procesos de nómina mensual por instalación';
COMMENT ON COLUMN payroll_run.estado IS 'Estado del proceso: borrador, procesando, completado, cancelado';
COMMENT ON COLUMN payroll_run.fecha_procesamiento IS 'Fecha cuando se completó el procesamiento';

COMMENT ON TABLE payroll_items_extras IS 'Ítems extras (bonos, descuentos) por guardia en un proceso de payroll';
COMMENT ON COLUMN payroll_items_extras.item_id IS 'Referencia al catálogo de ítems de sueldo';
COMMENT ON COLUMN payroll_items_extras.tipo IS 'Tipo de ítem: haber_imponible, haber_no_imponible, descuento';
COMMENT ON COLUMN payroll_items_extras.nombre IS 'Nombre del ítem (ej: Bono responsabilidad, Descuento tardanza)';
COMMENT ON COLUMN payroll_items_extras.monto IS 'Monto del ítem (positivo para haberes, negativo para descuentos)';
COMMENT ON COLUMN payroll_items_extras.glosa IS 'Descripción adicional del ítem';
