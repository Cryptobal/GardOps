-- Script para agregar columnas de eliminación a as_turnos_puestos_operativos
-- Ejecutar este script antes de usar la nueva funcionalidad de eliminación/inactivación

-- Agregar columna activo si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'activo'
    ) THEN
        ALTER TABLE as_turnos_puestos_operativos ADD COLUMN activo BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Agregar columna eliminado_por si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'eliminado_por'
    ) THEN
        ALTER TABLE as_turnos_puestos_operativos ADD COLUMN eliminado_por VARCHAR(255);
    END IF;
END $$;

-- Agregar columna eliminado_en si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'eliminado_en'
    ) THEN
        ALTER TABLE as_turnos_puestos_operativos ADD COLUMN eliminado_en TIMESTAMP;
    END IF;
END $$;

-- Verificar que las columnas fueron agregadas correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'as_turnos_puestos_operativos' 
AND column_name IN ('activo', 'eliminado_por', 'eliminado_en')
ORDER BY column_name; 