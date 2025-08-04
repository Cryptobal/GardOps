-- Script para agregar columnas de eliminación a as_turnos_puestos_operativos
-- Ejecutar este script para agregar soporte para eliminación lógica

-- Agregar columna activo (boolean, por defecto true)
ALTER TABLE as_turnos_puestos_operativos 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Agregar columna eliminado_en (timestamp)
ALTER TABLE as_turnos_puestos_operativos 
ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMP;

-- Agregar columna eliminado_por (UUID para referenciar al usuario)
ALTER TABLE as_turnos_puestos_operativos 
ADD COLUMN IF NOT EXISTS eliminado_por UUID;

-- Agregar columna observaciones (texto para comentarios)
ALTER TABLE as_turnos_puestos_operativos 
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Agregar columna actualizado_en (timestamp)
ALTER TABLE as_turnos_puestos_operativos 
ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP DEFAULT NOW();

-- Crear índice para optimizar consultas por estado activo
CREATE INDEX IF NOT EXISTS idx_puestos_operativos_activo 
ON as_turnos_puestos_operativos(activo);

-- Crear índice para optimizar consultas por eliminado_en
CREATE INDEX IF NOT EXISTS idx_puestos_operativos_eliminado_en 
ON as_turnos_puestos_operativos(eliminado_en);

-- Actualizar registros existentes para que tengan activo = true
UPDATE as_turnos_puestos_operativos 
SET activo = true 
WHERE activo IS NULL;

-- Comentarios sobre las nuevas columnas
COMMENT ON COLUMN as_turnos_puestos_operativos.activo IS 'Indica si el puesto está activo (true) o inactivo (false)';
COMMENT ON COLUMN as_turnos_puestos_operativos.eliminado_en IS 'Fecha y hora cuando el puesto fue eliminado/inactivado';
COMMENT ON COLUMN as_turnos_puestos_operativos.eliminado_por IS 'ID del usuario que eliminó/inactivó el puesto';
COMMENT ON COLUMN as_turnos_puestos_operativos.observaciones IS 'Comentarios adicionales sobre el puesto';
COMMENT ON COLUMN as_turnos_puestos_operativos.actualizado_en IS 'Fecha y hora de la última actualización del puesto'; 