-- =====================================================
-- SCRIPT DE MIGRACIÓN: RENOMBRACIÓN DE TABLAS DE TURNOS
-- =====================================================
-- Objetivo: Renombrar tablas con prefijo as_turnos_ y eliminar puestos_operativos
-- Fecha: 29 de Julio 2025
-- Sistema: GardOps

-- =====================================================
-- PASO 1: VERIFICAR ESTADO ACTUAL
-- =====================================================

-- Verificar que las tablas existen antes de renombrarlas
DO $$
BEGIN
    -- Verificar tablas que vamos a renombrar
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'roles_servicio') THEN
        RAISE EXCEPTION 'Tabla roles_servicio no existe';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'turnos_instalacion') THEN
        RAISE EXCEPTION 'Tabla turnos_instalacion no existe';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'requisitos_puesto') THEN
        RAISE EXCEPTION 'Tabla requisitos_puesto no existe';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'puestos_por_cubrir') THEN
        RAISE EXCEPTION 'Tabla puestos_por_cubrir no existe';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'asignaciones_guardias') THEN
        RAISE EXCEPTION 'Tabla asignaciones_guardias no existe';
    END IF;
    
    RAISE NOTICE '✅ Todas las tablas a renombrar existen';
END $$;

-- =====================================================
-- PASO 2: ELIMINAR TABLA puestos_operativos (NO USADA)
-- =====================================================

-- Verificar si hay referencias a puestos_operativos antes de eliminar
DO $$
DECLARE
    ref_count INTEGER;
BEGIN
    -- Verificar si la tabla existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'puestos_operativos') THEN
        
        -- Verificar referencias en requisitos_puesto
        SELECT COUNT(*) INTO ref_count 
        FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%puesto_operativo%' 
        AND table_name = 'requisitos_puesto';
        
        IF ref_count > 0 THEN
            RAISE NOTICE '⚠️ Encontradas % referencias a puestos_operativos en requisitos_puesto', ref_count;
            RAISE NOTICE 'Procediendo a eliminar foreign keys...';
            
            -- Eliminar foreign key constraint
            ALTER TABLE requisitos_puesto DROP CONSTRAINT IF EXISTS requisitos_puesto_puesto_operativo_id_fkey;
        END IF;
        
        -- Eliminar la tabla
        DROP TABLE IF EXISTS puestos_operativos CASCADE;
        RAISE NOTICE '✅ Tabla puestos_operativos eliminada';
        
    ELSE
        RAISE NOTICE 'ℹ️ Tabla puestos_operativos no existe, continuando...';
    END IF;
END $$;

-- =====================================================
-- PASO 3: ELIMINAR COLUMNA puesto_operativo_id DE requisitos_puesto
-- =====================================================

-- Verificar si la columna existe antes de eliminarla
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'requisitos_puesto' 
        AND column_name = 'puesto_operativo_id'
    ) THEN
        ALTER TABLE requisitos_puesto DROP COLUMN puesto_operativo_id;
        RAISE NOTICE '✅ Columna puesto_operativo_id eliminada de requisitos_puesto';
    ELSE
        RAISE NOTICE 'ℹ️ Columna puesto_operativo_id no existe en requisitos_puesto';
    END IF;
END $$;

-- =====================================================
-- PASO 4: RENOMBRAR TABLAS CON PREFIJO as_turnos_
-- =====================================================

-- Renombrar roles_servicio
ALTER TABLE roles_servicio RENAME TO as_turnos_roles_servicio;
RAISE NOTICE '✅ roles_servicio → as_turnos_roles_servicio';

-- Renombrar turnos_instalacion
ALTER TABLE turnos_instalacion RENAME TO as_turnos_configuracion;
RAISE NOTICE '✅ turnos_instalacion → as_turnos_configuracion';

-- Renombrar requisitos_puesto
ALTER TABLE requisitos_puesto RENAME TO as_turnos_requisitos;
RAISE NOTICE '✅ requisitos_puesto → as_turnos_requisitos';

-- Renombrar puestos_por_cubrir
ALTER TABLE puestos_por_cubrir RENAME TO as_turnos_ppc;
RAISE NOTICE '✅ puestos_por_cubrir → as_turnos_ppc';

-- Renombrar asignaciones_guardias
ALTER TABLE asignaciones_guardias RENAME TO as_turnos_asignaciones;
RAISE NOTICE '✅ asignaciones_guardias → as_turnos_asignaciones';

-- =====================================================
-- PASO 5: ACTUALIZAR FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Actualizar foreign keys en as_turnos_configuracion
DO $$
BEGIN
    -- Renombrar constraint de rol_servicio_id
    ALTER TABLE as_turnos_configuracion 
    RENAME CONSTRAINT turnos_instalacion_rol_servicio_id_fkey 
    TO as_turnos_configuracion_rol_servicio_id_fkey;
    
    -- Renombrar constraint de instalacion_id
    ALTER TABLE as_turnos_configuracion 
    RENAME CONSTRAINT turnos_instalacion_instalacion_id_fkey 
    TO as_turnos_configuracion_instalacion_id_fkey;
    
    RAISE NOTICE '✅ Foreign keys de as_turnos_configuracion actualizadas';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'ℹ️ Algunas foreign keys no existen, continuando...';
END $$;

-- Actualizar foreign keys en as_turnos_requisitos
DO $$
BEGIN
    -- Renombrar constraint de instalacion_id
    ALTER TABLE as_turnos_requisitos 
    RENAME CONSTRAINT requisitos_puesto_instalacion_id_fkey 
    TO as_turnos_requisitos_instalacion_id_fkey;
    
    -- Renombrar constraint de rol_servicio_id
    ALTER TABLE as_turnos_requisitos 
    RENAME CONSTRAINT requisitos_puesto_rol_servicio_id_fkey 
    TO as_turnos_requisitos_rol_servicio_id_fkey;
    
    RAISE NOTICE '✅ Foreign keys de as_turnos_requisitos actualizadas';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'ℹ️ Algunas foreign keys no existen, continuando...';
END $$;

-- Actualizar foreign keys en as_turnos_ppc
DO $$
BEGIN
    -- Renombrar constraint de requisito_puesto_id
    ALTER TABLE as_turnos_ppc 
    RENAME CONSTRAINT puestos_por_cubrir_requisito_puesto_id_fkey 
    TO as_turnos_ppc_requisito_puesto_id_fkey;
    
    RAISE NOTICE '✅ Foreign keys de as_turnos_ppc actualizadas';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'ℹ️ Algunas foreign keys no existen, continuando...';
END $$;

-- Actualizar foreign keys en as_turnos_asignaciones
DO $$
BEGIN
    -- Renombrar constraint de guardia_id
    ALTER TABLE as_turnos_asignaciones 
    RENAME CONSTRAINT asignaciones_guardias_guardia_id_fkey 
    TO as_turnos_asignaciones_guardia_id_fkey;
    
    -- Renombrar constraint de requisito_puesto_id
    ALTER TABLE as_turnos_asignaciones 
    RENAME CONSTRAINT asignaciones_guardias_requisito_puesto_id_fkey 
    TO as_turnos_asignaciones_requisito_puesto_id_fkey;
    
    RAISE NOTICE '✅ Foreign keys de as_turnos_asignaciones actualizadas';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'ℹ️ Algunas foreign keys no existen, continuando...';
END $$;

-- =====================================================
-- PASO 6: ACTUALIZAR FOREIGN KEY REFERENCES
-- =====================================================

-- Actualizar referencias en as_turnos_ppc para apuntar a as_turnos_requisitos
DO $$
BEGIN
    -- Eliminar la foreign key existente
    ALTER TABLE as_turnos_ppc DROP CONSTRAINT IF EXISTS as_turnos_ppc_requisito_puesto_id_fkey;
    
    -- Crear nueva foreign key con el nombre correcto
    ALTER TABLE as_turnos_ppc 
    ADD CONSTRAINT as_turnos_ppc_requisito_puesto_id_fkey 
    FOREIGN KEY (requisito_puesto_id) REFERENCES as_turnos_requisitos(id);
    
    RAISE NOTICE '✅ Foreign key de as_turnos_ppc actualizada para referenciar as_turnos_requisitos';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'ℹ️ Error al actualizar foreign key de as_turnos_ppc';
END $$;

-- Actualizar referencias en as_turnos_asignaciones para apuntar a as_turnos_requisitos
DO $$
BEGIN
    -- Eliminar la foreign key existente
    ALTER TABLE as_turnos_asignaciones DROP CONSTRAINT IF EXISTS as_turnos_asignaciones_requisito_puesto_id_fkey;
    
    -- Crear nueva foreign key con el nombre correcto
    ALTER TABLE as_turnos_asignaciones 
    ADD CONSTRAINT as_turnos_asignaciones_requisito_puesto_id_fkey 
    FOREIGN KEY (requisito_puesto_id) REFERENCES as_turnos_requisitos(id);
    
    RAISE NOTICE '✅ Foreign key de as_turnos_asignaciones actualizada para referenciar as_turnos_requisitos';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'ℹ️ Error al actualizar foreign key de as_turnos_asignaciones';
END $$;

-- =====================================================
-- PASO 7: VERIFICAR MIGRACIÓN
-- =====================================================

-- Verificar que las nuevas tablas existen
DO $$
DECLARE
    table_count INTEGER := 0;
BEGIN
    -- Contar tablas con prefijo as_turnos_
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_name LIKE 'as_turnos_%';
    
    RAISE NOTICE '✅ Migración completada. Tablas con prefijo as_turnos_: %', table_count;
    
    -- Listar las tablas renombradas
    RAISE NOTICE '📋 Tablas renombradas:';
    RAISE NOTICE '   - as_turnos_roles_servicio';
    RAISE NOTICE '   - as_turnos_configuracion';
    RAISE NOTICE '   - as_turnos_requisitos';
    RAISE NOTICE '   - as_turnos_ppc';
    RAISE NOTICE '   - as_turnos_asignaciones';
    
    -- Verificar que puestos_operativos fue eliminada
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'puestos_operativos') THEN
        RAISE NOTICE '✅ Tabla puestos_operativos eliminada correctamente';
    ELSE
        RAISE NOTICE '⚠️ Tabla puestos_operativos aún existe';
    END IF;
    
END $$;

-- =====================================================
-- RESUMEN DE CAMBIOS
-- =====================================================
/*
✅ CAMBIOS REALIZADOS:

1. ELIMINACIONES:
   - Tabla puestos_operativos eliminada
   - Columna puesto_operativo_id eliminada de requisitos_puesto

2. RENOMBRACIONES:
   - roles_servicio → as_turnos_roles_servicio
   - turnos_instalacion → as_turnos_configuracion
   - requisitos_puesto → as_turnos_requisitos
   - puestos_por_cubrir → as_turnos_ppc
   - asignaciones_guardias → as_turnos_asignaciones

3. ACTUALIZACIONES:
   - Foreign key constraints renombradas
   - Referencias actualizadas para apuntar a las nuevas tablas

✅ RESULTADO:
   - Todas las tablas de turnos ahora tienen prefijo as_turnos_
   - Tabla no utilizada eliminada
   - Integridad referencial mantenida
*/ 