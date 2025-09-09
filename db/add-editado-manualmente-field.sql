-- Agregar campo editado_manualmente a la tabla as_turnos_pauta_mensual
-- para controlar si un registro fue editado manualmente por el usuario

ALTER TABLE as_turnos_pauta_mensual 
ADD COLUMN IF NOT EXISTS editado_manualmente BOOLEAN DEFAULT FALSE;

-- Crear índice para mejorar performance en consultas
CREATE INDEX IF NOT EXISTS idx_pauta_mensual_editado_manualmente 
ON as_turnos_pauta_mensual(editado_manualmente);

-- Comentario para documentar el campo
COMMENT ON COLUMN as_turnos_pauta_mensual.editado_manualmente IS 
'Indica si este registro fue editado manualmente por el usuario. Si es TRUE, no debe ser sobrescrito por lógica automática de patrones de turno.';
