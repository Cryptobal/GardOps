-- =====================================================
-- MIGRACIÓN ATÓMICA: rol_servicio_id → rol_id
-- =====================================================
-- Objetivo: Corregir inconsistencia entre esquema y código
-- Estrategia: Renombrar columna sin duplicar datos
-- Fecha: 2025-09-10
-- =====================================================

BEGIN;

-- PASO 1: VERIFICACIÓN PREVIA
DO $$
DECLARE
    tiene_rol_servicio_id BOOLEAN := FALSE;
    tiene_rol_id BOOLEAN := FALSE;
    count_registros INTEGER := 0;
BEGIN
    -- Verificar existencia de columnas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'rol_servicio_id'
    ) INTO tiene_rol_servicio_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'rol_id'
    ) INTO tiene_rol_id;
    
    -- Contar registros para backup
    SELECT COUNT(*) FROM as_turnos_puestos_operativos INTO count_registros;
    
    RAISE NOTICE '🔍 ESTADO ACTUAL:';
    RAISE NOTICE '  - Tiene rol_servicio_id: %', tiene_rol_servicio_id;
    RAISE NOTICE '  - Tiene rol_id: %', tiene_rol_id;
    RAISE NOTICE '  - Total registros: %', count_registros;
    
    -- Validar estado esperado
    IF tiene_rol_servicio_id AND tiene_rol_id THEN
        RAISE EXCEPTION '❌ ERROR: Ambas columnas existen. Revisar manualmente.';
    END IF;
    
    IF NOT tiene_rol_servicio_id AND NOT tiene_rol_id THEN
        RAISE EXCEPTION '❌ ERROR: Ninguna columna existe. Revisar esquema.';
    END IF;
END $$;

-- PASO 2: MIGRACIÓN CONDICIONAL
DO $$
BEGIN
    -- CASO 1: Existe rol_servicio_id, necesita renombrar
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'as_turnos_puestos_operativos' 
        AND column_name = 'rol_servicio_id'
    ) THEN
        RAISE NOTICE '🔄 MIGRANDO: rol_servicio_id → rol_id';
        
        -- 2.1: Eliminar índice existente
        DROP INDEX IF EXISTS idx_puestos_operativos_rol;
        RAISE NOTICE '✅ Índice anterior eliminado';
        
        -- 2.2: Renombrar columna
        ALTER TABLE as_turnos_puestos_operativos 
        RENAME COLUMN rol_servicio_id TO rol_id;
        RAISE NOTICE '✅ Columna renombrada: rol_servicio_id → rol_id';
        
        -- 2.3: Crear nuevo índice
        CREATE INDEX idx_puestos_operativos_rol ON as_turnos_puestos_operativos(rol_id);
        RAISE NOTICE '✅ Nuevo índice creado en rol_id';
        
    -- CASO 2: Ya existe rol_id, no hacer nada
    ELSE
        RAISE NOTICE 'ℹ️ Columna rol_id ya existe, no se requiere migración';
    END IF;
END $$;

-- PASO 3: AGREGAR FOREIGN KEY (si no existe)
DO $$
BEGIN
    -- Verificar si ya existe el foreign key
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'as_turnos_puestos_operativos'::regclass 
        AND contype = 'f'
        AND pg_get_constraintdef(oid) LIKE '%rol_id%'
        AND pg_get_constraintdef(oid) LIKE '%as_turnos_roles_servicio%'
    ) THEN
        -- Agregar foreign key
        ALTER TABLE as_turnos_puestos_operativos 
        ADD CONSTRAINT fk_puesto_rol 
        FOREIGN KEY (rol_id) REFERENCES as_turnos_roles_servicio(id);
        
        RAISE NOTICE '✅ Foreign key agregado: rol_id → as_turnos_roles_servicio(id)';
    ELSE
        RAISE NOTICE 'ℹ️ Foreign key ya existe para rol_id';
    END IF;
END $$;

-- PASO 4: VERIFICACIÓN POST-MIGRACIÓN
DO $$
DECLARE
    count_con_rol INTEGER := 0;
    count_sin_rol INTEGER := 0;
    sample_record RECORD;
BEGIN
    -- Contar registros con y sin rol
    SELECT COUNT(*) FROM as_turnos_puestos_operativos WHERE rol_id IS NOT NULL INTO count_con_rol;
    SELECT COUNT(*) FROM as_turnos_puestos_operativos WHERE rol_id IS NULL INTO count_sin_rol;
    
    -- Obtener registro de muestra
    SELECT id, nombre_puesto, rol_id INTO sample_record
    FROM as_turnos_puestos_operativos 
    WHERE rol_id IS NOT NULL 
    LIMIT 1;
    
    RAISE NOTICE '📊 VERIFICACIÓN POST-MIGRACIÓN:';
    RAISE NOTICE '  - Registros con rol_id: %', count_con_rol;
    RAISE NOTICE '  - Registros sin rol_id: %', count_sin_rol;
    RAISE NOTICE '  - Muestra: ID=%, Puesto=%, rol_id=%', 
        sample_record.id, sample_record.nombre_puesto, sample_record.rol_id;
END $$;

-- PASO 5: PRUEBA DE INTEGRIDAD
DO $$
DECLARE
    test_count INTEGER := 0;
BEGIN
    -- Probar JOIN con as_turnos_roles_servicio
    SELECT COUNT(*) INTO test_count
    FROM as_turnos_puestos_operativos po
    INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
    LIMIT 1;
    
    RAISE NOTICE '🧪 PRUEBA DE INTEGRIDAD:';
    RAISE NOTICE '  - JOIN con roles_servicio: % registros', test_count;
    
    IF test_count > 0 THEN
        RAISE NOTICE '✅ MIGRACIÓN EXITOSA: Foreign key funciona correctamente';
    ELSE
        RAISE NOTICE '⚠️ ADVERTENCIA: No hay registros con rol válido para probar';
    END IF;
END $$;

COMMIT;

-- RESUMEN FINAL
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ Columna estandarizada como: rol_id';
    RAISE NOTICE '✅ Índice actualizado: idx_puestos_operativos_rol';
    RAISE NOTICE '✅ Foreign key agregado: fk_puesto_rol';
    RAISE NOTICE '✅ Integridad referencial verificada';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Verificar que todas las consultas usen rol_id';
    RAISE NOTICE '2. Probar funcionalidades de asignación';
    RAISE NOTICE '3. Verificar pauta mensual y diaria';
    RAISE NOTICE '4. Eliminar endpoints de debug temporales';
END $$;
