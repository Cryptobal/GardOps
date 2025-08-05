-- Script para actualizar estados de asistencia en pauta mensual
-- Ejecutar después de implementar los cambios en el código

-- Agregar comentario sobre los nuevos estados
COMMENT ON COLUMN as_turnos_pauta_mensual.estado IS 'Estados: T=Asignado, trabajado=Asistido, inasistencia=No asistió, reemplazo=Con reemplazo, libre=Disponible';

-- Verificar que la restricción CHECK incluya todos los estados necesarios
ALTER TABLE as_turnos_pauta_mensual 
DROP CONSTRAINT IF EXISTS as_turnos_pauta_mensual_estado_check;

ALTER TABLE as_turnos_pauta_mensual 
ADD CONSTRAINT as_turnos_pauta_mensual_estado_check 
CHECK (estado IN (
    'T',              -- Asignado
    'trabajado',      -- Asistió
    'inasistencia',   -- No asistió
    'reemplazo',      -- Reemplazo asignado
    'libre',          -- Disponible
    'sin_cobertura'   -- Sin cobertura
));

-- Crear índices para mejorar el rendimiento de las consultas de asistencia
CREATE INDEX IF NOT EXISTS idx_as_turnos_pauta_mensual_estado 
ON as_turnos_pauta_mensual(estado);

CREATE INDEX IF NOT EXISTS idx_as_turnos_pauta_mensual_fecha_estado 
ON as_turnos_pauta_mensual(anio, mes, dia, estado);

-- Verificar que no haya estados inconsistentes
SELECT 
  estado,
  COUNT(*) as cantidad,
  'Revisar estos registros' as accion
FROM as_turnos_pauta_mensual 
WHERE estado NOT IN ('T', 'trabajado', 'inasistencia', 'reemplazo', 'libre', 'sin_cobertura')
GROUP BY estado; 