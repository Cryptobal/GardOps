-- Reestructurar estados de pauta mensual según lógica estándar
-- Agregar campos para separar conceptos: plan_base, estado_rrhh, estado_operacion

-- 1. Agregar nuevos campos a la tabla principal
ALTER TABLE as_turnos_pauta_mensual 
ADD COLUMN IF NOT EXISTS plan_base VARCHAR(20) DEFAULT 'planificado',
ADD COLUMN IF NOT EXISTS estado_rrhh VARCHAR(30) DEFAULT 'sin_evento',
ADD COLUMN IF NOT EXISTS estado_operacion VARCHAR(50),
ADD COLUMN IF NOT EXISTS guardia_asignado_id UUID,
ADD COLUMN IF NOT EXISTS turno_extra_guardia_id UUID,
ADD COLUMN IF NOT EXISTS turno_extra_motivo VARCHAR(30);

-- 2. Crear tabla de eventos RRHH
CREATE TABLE IF NOT EXISTS as_turnos_eventos_rrhh (
    id SERIAL PRIMARY KEY,
    guardia_id UUID NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('permiso_con_goce', 'permiso_sin_goce', 'licencia', 'finiquito')),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE, -- nullable para finiquito
    documento TEXT,
    comentario TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_eventos_rrhh_guardia_fecha 
ON as_turnos_eventos_rrhh(guardia_id, fecha_inicio, fecha_fin);

CREATE INDEX IF NOT EXISTS idx_pauta_plan_base 
ON as_turnos_pauta_mensual(plan_base);

CREATE INDEX IF NOT EXISTS idx_pauta_estado_rrhh 
ON as_turnos_pauta_mensual(estado_rrhh);

CREATE INDEX IF NOT EXISTS idx_pauta_estado_operacion 
ON as_turnos_pauta_mensual(estado_operacion);

-- 4. Migrar datos existentes según lógica correcta
UPDATE as_turnos_pauta_mensual 
SET 
    plan_base = CASE 
        WHEN estado = 'libre' THEN 'libre'
        ELSE 'planificado'
    END,
    estado_rrhh = 'sin_evento',
    estado_operacion = CASE
        WHEN estado = 'libre' THEN 'libre'
        WHEN estado = 'planificado' AND guardia_id IS NOT NULL THEN 'asistido'
        WHEN estado = 'planificado' AND guardia_id IS NULL THEN 'ppc_no_cubierto'
        ELSE estado
    END,
    guardia_asignado_id = guardia_id
WHERE plan_base IS NULL OR estado_operacion IS NULL;

-- 5. Actualizar restricciones para nuevos estados
ALTER TABLE as_turnos_pauta_mensual 
DROP CONSTRAINT IF EXISTS chk_plan_base_valido;

ALTER TABLE as_turnos_pauta_mensual 
ADD CONSTRAINT chk_plan_base_valido 
CHECK (plan_base IN ('planificado', 'libre'));

ALTER TABLE as_turnos_pauta_mensual 
DROP CONSTRAINT IF EXISTS chk_estado_rrhh_valido;

ALTER TABLE as_turnos_pauta_mensual 
ADD CONSTRAINT chk_estado_rrhh_valido 
CHECK (estado_rrhh IN ('sin_evento', 'permiso_con_goce', 'permiso_sin_goce', 'licencia', 'finiquito_abierto'));

ALTER TABLE as_turnos_pauta_mensual 
DROP CONSTRAINT IF EXISTS chk_estado_operacion_valido;

ALTER TABLE as_turnos_pauta_mensual 
ADD CONSTRAINT chk_estado_operacion_valido 
CHECK (estado_operacion IN (
    'libre',
    'asistido',
    'falta_no_cubierto', 
    'falta_cubierto_por_turno_extra',
    'permiso_con_goce_no_cubierto',
    'permiso_con_goce_cubierto_por_turno_extra',
    'permiso_sin_goce_no_cubierto',
    'permiso_sin_goce_cubierto_por_turno_extra',
    'licencia_no_cubierto',
    'licencia_cubierto_por_turno_extra',
    'ppc_no_cubierto',
    'ppc_cubierto_por_turno_extra'
));

-- 6. Comentarios para documentar
COMMENT ON COLUMN as_turnos_pauta_mensual.plan_base IS 
'Estado base según pauta mensual: planificado (se trabaja) o libre (no se trabaja, inmutable)';

COMMENT ON COLUMN as_turnos_pauta_mensual.estado_rrhh IS 
'Estado derivado de eventos RRHH del guardia asignado';

COMMENT ON COLUMN as_turnos_pauta_mensual.estado_operacion IS 
'Estado final de cobertura del puesto tras resolver precedencias';

COMMENT ON COLUMN as_turnos_pauta_mensual.guardia_asignado_id IS 
'Guardia titular asignado al puesto según pauta (puede ser diferente de guardia_id si hay reemplazo)';

COMMENT ON TABLE as_turnos_eventos_rrhh IS 
'Eventos de RRHH que afectan la disponibilidad de guardias (permisos, licencias, finiquitos)';
