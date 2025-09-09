-- =====================================================
-- NORMALIZACIÓN DE MOTIVOS EN PPCs
-- =====================================================
-- Script para estandarizar los valores del campo 'motivo' 
-- en las tablas puestos_por_cubrir y as_turnos_ppc
-- =====================================================

-- Configuración de transacción
BEGIN;

-- =====================================================
-- PASO 1: CREAR BACKUPS DE SEGURIDAD
-- =====================================================

-- Backup de puestos_por_cubrir
CREATE TABLE IF NOT EXISTS puestos_por_cubrir_backup_normalizacion AS 
SELECT *, NOW() as backup_timestamp FROM puestos_por_cubrir;

-- Backup de as_turnos_ppc (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'as_turnos_ppc') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS as_turnos_ppc_backup_normalizacion AS 
                 SELECT *, NOW() as backup_timestamp FROM as_turnos_ppc';
    END IF;
END $$;

-- =====================================================
-- PASO 2: VERIFICAR VALORES ACTUALES
-- =====================================================

-- Mostrar valores actuales en puestos_por_cubrir
SELECT 'puestos_por_cubrir' as tabla, motivo, COUNT(*) as cantidad
FROM puestos_por_cubrir 
GROUP BY motivo
ORDER BY motivo;

-- Mostrar valores actuales en as_turnos_ppc (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'as_turnos_ppc') THEN
        RAISE NOTICE 'Valores en as_turnos_ppc:';
        FOR r IN 
            EXECUTE 'SELECT motivo, COUNT(*) as cantidad 
                     FROM as_turnos_ppc 
                     GROUP BY motivo 
                     ORDER BY motivo'
        LOOP
            RAISE NOTICE '  %: % registros', r.motivo, r.cantidad;
        END LOOP;
    END IF;
END $$;

-- =====================================================
-- PASO 3: MIGRACIÓN DE VALORES EN puestos_por_cubrir
-- =====================================================

-- Actualizar valores según el mapeo definido
UPDATE puestos_por_cubrir 
SET motivo = 'falta_con_aviso' 
WHERE motivo = 'falta_aviso';

UPDATE puestos_por_cubrir 
SET motivo = 'ausencia_temporal' 
WHERE motivo IN ('licencia', 'permiso', 'inasistencia');

UPDATE puestos_por_cubrir 
SET motivo = 'renuncia' 
WHERE motivo = 'desvinculacion';

-- =====================================================
-- PASO 4: MIGRACIÓN DE VALORES EN as_turnos_ppc (si existe)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'as_turnos_ppc') THEN
        -- Actualizar valores en as_turnos_ppc
        EXECUTE 'UPDATE as_turnos_ppc SET motivo = ''falta_con_aviso'' WHERE motivo = ''falta_aviso''';
        EXECUTE 'UPDATE as_turnos_ppc SET motivo = ''ausencia_temporal'' WHERE motivo IN (''licencia'', ''permiso'', ''inasistencia'')';
        EXECUTE 'UPDATE as_turnos_ppc SET motivo = ''renuncia'' WHERE motivo = ''desvinculacion''';
    END IF;
END $$;

-- =====================================================
-- PASO 5: VERIFICAR MIGRACIÓN
-- =====================================================

-- Verificar valores después de la migración
SELECT 'puestos_por_cubrir DESPUÉS' as tabla, motivo, COUNT(*) as cantidad
FROM puestos_por_cubrir 
GROUP BY motivo
ORDER BY motivo;

-- Verificar que no hay valores extraños
DO $$
DECLARE
    valores_invalidos text;
BEGIN
    -- Verificar puestos_por_cubrir
    SELECT string_agg(DISTINCT motivo, ', ') INTO valores_invalidos
    FROM puestos_por_cubrir 
    WHERE motivo NOT IN ('falta_asignacion', 'falta_con_aviso', 'ausencia_temporal', 'renuncia');
    
    IF valores_invalidos IS NOT NULL THEN
        RAISE EXCEPTION 'Valores inválidos encontrados en puestos_por_cubrir: %', valores_invalidos;
    END IF;
    
    -- Verificar as_turnos_ppc si existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'as_turnos_ppc') THEN
        SELECT string_agg(DISTINCT motivo, ', ') INTO valores_invalidos
        FROM as_turnos_ppc 
        WHERE motivo NOT IN ('falta_asignacion', 'falta_con_aviso', 'ausencia_temporal', 'renuncia');
        
        IF valores_invalidos IS NOT NULL THEN
            RAISE EXCEPTION 'Valores inválidos encontrados en as_turnos_ppc: %', valores_invalidos;
        END IF;
    END IF;
    
    RAISE NOTICE '✅ Migración verificada exitosamente';
END $$;

-- =====================================================
-- PASO 6: ACTUALIZAR CONSTRAINTS
-- =====================================================

-- Eliminar constraints antiguas si existen
ALTER TABLE puestos_por_cubrir DROP CONSTRAINT IF EXISTS puestos_por_cubrir_motivo_check;

-- Agregar nueva constraint estandarizada
ALTER TABLE puestos_por_cubrir ADD CONSTRAINT puestos_por_cubrir_motivo_check 
CHECK (motivo IN ('falta_asignacion', 'falta_con_aviso', 'ausencia_temporal', 'renuncia'));

-- Actualizar constraint en as_turnos_ppc si existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'as_turnos_ppc') THEN
        EXECUTE 'ALTER TABLE as_turnos_ppc DROP CONSTRAINT IF EXISTS as_turnos_ppc_motivo_check';
        EXECUTE 'ALTER TABLE as_turnos_ppc ADD CONSTRAINT as_turnos_ppc_motivo_check 
                 CHECK (motivo IN (''falta_asignacion'', ''falta_con_aviso'', ''ausencia_temporal'', ''renuncia''))';
    END IF;
END $$;

-- =====================================================
-- PASO 7: VERIFICACIÓN FINAL
-- =====================================================

-- Probar que las constraints funcionan
DO $$
BEGIN
    -- Probar inserción con valores válidos
    BEGIN
        INSERT INTO puestos_por_cubrir (requisito_puesto_id, motivo) 
        VALUES (1, 'falta_asignacion');
        DELETE FROM puestos_por_cubrir WHERE requisito_puesto_id = 1;
        RAISE NOTICE '✅ Constraint funciona correctamente';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Error en constraint: %', SQLERRM;
    END;
    
    -- Probar inserción con valor inválido (debe fallar)
    BEGIN
        INSERT INTO puestos_por_cubrir (requisito_puesto_id, motivo) 
        VALUES (1, 'valor_invalido');
        RAISE EXCEPTION '❌ Constraint no está funcionando - permitió valor inválido';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✅ Constraint rechaza valores inválidos correctamente';
    END;
END $$;

-- =====================================================
-- PASO 8: RESUMEN DE LA MIGRACIÓN
-- =====================================================

SELECT 
    'NORMALIZACIÓN COMPLETADA' as estado,
    COUNT(*) as total_registros_migrados,
    'Valores normalizados: falta_asignacion, falta_con_aviso, ausencia_temporal, renuncia' as valores_finales
FROM puestos_por_cubrir;

-- =====================================================
-- INSTRUCCIONES DE ROLLBACK (en caso de problemas)
-- =====================================================

/*
-- Para hacer rollback en caso de problemas:
-- 1. ROLLBACK; (si la transacción aún está activa)
-- 2. O ejecutar manualmente:

-- Restaurar puestos_por_cubrir
TRUNCATE puestos_por_cubrir;
INSERT INTO puestos_por_cubrir 
SELECT id, requisito_puesto_id, cantidad_faltante, motivo, prioridad, 
       fecha_deteccion, fecha_limite_cobertura, estado, observaciones, 
       created_at, updated_at, tenant_id
FROM puestos_por_cubrir_backup_normalizacion;

-- Restaurar as_turnos_ppc (si existe)
-- (ejecutar comandos similares para as_turnos_ppc)

-- Eliminar tablas de backup
DROP TABLE IF EXISTS puestos_por_cubrir_backup_normalizacion;
DROP TABLE IF EXISTS as_turnos_ppc_backup_normalizacion;
*/

-- Confirmar la transacción
COMMIT;

-- =====================================================
-- RESUMEN FINAL
-- =====================================================

SELECT 
    '✅ NORMALIZACIÓN EXITOSA' as resultado,
    'Los motivos de PPC han sido estandarizados' as descripcion,
    'Valores finales: falta_asignacion, falta_con_aviso, ausencia_temporal, renuncia' as valores,
    'Backup creado en: puestos_por_cubrir_backup_normalizacion' as backup; 