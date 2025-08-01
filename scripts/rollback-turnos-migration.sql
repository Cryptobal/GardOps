-- =====================================================
-- SCRIPT DE ROLLBACK: MIGRACIÓN DE TABLAS DE TURNOS
-- =====================================================
-- Objetivo: Revertir la renombración de tablas de turnos
-- Fecha: 29 de Julio 2025
-- Sistema: GardOps
-- ⚠️ ADVERTENCIA: Solo usar si es necesario revertir los cambios

-- =====================================================
-- PASO 1: VERIFICAR ESTADO ACTUAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '⚠️ INICIANDO ROLLBACK DE MIGRACIÓN DE TURNOS...';
    RAISE NOTICE '=====================================';
    
    -- Verificar que las tablas renombradas existen
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'as_turnos_roles_servicio') THEN
        RAISE EXCEPTION 'No se puede hacer rollback: tabla as_turnos_roles_servicio no existe';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'as_turnos_configuracion') THEN
        RAISE EXCEPTION 'No se puede hacer rollback: tabla as_turnos_configuracion no existe';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'as_turnos_requisitos') THEN
        RAISE EXCEPTION 'No se puede hacer rollback: tabla as_turnos_requisitos no existe';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'as_turnos_ppc') THEN
        RAISE EXCEPTION 'No se puede hacer rollback: tabla as_turnos_ppc no existe';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'as_turnos_asignaciones') THEN
        RAISE EXCEPTION 'No se puede hacer rollback: tabla as_turnos_asignaciones no existe';
    END IF;
    
    RAISE NOTICE '✅ Todas las tablas renombradas existen, procediendo con rollback...';
END $$;

-- =====================================================
-- PASO 2: REVERTIR RENOMBRACIÓN DE TABLAS
-- =====================================================

-- Revertir as_turnos_roles_servicio
ALTER TABLE as_turnos_roles_servicio RENAME TO roles_servicio;
RAISE NOTICE '✅ as_turnos_roles_servicio → roles_servicio';

-- Revertir as_turnos_configuracion
ALTER TABLE as_turnos_configuracion RENAME TO turnos_instalacion;
RAISE NOTICE '✅ as_turnos_configuracion → turnos_instalacion';

-- Revertir as_turnos_requisitos
ALTER TABLE as_turnos_requisitos RENAME TO requisitos_puesto;
RAISE NOTICE '✅ as_turnos_requisitos → requisitos_puesto';

-- Revertir as_turnos_ppc
ALTER TABLE as_turnos_ppc RENAME TO puestos_por_cubrir;
RAISE NOTICE '✅ as_turnos_ppc → puestos_por_cubrir';

-- Revertir as_turnos_asignaciones
ALTER TABLE as_turnos_asignaciones RENAME TO asignaciones_guardias;
RAISE NOTICE '✅ as_turnos_asignaciones → asignaciones_guardias';

-- =====================================================
-- PASO 3: REVERTIR FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Revertir foreign keys en turnos_instalacion
DO $$
BEGIN
    -- Revertir constraint de rol_servicio_id
    ALTER TABLE turnos_instalacion 
    RENAME CONSTRAINT as_turnos_configuracion_rol_servicio_id_fkey 
    TO turnos_instalacion_rol_servicio_id_fkey;
    
    -- Revertir constraint de instalacion_id
    ALTER TABLE turnos_instalacion 
    RENAME CONSTRAINT as_turnos_configuracion_instalacion_id_fkey 
    TO turnos_instalacion_instalacion_id_fkey;
    
    RAISE NOTICE '✅ Foreign keys de turnos_instalacion revertidas';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'ℹ️ Algunas foreign keys no existen, continuando...';
END $$;

-- Revertir foreign keys en requisitos_puesto
DO $$
BEGIN
    -- Revertir constraint de instalacion_id
    ALTER TABLE requisitos_puesto 
    RENAME CONSTRAINT as_turnos_requisitos_instalacion_id_fkey 
    TO requisitos_puesto_instalacion_id_fkey;
    
    -- Revertir constraint de rol_servicio_id
    ALTER TABLE requisitos_puesto 
    RENAME CONSTRAINT as_turnos_requisitos_rol_servicio_id_fkey 
    TO requisitos_puesto_rol_servicio_id_fkey;
    
    RAISE NOTICE '✅ Foreign keys de requisitos_puesto revertidas';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'ℹ️ Algunas foreign keys no existen, continuando...';
END $$;

-- Revertir foreign keys en puestos_por_cubrir
DO $$
BEGIN
    -- Revertir constraint de requisito_puesto_id
    ALTER TABLE puestos_por_cubrir 
    RENAME CONSTRAINT as_turnos_ppc_requisito_puesto_id_fkey 
    TO puestos_por_cubrir_requisito_puesto_id_fkey;
    
    RAISE NOTICE '✅ Foreign keys de puestos_por_cubrir revertidas';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'ℹ️ Algunas foreign keys no existen, continuando...';
END $$;

-- Revertir foreign keys en asignaciones_guardias
DO $$
BEGIN
    -- Revertir constraint de guardia_id
    ALTER TABLE asignaciones_guardias 
    RENAME CONSTRAINT as_turnos_asignaciones_guardia_id_fkey 
    TO asignaciones_guardias_guardia_id_fkey;
    
    -- Revertir constraint de requisito_puesto_id
    ALTER TABLE asignaciones_guardias 
    RENAME CONSTRAINT as_turnos_asignaciones_requisito_puesto_id_fkey 
    TO asignaciones_guardias_requisito_puesto_id_fkey;
    
    RAISE NOTICE '✅ Foreign keys de asignaciones_guardias revertidas';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'ℹ️ Algunas foreign keys no existen, continuando...';
END $$;

-- =====================================================
-- PASO 4: REVERTIR FOREIGN KEY REFERENCES
-- =====================================================

-- Revertir referencias en puestos_por_cubrir para apuntar a requisitos_puesto
DO $$
BEGIN
    -- Eliminar la foreign key existente
    ALTER TABLE puestos_por_cubrir DROP CONSTRAINT IF EXISTS as_turnos_ppc_requisito_puesto_id_fkey;
    
    -- Crear nueva foreign key con el nombre original
    ALTER TABLE puestos_por_cubrir 
    ADD CONSTRAINT puestos_por_cubrir_requisito_puesto_id_fkey 
    FOREIGN KEY (requisito_puesto_id) REFERENCES requisitos_puesto(id);
    
    RAISE NOTICE '✅ Foreign key de puestos_por_cubrir revertida para referenciar requisitos_puesto';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'ℹ️ Error al revertir foreign key de puestos_por_cubrir';
END $$;

-- Revertir referencias en asignaciones_guardias para apuntar a requisitos_puesto
DO $$
BEGIN
    -- Eliminar la foreign key existente
    ALTER TABLE asignaciones_guardias DROP CONSTRAINT IF EXISTS as_turnos_asignaciones_requisito_puesto_id_fkey;
    
    -- Crear nueva foreign key con el nombre original
    ALTER TABLE asignaciones_guardias 
    ADD CONSTRAINT asignaciones_guardias_requisito_puesto_id_fkey 
    FOREIGN KEY (requisito_puesto_id) REFERENCES requisitos_puesto(id);
    
    RAISE NOTICE '✅ Foreign key de asignaciones_guardias revertida para referenciar requisitos_puesto';
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'ℹ️ Error al revertir foreign key de asignaciones_guardias';
END $$;

-- =====================================================
-- PASO 5: RECREAR TABLA puestos_operativos (SI ES NECESARIO)
-- =====================================================

-- Solo recrear si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'puestos_operativos') THEN
        
        -- Crear tabla puestos_operativos
        CREATE TABLE puestos_operativos (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            descripcion TEXT,
            instalacion_id UUID REFERENCES instalaciones(id),
            estado VARCHAR(20) DEFAULT 'Activo',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Agregar columna puesto_operativo_id a requisitos_puesto
        ALTER TABLE requisitos_puesto ADD COLUMN puesto_operativo_id INTEGER REFERENCES puestos_operativos(id);
        
        RAISE NOTICE '✅ Tabla puestos_operativos recreada';
        RAISE NOTICE '✅ Columna puesto_operativo_id agregada a requisitos_puesto';
        
    ELSE
        RAISE NOTICE 'ℹ️ Tabla puestos_operativos ya existe';
    END IF;
END $$;

-- =====================================================
-- PASO 6: VERIFICAR ROLLBACK
-- =====================================================

-- Verificar que las tablas originales existen
DO $$
DECLARE
    table_name TEXT;
    table_count INTEGER := 0;
    expected_tables TEXT[] := ARRAY[
        'roles_servicio',
        'turnos_instalacion',
        'requisitos_puesto',
        'puestos_por_cubrir',
        'asignaciones_guardias'
    ];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICANDO ROLLBACK...';
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
    RAISE NOTICE '📊 Tablas originales encontradas: % de %', table_count, array_length(expected_tables, 1);
    
    IF table_count = array_length(expected_tables, 1) THEN
        RAISE NOTICE '✅ Rollback completado correctamente';
    ELSE
        RAISE NOTICE '⚠️ Algunas tablas no fueron revertidas';
    END IF;
END $$;

-- =====================================================
-- RESUMEN DE ROLLBACK
-- =====================================================
/*
✅ CAMBIOS REVERTIDOS:

1. RENOMBRACIONES REVERTIDAS:
   - as_turnos_roles_servicio → roles_servicio
   - as_turnos_configuracion → turnos_instalacion
   - as_turnos_requisitos → requisitos_puesto
   - as_turnos_ppc → puestos_por_cubrir
   - as_turnos_asignaciones → asignaciones_guardias

2. FOREIGN KEYS REVERTIDAS:
   - Constraints renombradas a nombres originales
   - Referencias actualizadas para apuntar a tablas originales

3. TABLA RECREADA (SI NO EXISTÍA):
   - puestos_operativos recreada
   - Columna puesto_operativo_id agregada a requisitos_puesto

✅ RESULTADO:
   - Sistema vuelve al estado anterior a la migración
   - Todas las tablas con nombres originales
   - Integridad referencial restaurada
*/ 