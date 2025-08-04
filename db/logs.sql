-- Sistema centralizado de logs para GardOps
-- Tablas estandarizadas para 7 módulos principales con UUIDs y referencias

-- 1. Logs de Guardias
CREATE TABLE IF NOT EXISTS logs_guardias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guardia_id UUID NOT NULL REFERENCES guardias(id) ON DELETE CASCADE,
    accion TEXT NOT NULL,
    usuario TEXT NOT NULL,
    tipo TEXT DEFAULT 'manual',
    contexto TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMP DEFAULT now(),
    tenant_id UUID REFERENCES tenants(id)
);

-- 2. Logs de Pauta Mensual (usando pautas_mensuales)
CREATE TABLE IF NOT EXISTS logs_pauta_mensual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pauta_mensual_id UUID NOT NULL REFERENCES pautas_mensuales(id) ON DELETE CASCADE,
    accion TEXT NOT NULL,
    usuario TEXT NOT NULL,
    tipo TEXT DEFAULT 'manual',
    contexto TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMP DEFAULT now(),
    tenant_id UUID REFERENCES tenants(id)
);

-- 3. Logs de Pauta Diaria (usando pautas_diarias)
CREATE TABLE IF NOT EXISTS logs_pauta_diaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pauta_diaria_id UUID NOT NULL REFERENCES pautas_diarias(id) ON DELETE CASCADE,
    accion TEXT NOT NULL,
    usuario TEXT NOT NULL,
    tipo TEXT DEFAULT 'manual',
    contexto TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMP DEFAULT now(),
    tenant_id UUID REFERENCES tenants(id)
);

-- 4. Logs de Turnos Extras
CREATE TABLE IF NOT EXISTS logs_turnos_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_extra_id UUID NOT NULL REFERENCES turnos_extras(id) ON DELETE CASCADE,
    accion TEXT NOT NULL,
    usuario TEXT NOT NULL,
    tipo TEXT DEFAULT 'manual',
    contexto TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMP DEFAULT now(),
    tenant_id UUID REFERENCES tenants(id)
);

-- 5. Logs de Puestos Operativos (usando as_turnos_puestos_operativos)
CREATE TABLE IF NOT EXISTS logs_puestos_operativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puesto_operativo_id UUID NOT NULL REFERENCES as_turnos_puestos_operativos(id) ON DELETE CASCADE,
    accion TEXT NOT NULL,
    usuario TEXT NOT NULL,
    tipo TEXT DEFAULT 'manual',
    contexto TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMP DEFAULT now(),
    tenant_id UUID REFERENCES tenants(id)
);

-- 6. Logs de Documentos
CREATE TABLE IF NOT EXISTS logs_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
    accion TEXT NOT NULL,
    usuario TEXT NOT NULL,
    tipo TEXT DEFAULT 'manual',
    contexto TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMP DEFAULT now(),
    tenant_id UUID REFERENCES tenants(id)
);

-- 7. Logs de Usuarios
CREATE TABLE IF NOT EXISTS logs_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    accion TEXT NOT NULL,
    usuario TEXT NOT NULL,
    tipo TEXT DEFAULT 'manual',
    contexto TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    fecha TIMESTAMP DEFAULT now(),
    tenant_id UUID REFERENCES tenants(id)
);

-- Índices para optimizar consultas por fecha y entidad
CREATE INDEX IF NOT EXISTS idx_logs_guardias_fecha ON logs_guardias(fecha);
CREATE INDEX IF NOT EXISTS idx_logs_guardias_guardia_id ON logs_guardias(guardia_id);
CREATE INDEX IF NOT EXISTS idx_logs_guardias_usuario ON logs_guardias(usuario);

CREATE INDEX IF NOT EXISTS idx_logs_pauta_mensual_fecha ON logs_pauta_mensual(fecha);
CREATE INDEX IF NOT EXISTS idx_logs_pauta_mensual_pauta_id ON logs_pauta_mensual(pauta_mensual_id);
CREATE INDEX IF NOT EXISTS idx_logs_pauta_mensual_usuario ON logs_pauta_mensual(usuario);

CREATE INDEX IF NOT EXISTS idx_logs_pauta_diaria_fecha ON logs_pauta_diaria(fecha);
CREATE INDEX IF NOT EXISTS idx_logs_pauta_diaria_pauta_id ON logs_pauta_diaria(pauta_diaria_id);
CREATE INDEX IF NOT EXISTS idx_logs_pauta_diaria_usuario ON logs_pauta_diaria(usuario);

CREATE INDEX IF NOT EXISTS idx_logs_turnos_extras_fecha ON logs_turnos_extras(fecha);
CREATE INDEX IF NOT EXISTS idx_logs_turnos_extras_turno_id ON logs_turnos_extras(turno_extra_id);
CREATE INDEX IF NOT EXISTS idx_logs_turnos_extras_usuario ON logs_turnos_extras(usuario);

CREATE INDEX IF NOT EXISTS idx_logs_puestos_operativos_fecha ON logs_puestos_operativos(fecha);
CREATE INDEX IF NOT EXISTS idx_logs_puestos_operativos_puesto_id ON logs_puestos_operativos(puesto_operativo_id);
CREATE INDEX IF NOT EXISTS idx_logs_puestos_operativos_usuario ON logs_puestos_operativos(usuario);

CREATE INDEX IF NOT EXISTS idx_logs_documentos_fecha ON logs_documentos(fecha);
CREATE INDEX IF NOT EXISTS idx_logs_documentos_documento_id ON logs_documentos(documento_id);
CREATE INDEX IF NOT EXISTS idx_logs_documentos_usuario ON logs_documentos(usuario);

CREATE INDEX IF NOT EXISTS idx_logs_usuarios_fecha ON logs_usuarios(fecha);
CREATE INDEX IF NOT EXISTS idx_logs_usuarios_usuario_id ON logs_usuarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_usuarios_usuario ON logs_usuarios(usuario);

-- Índices para tenant_id en todas las tablas
CREATE INDEX IF NOT EXISTS idx_logs_guardias_tenant ON logs_guardias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_pauta_mensual_tenant ON logs_pauta_mensual(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_pauta_diaria_tenant ON logs_pauta_diaria(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_turnos_extras_tenant ON logs_turnos_extras(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_puestos_operativos_tenant ON logs_puestos_operativos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_documentos_tenant ON logs_documentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_usuarios_tenant ON logs_usuarios(tenant_id); 