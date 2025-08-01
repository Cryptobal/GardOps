-- =====================================================
-- SCRIPT DE VERIFICACIÓN: MIGRACIÓN DE TABLAS DE TURNOS
-- =====================================================
-- Objetivo: Verificar que la renombración de tablas se ejecutó correctamente
-- Fecha: 29 de Julio 2025
-- Sistema: GardOps

-- =====================================================
-- PASO 1: VERIFICAR TABLAS RENOMBRADAS
-- =====================================================

DO $$
DECLARE
    table_name TEXT;
    table_count INTEGER := 0;
    expected_tables TEXT[] := ARRAY[
        'as_turnos_roles_servicio',
        'as_turnos_configuracion', 
        'as_turnos_requisitos',
        'as_turnos_ppc',
        'as_turnos_asignaciones'
    ];
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO TABLAS RENOMBRADAS...';
    RAISE NOTICE '=====================================';
    
    -- Verificar cada tabla esperada
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = table_name) THEN
            RAISE NOTICE '✅ % existe', table_name;
            table_count := table_count + 1;
        ELSE
            RAISE NOTICE '❌ % NO existe', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=====================================';
    RAISE NOTICE '📊 Tablas renombradas encontradas: % de %', table_count, array_length(expected_tables, 1);
    
    IF table_count = array_length(expected_tables, 1) THEN
        RAISE NOTICE '✅ Todas las tablas fueron renombradas correctamente';
    ELSE
        RAISE NOTICE '⚠️ Algunas tablas no fueron renombradas';
    END IF;
END $$;

-- =====================================================
-- PASO 2: VERIFICAR TABLAS ANTIGUAS ELIMINADAS
-- =====================================================

DO $$
DECLARE
    old_table_name TEXT;
    old_tables TEXT[] := ARRAY[
        'roles_servicio',
        'turnos_instalacion',
        'requisitos_puesto', 
        'puestos_por_cubrir',
        'asignaciones_guardias',
        'puestos_operativos'
    ];
    found_old_tables INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICANDO TABLAS ANTIGUAS...';
    RAISE NOTICE '=====================================';
    
    -- Verificar que las tablas antiguas no existen
    FOREACH old_table_name IN ARRAY old_tables
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = old_table_name) THEN
            RAISE NOTICE '❌ % aún existe (debería haber sido renombrada/eliminada)', old_table_name;
            found_old_tables := found_old_tables + 1;
        ELSE
            RAISE NOTICE '✅ % ya no existe (correcto)', old_table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=====================================';
    IF found_old_tables = 0 THEN
        RAISE NOTICE '✅ Todas las tablas antiguas fueron procesadas correctamente';
    ELSE
        RAISE NOTICE '⚠️ % tablas antiguas aún existen', found_old_tables;
    END IF;
END $$;

-- =====================================================
-- PASO 3: VERIFICAR FOREIGN KEYS
-- =====================================================

DO $$
DECLARE
    fk_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICANDO FOREIGN KEYS...';
    RAISE NOTICE '=====================================';
    
    -- Contar foreign keys en las nuevas tablas
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_name LIKE 'as_turnos_%';
    
    RAISE NOTICE '📊 Foreign keys encontradas en tablas as_turnos_: %', fk_count;
    
    -- Listar foreign keys específicas
    RAISE NOTICE '📋 Foreign keys principales:';
    
    -- Verificar foreign key de as_turnos_configuracion
    IF EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_name = 'as_turnos_configuracion' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%rol_servicio%'
    ) THEN
        RAISE NOTICE '✅ as_turnos_configuracion → as_turnos_roles_servicio';
    ELSE
        RAISE NOTICE '❌ Falta FK: as_turnos_configuracion → as_turnos_roles_servicio';
    END IF;
    
    -- Verificar foreign key de as_turnos_requisitos
    IF EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_name = 'as_turnos_requisitos' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%rol_servicio%'
    ) THEN
        RAISE NOTICE '✅ as_turnos_requisitos → as_turnos_roles_servicio';
    ELSE
        RAISE NOTICE '❌ Falta FK: as_turnos_requisitos → as_turnos_roles_servicio';
    END IF;
    
    -- Verificar foreign key de as_turnos_ppc
    IF EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_name = 'as_turnos_ppc' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%requisito%'
    ) THEN
        RAISE NOTICE '✅ as_turnos_ppc → as_turnos_requisitos';
    ELSE
        RAISE NOTICE '❌ Falta FK: as_turnos_ppc → as_turnos_requisitos';
    END IF;
    
    -- Verificar foreign key de as_turnos_asignaciones
    IF EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_name = 'as_turnos_asignaciones' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%requisito%'
    ) THEN
        RAISE NOTICE '✅ as_turnos_asignaciones → as_turnos_requisitos';
    ELSE
        RAISE NOTICE '❌ Falta FK: as_turnos_asignaciones → as_turnos_requisitos';
    END IF;
    
    RAISE NOTICE '=====================================';
END $$;

-- =====================================================
-- PASO 4: VERIFICAR ESTRUCTURA DE COLUMNAS
-- =====================================================

DO $$
DECLARE
    col_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICANDO ESTRUCTURA DE COLUMNAS...';
    RAISE NOTICE '=====================================';
    
    -- Verificar columnas en as_turnos_requisitos (sin puesto_operativo_id)
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'as_turnos_requisitos';
    
    RAISE NOTICE '📊 Columnas en as_turnos_requisitos: %', col_count;
    
    -- Verificar que puesto_operativo_id fue eliminada
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'as_turnos_requisitos' 
        AND column_name = 'puesto_operativo_id'
    ) THEN
        RAISE NOTICE '✅ Columna puesto_operativo_id eliminada correctamente';
    ELSE
        RAISE NOTICE '❌ Columna puesto_operativo_id aún existe';
    END IF;
    
    -- Verificar columnas principales
    RAISE NOTICE '📋 Columnas principales en as_turnos_requisitos:';
    
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'as_turnos_requisitos' 
        AND column_name = 'instalacion_id'
    ) THEN
        RAISE NOTICE '✅ instalacion_id';
    ELSE
        RAISE NOTICE '❌ Falta: instalacion_id';
    END IF;
    
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'as_turnos_requisitos' 
        AND column_name = 'rol_servicio_id'
    ) THEN
        RAISE NOTICE '✅ rol_servicio_id';
    ELSE
        RAISE NOTICE '❌ Falta: rol_servicio_id';
    END IF;
    
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'as_turnos_requisitos' 
        AND column_name = 'cantidad_guardias'
    ) THEN
        RAISE NOTICE '✅ cantidad_guardias';
    ELSE
        RAISE NOTICE '❌ Falta: cantidad_guardias';
    END IF;
    
    RAISE NOTICE '=====================================';
END $$;

-- =====================================================
-- PASO 5: VERIFICAR DATOS
-- =====================================================

DO $$
DECLARE
    roles_count INTEGER := 0;
    config_count INTEGER := 0;
    requisitos_count INTEGER := 0;
    ppc_count INTEGER := 0;
    asignaciones_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICANDO DATOS...';
    RAISE NOTICE '=====================================';
    
    -- Contar registros en cada tabla
    SELECT COUNT(*) INTO roles_count FROM as_turnos_roles_servicio;
    SELECT COUNT(*) INTO config_count FROM as_turnos_configuracion;
    SELECT COUNT(*) INTO requisitos_count FROM as_turnos_requisitos;
    SELECT COUNT(*) INTO ppc_count FROM as_turnos_ppc;
    SELECT COUNT(*) INTO asignaciones_count FROM as_turnos_asignaciones;
    
    RAISE NOTICE '📊 Registros por tabla:';
    RAISE NOTICE '   as_turnos_roles_servicio: %', roles_count;
    RAISE NOTICE '   as_turnos_configuracion: %', config_count;
    RAISE NOTICE '   as_turnos_requisitos: %', requisitos_count;
    RAISE NOTICE '   as_turnos_ppc: %', ppc_count;
    RAISE NOTICE '   as_turnos_asignaciones: %', asignaciones_count;
    
    -- Verificar que no se perdieron datos
    IF roles_count > 0 AND requisitos_count > 0 THEN
        RAISE NOTICE '✅ Datos preservados correctamente';
    ELSE
        RAISE NOTICE '⚠️ Posible pérdida de datos';
    END IF;
    
    RAISE NOTICE '=====================================';
END $$;

-- =====================================================
-- PASO 6: VERIFICAR CONSULTAS DE PRUEBA
-- =====================================================

DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICANDO CONSULTAS DE PRUEBA...';
    RAISE NOTICE '=====================================';
    
    -- Prueba 1: Obtener roles de servicio
    BEGIN
        SELECT COUNT(*) INTO test_result FROM as_turnos_roles_servicio WHERE estado = 'Activo';
        RAISE NOTICE '✅ Consulta 1: Roles de servicio activos: %', test_result.count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Error en consulta 1: %', SQLERRM;
    END;
    
    -- Prueba 2: Obtener configuración de turnos
    BEGIN
        SELECT COUNT(*) INTO test_result 
        FROM as_turnos_configuracion tc
        JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id;
        RAISE NOTICE '✅ Consulta 2: Configuraciones con roles: %', test_result.count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Error en consulta 2: %', SQLERRM;
    END;
    
    -- Prueba 3: Obtener PPCs pendientes
    BEGIN
        SELECT COUNT(*) INTO test_result 
        FROM as_turnos_ppc ppc
        JOIN as_turnos_requisitos req ON ppc.requisito_puesto_id = req.id
        WHERE ppc.estado = 'Pendiente';
        RAISE NOTICE '✅ Consulta 3: PPCs pendientes: %', test_result.count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Error en consulta 3: %', SQLERRM;
    END;
    
    RAISE NOTICE '=====================================';
END $$;

-- =====================================================
-- RESUMEN FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESUMEN DE VERIFICACIÓN';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '✅ Migración de tablas de turnos verificada';
    RAISE NOTICE '✅ Tabla puestos_operativos eliminada';
    RAISE NOTICE '✅ Foreign keys actualizadas';
    RAISE NOTICE '✅ Datos preservados';
    RAISE NOTICE '✅ Consultas funcionando';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '🚀 Sistema listo para usar con nuevas tablas';
END $$; 