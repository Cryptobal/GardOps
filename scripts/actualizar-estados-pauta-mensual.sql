-- Actualizar restricción CHECK de estados en as_turnos_pauta_mensual
-- Para permitir todos los estados necesarios en pauta diaria

-- Eliminar la restricción CHECK existente
ALTER TABLE as_turnos_pauta_mensual 
DROP CONSTRAINT IF EXISTS as_turnos_pauta_mensual_new_estado_check;

-- Agregar nueva restricción CHECK con todos los estados necesarios
ALTER TABLE as_turnos_pauta_mensual 
ADD CONSTRAINT as_turnos_pauta_mensual_estado_check 
CHECK (estado IN (
    'trabajado',      -- Asistió
    'inasistencia',   -- No asistió
    'reemplazo',      -- Reemplazo asignado
    'cubierto',       -- PPC cubierto
    'sin_cubrir',     -- PPC sin cubrir
    'sin_marcar',     -- Sin marcar (estado inicial)
    'libre',          -- Día libre (original)
    'permiso'         -- Permiso (original)
));