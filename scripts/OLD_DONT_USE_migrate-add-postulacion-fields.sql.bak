-- Migración para agregar campos del formulario de postulación a la tabla guardias
-- Ejecutar este script para preparar la tabla para el nuevo sistema

-- 1. Agregar campos de información personal
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS sexo VARCHAR(20) CHECK (sexo IN ('Masculino', 'Femenino')),
ADD COLUMN IF NOT EXISTS nacionalidad VARCHAR(50) DEFAULT 'Chilena',
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- 2. Agregar campos previsionales
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS afp VARCHAR(100),
ADD COLUMN IF NOT EXISTS descuento_afp DECIMAL(3,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS prevision_salud VARCHAR(50),
ADD COLUMN IF NOT EXISTS cotiza_sobre_7 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS monto_pactado_uf DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS es_pensionado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS asignacion_familiar BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tramo_asignacion VARCHAR(10) CHECK (tramo_asignacion IN ('A', 'B', 'C'));

-- 3. Agregar campos físicos
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS talla_camisa VARCHAR(10) CHECK (talla_camisa IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL')),
ADD COLUMN IF NOT EXISTS talla_pantalon VARCHAR(10) CHECK (talla_pantalon IN ('38', '40', '42', '44', '46', '48', '50', '52', '54')),
ADD COLUMN IF NOT EXISTS talla_zapato INTEGER CHECK (talla_zapato BETWEEN 35 AND 46),
ADD COLUMN IF NOT EXISTS altura_cm INTEGER CHECK (altura_cm BETWEEN 140 AND 210),
ADD COLUMN IF NOT EXISTS peso_kg INTEGER CHECK (peso_kg BETWEEN 40 AND 120);

-- 4. Agregar campos de postulación
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS fecha_postulacion TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS estado_postulacion VARCHAR(20) DEFAULT 'pendiente' CHECK (estado_postulacion IN ('pendiente', 'revisando', 'aprobada', 'rechazada')),
ADD COLUMN IF NOT EXISTS ip_postulacion INET,
ADD COLUMN IF NOT EXISTS user_agent_postulacion TEXT;

-- 5. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_guardias_estado_postulacion ON guardias(estado_postulacion);
CREATE INDEX IF NOT EXISTS idx_guardias_fecha_postulacion ON guardias(fecha_postulacion);
CREATE INDEX IF NOT EXISTS idx_guardias_afp ON guardias(afp);
CREATE INDEX IF NOT EXISTS idx_guardias_prevision_salud ON guardias(prevision_salud);

-- 6. Crear tabla de configuración de webhooks por tenant
CREATE TABLE IF NOT EXISTS tenant_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    url_webhook TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_tenant_webhook UNIQUE(tenant_id)
);

-- 7. Crear tabla de tipos de documentos para postulación
CREATE TABLE IF NOT EXISTS tipos_documentos_postulacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    obligatorio BOOLEAN DEFAULT true,
    formato_permitido VARCHAR(50) DEFAULT 'PDF,IMAGEN',
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Insertar tipos de documentos predefinidos
INSERT INTO tipos_documentos_postulacion (nombre, descripcion, obligatorio, formato_permitido, orden) VALUES
('Certificado OS10', 'Certificado de salud ocupacional', true, 'PDF,IMAGEN', 1),
('Carnet Identidad Frontal', 'Foto frontal del carnet de identidad', true, 'IMAGEN', 2),
('Carnet Identidad Reverso', 'Foto del reverso del carnet de identidad', true, 'IMAGEN', 3),
('Certificado Antecedentes', 'Certificado de antecedentes penales', true, 'PDF,IMAGEN', 4),
('Certificado Enseñanza Media', 'Certificado de estudios secundarios', true, 'PDF,IMAGEN', 5),
('Certificado AFP', 'Certificado de afiliación AFP', true, 'PDF,IMAGEN', 6),
('Certificado AFC', 'Certificado de afiliación AFC', true, 'PDF,IMAGEN', 7),
('Certificado FONASA/ISAPRE', 'Certificado de afiliación de salud', true, 'PDF,IMAGEN', 8)
ON CONFLICT DO NOTHING;

-- 9. Crear tabla de documentos de postulación
CREATE TABLE IF NOT EXISTS documentos_postulacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guardia_id UUID NOT NULL REFERENCES guardias(id) ON DELETE CASCADE,
    tipo_documento_id UUID NOT NULL REFERENCES tipos_documentos_postulacion(id),
    nombre_archivo TEXT NOT NULL,
    url_archivo TEXT NOT NULL,
    contenido_archivo BYTEA,
    tamaño BIGINT,
    formato VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_guardia_tipo_documento UNIQUE(guardia_id, tipo_documento_id)
);

-- 10. Crear índices para documentos
CREATE INDEX IF NOT EXISTS idx_documentos_postulacion_guardia ON documentos_postulacion(guardia_id);
CREATE INDEX IF NOT EXISTS idx_documentos_postulacion_tipo ON documentos_postulacion(tipo_documento_id);

-- 11. Crear tabla de logs de webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    guardia_id UUID NOT NULL REFERENCES guardias(id),
    url_webhook TEXT NOT NULL,
    payload_sent JSONB,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 12. Crear índices para logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_tenant ON webhook_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_guardia ON webhook_logs(guardia_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at);

-- 13. Crear tabla de notificaciones internas
CREATE TABLE IF NOT EXISTS notificaciones_postulaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    guardia_id UUID NOT NULL REFERENCES guardias(id),
    tipo VARCHAR(50) DEFAULT 'nueva_postulacion',
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 14. Crear índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notificaciones_tenant ON notificaciones_postulaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones_postulaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created ON notificaciones_postulaciones(created_at);

-- 15. Verificar estructura final
SELECT 
    'Campos agregados a guardias' as tabla,
    COUNT(*) as campos
FROM information_schema.columns 
WHERE table_name = 'guardias' 
AND column_name IN (
    'sexo', 'nacionalidad', 'fecha_nacimiento', 'afp', 'descuento_afp',
    'prevision_salud', 'cotiza_sobre_7', 'monto_pactado_uf', 'es_pensionado',
    'asignacion_familiar', 'tramo_asignacion', 'talla_camisa', 'talla_pantalon',
    'talla_zapato', 'altura_cm', 'peso_kg', 'fecha_postulacion', 'estado_postulacion'
);

SELECT 
    'Tablas creadas' as tipo,
    COUNT(*) as cantidad
FROM information_schema.tables 
WHERE table_name IN (
    'tenant_webhooks', 'tipos_documentos_postulacion', 
    'documentos_postulacion', 'webhook_logs', 'notificaciones_postulaciones'
);

-- 16. Mostrar resumen
SELECT '✅ Migración completada exitosamente' as resultado;
