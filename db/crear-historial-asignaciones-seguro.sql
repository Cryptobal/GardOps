-- =====================================================
-- CREAR SISTEMA DE HISTORIAL DE ASIGNACIONES
-- ENFOQUE CONSERVADOR - NO ROMPER LÓGICA EXISTENTE
-- =====================================================

-- 1. Crear tabla de historial de asignaciones (NUEVA - no afecta sistema actual)
CREATE TABLE IF NOT EXISTS historial_asignaciones_guardias (
    id SERIAL PRIMARY KEY,
    guardia_id UUID NOT NULL REFERENCES guardias(id),
    instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
    puesto_id UUID REFERENCES as_turnos_puestos_operativos(id),
    
    -- Fechas de asignación
    fecha_inicio DATE NOT NULL,
    fecha_termino DATE, -- NULL = asignación activa
    
    -- Metadatos
    tipo_asignacion VARCHAR(30) DEFAULT 'fija' CHECK (tipo_asignacion IN ('fija', 'temporal', 'reemplazo')),
    motivo_inicio VARCHAR(100), -- 'asignacion_inicial', 'reasignacion', 'reemplazo_temporal'
    motivo_termino VARCHAR(100), -- 'finiquito', 'reasignacion', 'termino_contrato'
    
    -- Estado
    estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'finalizada', 'cancelada')),
    
    -- Auditoría
    observaciones TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_historial_asig_guardia 
ON historial_asignaciones_guardias(guardia_id);

CREATE INDEX IF NOT EXISTS idx_historial_asig_instalacion 
ON historial_asignaciones_guardias(instalacion_id);

CREATE INDEX IF NOT EXISTS idx_historial_asig_fechas 
ON historial_asignaciones_guardias(fecha_inicio, fecha_termino);

CREATE INDEX IF NOT EXISTS idx_historial_asig_activas 
ON historial_asignaciones_guardias(guardia_id, estado) 
WHERE estado = 'activa';

-- 3. Crear función para obtener asignación actual de un guardia
CREATE OR REPLACE FUNCTION obtener_asignacion_actual_guardia(p_guardia_id UUID)
RETURNS TABLE (
    asignacion_id INTEGER,
    instalacion_id UUID,
    instalacion_nombre TEXT,
    puesto_id UUID,
    puesto_nombre TEXT,
    fecha_inicio DATE,
    tipo_asignacion VARCHAR(30)
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ha.id,
        ha.instalacion_id,
        i.nombre,
        ha.puesto_id,
        po.nombre_puesto,
        ha.fecha_inicio,
        ha.tipo_asignacion
    FROM historial_asignaciones_guardias ha
    JOIN instalaciones i ON ha.instalacion_id = i.id
    LEFT JOIN as_turnos_puestos_operativos po ON ha.puesto_id = po.id
    WHERE ha.guardia_id = p_guardia_id 
      AND ha.estado = 'activa'
      AND ha.fecha_termino IS NULL
    ORDER BY ha.fecha_inicio DESC
    LIMIT 1;
END;
$$;

-- 4. Crear función para obtener historial completo de un guardia
CREATE OR REPLACE FUNCTION obtener_historial_asignaciones_guardia(p_guardia_id UUID)
RETURNS TABLE (
    asignacion_id INTEGER,
    instalacion_id UUID,
    instalacion_nombre TEXT,
    puesto_id UUID,
    puesto_nombre TEXT,
    fecha_inicio DATE,
    fecha_termino DATE,
    tipo_asignacion VARCHAR(30),
    motivo_inicio VARCHAR(100),
    motivo_termino VARCHAR(100),
    estado VARCHAR(20),
    duracion_dias INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ha.id,
        ha.instalacion_id,
        i.nombre,
        ha.puesto_id,
        po.nombre_puesto,
        ha.fecha_inicio,
        ha.fecha_termino,
        ha.tipo_asignacion,
        ha.motivo_inicio,
        ha.motivo_termino,
        ha.estado,
        CASE 
            WHEN ha.fecha_termino IS NOT NULL 
            THEN ha.fecha_termino - ha.fecha_inicio
            ELSE CURRENT_DATE - ha.fecha_inicio
        END as duracion_dias
    FROM historial_asignaciones_guardias ha
    JOIN instalaciones i ON ha.instalacion_id = i.id
    LEFT JOIN as_turnos_puestos_operativos po ON ha.puesto_id = po.id
    WHERE ha.guardia_id = p_guardia_id
    ORDER BY ha.fecha_inicio DESC;
END;
$$;

-- 5. Comentarios para documentar
COMMENT ON TABLE historial_asignaciones_guardias IS 
'Historial completo de asignaciones de guardias a instalaciones con fechas específicas';

COMMENT ON COLUMN historial_asignaciones_guardias.fecha_inicio IS 
'Fecha de inicio de la asignación (inclusive)';

COMMENT ON COLUMN historial_asignaciones_guardias.fecha_termino IS 
'Fecha de término de la asignación (inclusive). NULL = asignación activa';

COMMENT ON COLUMN historial_asignaciones_guardias.motivo_inicio IS 
'Razón del inicio: asignacion_inicial, reasignacion, reemplazo_temporal';

COMMENT ON COLUMN historial_asignaciones_guardias.motivo_termino IS 
'Razón del término: finiquito, reasignacion, termino_contrato';
