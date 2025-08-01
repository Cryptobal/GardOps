-- Corregir constraint de asignación única
-- Primero eliminar el constraint existente si existe
ALTER TABLE asignaciones_guardias DROP CONSTRAINT IF EXISTS unique_active_assignment;

-- Crear el constraint correcto
ALTER TABLE asignaciones_guardias 
ADD CONSTRAINT unique_active_assignment 
UNIQUE (guardia_id) 
WHERE (estado = 'Activa' AND fecha_termino IS NULL);

-- Verificar que el constraint se creó correctamente
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'unique_active_assignment'; 