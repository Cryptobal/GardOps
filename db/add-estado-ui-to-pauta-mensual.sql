-- Agregar campo estado_ui a la tabla as_turnos_pauta_mensual
-- Este campo es necesario para la consistencia entre guardado y carga

-- Agregar la columna estado_ui
ALTER TABLE as_turnos_pauta_mensual 
ADD COLUMN IF NOT EXISTS estado_ui TEXT;

-- Crear índice para optimizar consultas por estado_ui
CREATE INDEX IF NOT EXISTS idx_pauta_mensual_estado_ui 
ON as_turnos_pauta_mensual(estado_ui);

-- Actualizar registros existentes para establecer estado_ui basado en estado
UPDATE as_turnos_pauta_mensual 
SET estado_ui = CASE 
  WHEN estado = 'planificado' THEN 'plan'
  WHEN estado = 'libre' THEN 'libre'
  WHEN estado = 'trabajado' THEN 'asistido'
  WHEN estado = 'inasistencia' THEN 'inasistencia'
  WHEN estado = 'permiso' THEN 'permiso'
  WHEN estado = 'vacaciones' THEN 'vacaciones'
  WHEN estado = 'licencia' THEN 'licencia'
  ELSE NULL
END
WHERE estado_ui IS NULL;

-- Verificar que se agregó correctamente
SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN estado_ui IS NOT NULL THEN 1 END) as con_estado_ui,
  COUNT(CASE WHEN estado_ui IS NULL THEN 1 END) as sin_estado_ui
FROM as_turnos_pauta_mensual;
