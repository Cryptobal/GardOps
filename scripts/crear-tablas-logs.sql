-- Script para crear las tablas de logs faltantes
-- Ejecutar después de la migración principal

-- Tabla de logs para tenant_webhooks
CREATE TABLE IF NOT EXISTS logs_tenant_webhooks (
    id SERIAL PRIMARY KEY,
    tenant_webhooks_id TEXT NOT NULL,
    accion TEXT NOT NULL,
    usuario TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'api',
    contexto JSONB,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMP DEFAULT NOW(),
    tenant_id TEXT
);

-- Tabla de logs para postulaciones
CREATE TABLE IF NOT EXISTS logs_postulaciones (
    id SERIAL PRIMARY KEY,
    postulacion_id TEXT NOT NULL,
    accion TEXT NOT NULL,
    usuario TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'api',
    contexto JSONB,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMP DEFAULT NOW(),
    tenant_id TEXT
);

-- Tabla de logs para documentos_postulacion
CREATE TABLE IF NOT EXISTS logs_documentos_postulacion (
    id SERIAL PRIMARY KEY,
    documento_postulacion_id TEXT NOT NULL,
    accion TEXT NOT NULL,
    usuario TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'api',
    contexto JSONB,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMP DEFAULT NOW(),
    tenant_id TEXT
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_logs_tenant_webhooks_tenant_id ON logs_tenant_webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_tenant_webhooks_fecha ON logs_tenant_webhooks(fecha);
CREATE INDEX IF NOT EXISTS idx_logs_postulaciones_tenant_id ON logs_postulaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_postulaciones_fecha ON logs_postulaciones(fecha);
CREATE INDEX IF NOT EXISTS idx_logs_documentos_postulacion_tenant_id ON logs_documentos_postulacion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_documentos_postulacion_fecha ON logs_documentos_postulacion(fecha);

-- Verificar que las tablas se crearon correctamente
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE 'logs_%' 
ORDER BY table_name;
