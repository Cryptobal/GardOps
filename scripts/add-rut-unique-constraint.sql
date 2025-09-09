-- Script para agregar restricciones únicas de RUT en las tablas de guardias
-- Esto evita duplicados de guardias con el mismo RUT

-- 1. Agregar restricción única en la tabla guardias (si existe)
DO $$
BEGIN
    -- Verificar si la tabla guardias existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guardias') THEN
        -- Verificar si ya existe la restricción
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'guardias_rut_unique' 
            AND conrelid = 'guardias'::regclass
        ) THEN
            -- Agregar restricción única para RUT
            ALTER TABLE guardias ADD CONSTRAINT guardias_rut_unique UNIQUE (rut);
            RAISE NOTICE 'Restricción única agregada a guardias.rut';
        ELSE
            RAISE NOTICE 'La restricción única ya existe en guardias.rut';
        END IF;
    ELSE
        RAISE NOTICE 'La tabla guardias no existe';
    END IF;
END $$;

-- 2. Agregar restricción única en la tabla rrhh_guardias (si existe)
DO $$
BEGIN
    -- Verificar si la tabla rrhh_guardias existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rrhh_guardias') THEN
        -- Verificar si ya existe la restricción
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'rrhh_guardias_rut_unique' 
            AND conrelid = 'rrhh_guardias'::regclass
        ) THEN
            -- Agregar restricción única para RUT
            ALTER TABLE rrhh_guardias ADD CONSTRAINT rrhh_guardias_rut_unique UNIQUE (rut);
            RAISE NOTICE 'Restricción única agregada a rrhh_guardias.rut';
        ELSE
            RAISE NOTICE 'La restricción única ya existe en rrhh_guardias.rut';
        END IF;
    ELSE
        RAISE NOTICE 'La tabla rrhh_guardias no existe';
    END IF;
END $$;

-- 3. Verificar duplicados existentes (solo para información)
-- Tabla guardias
SELECT 
    rut, 
    COUNT(*) as cantidad_duplicados,
    array_agg(nombre || ' ' || COALESCE(apellido_paterno, '')) as nombres
FROM guardias 
WHERE rut IS NOT NULL 
GROUP BY rut 
HAVING COUNT(*) > 1
ORDER BY cantidad_duplicados DESC;

-- Tabla rrhh_guardias (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rrhh_guardias') THEN
        RAISE NOTICE 'Verificando duplicados en rrhh_guardias...';
        -- Esta consulta se ejecutará solo si la tabla existe
        PERFORM 1;
    END IF;
END $$;

-- Si la tabla rrhh_guardias existe, mostrar duplicados
SELECT 
    rut, 
    COUNT(*) as cantidad_duplicados,
    array_agg(nombre) as nombres
FROM rrhh_guardias 
WHERE rut IS NOT NULL 
GROUP BY rut 
HAVING COUNT(*) > 1
ORDER BY cantidad_duplicados DESC;
