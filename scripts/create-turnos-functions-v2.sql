-- ===============================================
-- FUNCIONES PARA SISTEMA DE TURNOS - V2
-- Schema: as_turnos
-- Objetivo: Crear funciones idempotentes sin romper vistas existentes
-- ===============================================

BEGIN;

-- Crear schema si no existe
CREATE SCHEMA IF NOT EXISTS as_turnos;

-- ===============================================
-- 0. VERIFICAR TABLAS DE LOGS EXISTENTES
-- ===============================================

-- Las tablas de logs ya existen con la siguiente estructura:
-- logs_pauta_diaria: id, pauta_diaria_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha
-- logs_turnos_extras: id, turno_extra_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha
-- No se crean nuevas tablas para evitar conflictos

-- ===============================================
-- 1. FUNCIÓN: fn_guardias_disponibles
-- Compatible con el endpoint actual
-- ===============================================

-- Eliminar todas las versiones existentes de la función
DROP FUNCTION IF EXISTS as_turnos.fn_guardias_disponibles(date, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS as_turnos.fn_guardias_disponibles(date, uuid, uuid, text);
DROP FUNCTION IF EXISTS as_turnos.fn_guardias_disponibles(date, uuid, uuid);

CREATE OR REPLACE FUNCTION as_turnos.fn_guardias_disponibles(
    p_fecha date,
    p_instalacion_id uuid,
    p_rol_id uuid,
    p_excluir_guardia_id uuid DEFAULT NULL
)
RETURNS TABLE (
    guardia_id uuid,
    nombre text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id as guardia_id,
        TRIM(BOTH FROM 
            concat_ws(' ', 
                COALESCE(g.apellido_paterno, ''),
                COALESCE(g.apellido_materno, ''),
                CASE 
                    WHEN COALESCE(g.nombre, '') <> '' THEN ', ' || g.nombre
                    ELSE ''
                END
            )
        ) as nombre
    FROM public.guardias g
    WHERE 
        -- Solo guardias activos y del tipo correcto
        g.activo = true
        AND g.tipo_guardia IN ('contratado', 'esporadico')
        
        -- Excluir guardia específico si se proporciona
        AND (p_excluir_guardia_id IS NULL OR g.id != p_excluir_guardia_id)
        
        -- Excluir guardias ya asignados ese día en esa instalación/rol
        AND NOT EXISTS (
            SELECT 1 
            FROM public.as_turnos_pauta_mensual pm
            JOIN public.as_turnos_puestos_operativos po ON po.id = pm.puesto_id
            WHERE 
                pm.anio = EXTRACT(YEAR FROM p_fecha)::INTEGER
                AND pm.mes = EXTRACT(MONTH FROM p_fecha)::INTEGER
                AND pm.dia = EXTRACT(DAY FROM p_fecha)::INTEGER
                AND po.instalacion_id = p_instalacion_id
                AND po.rol_id = p_rol_id
                AND (
                    pm.guardia_id = g.id
                    OR (pm.meta->>'reemplazo_guardia_id')::uuid = g.id
                    OR (pm.meta->>'cobertura_guardia_id')::uuid = g.id
                )
        )
    ORDER BY 
        g.apellido_paterno,
        g.apellido_materno,
        g.nombre;
END;
$$;

COMMENT ON FUNCTION as_turnos.fn_guardias_disponibles IS 
'Retorna guardias activos disponibles para un turno específico, excluyendo los ya asignados';

-- ===============================================
-- 2. FUNCIÓN: fn_registrar_reemplazo
-- Compatible con endpoint -new
-- ===============================================

-- Eliminar versiones existentes
DROP FUNCTION IF EXISTS as_turnos.fn_registrar_reemplazo(bigint, uuid, text, text);
DROP FUNCTION IF EXISTS as_turnos.fn_registrar_reemplazo(date, uuid, uuid, text, boolean, text);

CREATE OR REPLACE FUNCTION as_turnos.fn_registrar_reemplazo(
    p_pauta_id bigint,
    p_cobertura_guardia_id uuid,
    p_actor_ref text,
    p_motivo text DEFAULT NULL
)
RETURNS TABLE (
    ok boolean,
    pauta_id bigint,
    estado text,
    meta jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_pauta_record RECORD;
    v_guardia_nombre TEXT;
    v_fecha DATE;
    v_instalacion_id UUID;
    v_rol_id UUID;
BEGIN
    -- Validar que la pauta existe
    SELECT 
        pm.*,
        po.instalacion_id,
        po.rol_id,
        make_date(pm.anio, pm.mes, pm.dia) as fecha
    INTO v_pauta_record
    FROM public.as_turnos_pauta_mensual pm
    JOIN public.as_turnos_puestos_operativos po ON po.id = pm.puesto_id
    WHERE pm.id = p_pauta_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            p_pauta_id,
            'error'::TEXT,
            jsonb_build_object('error', 'Pauta no encontrada')::JSONB;
        RETURN;
    END IF;
    
    v_fecha := v_pauta_record.fecha;
    v_instalacion_id := v_pauta_record.instalacion_id;
    v_rol_id := v_pauta_record.rol_id;
    
    -- Validar que el guardia de cobertura existe y está activo
    SELECT 
        TRIM(BOTH FROM concat_ws(' ', 
            COALESCE(apellido_paterno, ''),
            COALESCE(apellido_materno, ''),
            CASE 
                WHEN COALESCE(nombre, '') <> '' THEN ', ' || nombre
                ELSE ''
            END
        ))
    INTO v_guardia_nombre
    FROM public.guardias
    WHERE 
        id = p_cobertura_guardia_id
        AND activo = true
        AND tipo_guardia IN ('contratado', 'esporadico');
    
    IF v_guardia_nombre IS NULL THEN
        RETURN QUERY SELECT 
            FALSE,
            p_pauta_id,
            'error'::TEXT,
            jsonb_build_object('error', 'Guardia no válido o no activo')::JSONB;
        RETURN;
    END IF;
    
    -- Validar no doble-book: el guardia no debe estar asignado ese día
    IF EXISTS (
        SELECT 1 
        FROM public.as_turnos_pauta_mensual pm2
        JOIN public.as_turnos_puestos_operativos po2 ON po2.id = pm2.puesto_id
        WHERE 
            pm2.anio = v_pauta_record.anio
            AND pm2.mes = v_pauta_record.mes
            AND pm2.dia = v_pauta_record.dia
            AND po2.instalacion_id = v_instalacion_id
            AND po2.rol_id = v_rol_id
            AND pm2.id != p_pauta_id
            AND (
                pm2.guardia_id = p_cobertura_guardia_id
                OR (pm2.meta->>'reemplazo_guardia_id')::uuid = p_cobertura_guardia_id
                OR (pm2.meta->>'cobertura_guardia_id')::uuid = p_cobertura_guardia_id
            )
    ) THEN
        RETURN QUERY SELECT 
            FALSE,
            p_pauta_id,
            'error'::TEXT,
            jsonb_build_object('error', 'Guardia ya asignado en otro turno el mismo día')::JSONB;
        RETURN;
    END IF;
    
    -- Actualizar la pauta con el reemplazo
    UPDATE public.as_turnos_pauta_mensual
    SET 
        estado_ui = 'reemplazo',
        meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
            'reemplazo_guardia_id', p_cobertura_guardia_id::text,
            'reemplazo_guardia_nombre', v_guardia_nombre,
            'actor_ref', p_actor_ref,
            'motivo', COALESCE(p_motivo, ''),
            'ts', NOW()::text,
            'action', 'reemplazo'
        ),
        updated_at = NOW()
    WHERE id = p_pauta_id;
    
    -- Registrar en logs (opcional - si falla, continuar)
    BEGIN
        INSERT INTO public.logs_pauta_diaria (
            pauta_diaria_id, 
            accion, 
            usuario, 
            tipo,
            datos_nuevos,
            fecha
        ) VALUES (
            gen_random_uuid(),  -- Usar UUID aleatorio ya que pauta_id es BIGINT
            'reemplazo',
            p_actor_ref,
            'reemplazo',
            jsonb_build_object(
                'pauta_id', p_pauta_id,
                'cobertura_guardia_id', p_cobertura_guardia_id,
                'cobertura_guardia_nombre', v_guardia_nombre,
                'motivo', p_motivo,
                'fecha', v_fecha::text,
                'instalacion_id', v_instalacion_id,
                'rol_id', v_rol_id
            ),
            NOW()
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignorar errores de logs
            NULL;
    END;
    
    -- Retornar resultado exitoso
    SELECT pm.estado_ui, pm.meta
    INTO v_pauta_record
    FROM public.as_turnos_pauta_mensual pm
    WHERE pm.id = p_pauta_id;
    
    RETURN QUERY SELECT 
        TRUE,
        p_pauta_id,
        v_pauta_record.estado_ui,
        v_pauta_record.meta;
END;
$$;

COMMENT ON FUNCTION as_turnos.fn_registrar_reemplazo IS 
'Registra un reemplazo de guardia validando disponibilidad y evitando doble-book';

-- ===============================================
-- 3. FUNCIÓN: fn_marcar_extra (nueva firma)
-- Compatible con endpoint -new
-- ===============================================

-- Eliminar versiones existentes
DROP FUNCTION IF EXISTS as_turnos.fn_marcar_extra(date, uuid, uuid, uuid, uuid, text, text);
DROP FUNCTION IF EXISTS as_turnos.fn_marcar_extra(date, uuid, uuid, uuid, uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION as_turnos.fn_marcar_extra(
    p_fecha date,
    p_instalacion_id uuid,
    p_rol_id uuid,
    p_puesto_id uuid,
    p_cobertura_guardia_id uuid,
    p_origen text,
    p_actor_ref text
)
RETURNS TABLE (
    ok boolean,
    extra_uid text
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_guardia_record RECORD;
    v_extra_uid TEXT;
    v_pauta_id BIGINT;
BEGIN
    -- Generar UID único para el turno extra
    v_extra_uid := encode(digest(
        p_fecha::text || p_puesto_id::text || p_cobertura_guardia_id::text || NOW()::text,
        'sha256'
    ), 'hex');
    
    -- Validar que el guardia existe y está activo
    SELECT *
    INTO v_guardia_record
    FROM public.guardias
    WHERE 
        id = p_cobertura_guardia_id
        AND activo = true
        AND tipo_guardia IN ('contratado', 'esporadico');
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            'error: Guardia no válido o no activo'::TEXT;
        RETURN;
    END IF;
    
    -- Validar no doble-book
    IF EXISTS (
        SELECT 1 
        FROM public.as_turnos_pauta_mensual pm
        JOIN public.as_turnos_puestos_operativos po ON po.id = pm.puesto_id
        WHERE 
            pm.anio = EXTRACT(YEAR FROM p_fecha)::INTEGER
            AND pm.mes = EXTRACT(MONTH FROM p_fecha)::INTEGER
            AND pm.dia = EXTRACT(DAY FROM p_fecha)::INTEGER
            AND po.instalacion_id = p_instalacion_id
            AND po.rol_id = p_rol_id
            AND (
                pm.guardia_id = p_cobertura_guardia_id
                OR (pm.meta->>'reemplazo_guardia_id')::uuid = p_cobertura_guardia_id
                OR (pm.meta->>'cobertura_guardia_id')::uuid = p_cobertura_guardia_id
            )
    ) THEN
        RETURN QUERY SELECT 
            FALSE,
            'error: Guardia ya asignado en otro turno el mismo día'::TEXT;
        RETURN;
    END IF;
    
    -- Buscar si existe una pauta para este puesto y fecha
    SELECT pm.id
    INTO v_pauta_id
    FROM public.as_turnos_pauta_mensual pm
    WHERE 
        pm.puesto_id = p_puesto_id
        AND pm.anio = EXTRACT(YEAR FROM p_fecha)::INTEGER
        AND pm.mes = EXTRACT(MONTH FROM p_fecha)::INTEGER
        AND pm.dia = EXTRACT(DAY FROM p_fecha)::INTEGER
    LIMIT 1;
    
    IF v_pauta_id IS NOT NULL THEN
        -- Actualizar pauta existente
        UPDATE public.as_turnos_pauta_mensual
        SET 
            estado_ui = 'extra',
            meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
                'cobertura_guardia_id', p_cobertura_guardia_id::text,
                'origen', p_origen,
                'extra_uid', v_extra_uid,
                'actor_ref', p_actor_ref,
                'ts', NOW()::text,
                'tipo', 'turno_extra'
            ),
            updated_at = NOW()
        WHERE id = v_pauta_id;
    ELSE
        -- Crear nueva entrada de pauta para el turno extra
        INSERT INTO public.as_turnos_pauta_mensual (
            puesto_id,
            guardia_id,
            anio,
            mes,
            dia,
            estado,
            estado_ui,
            meta,
            instalacion_id
        ) VALUES (
            p_puesto_id,
            p_cobertura_guardia_id,
            EXTRACT(YEAR FROM p_fecha)::INTEGER,
            EXTRACT(MONTH FROM p_fecha)::INTEGER,
            EXTRACT(DAY FROM p_fecha)::INTEGER,
            'trabajado',
            'extra',
            jsonb_build_object(
                'cobertura_guardia_id', p_cobertura_guardia_id::text,
                'origen', p_origen,
                'extra_uid', v_extra_uid,
                'actor_ref', p_actor_ref,
                'ts', NOW()::text,
                'tipo', 'turno_extra',
                'es_extra', true
            ),
            p_instalacion_id
        );
    END IF;
    
    -- Registrar en logs de turnos extras (opcional - si falla, continuar)
    BEGIN
        INSERT INTO public.logs_turnos_extras (
            turno_extra_id,
            accion,
            usuario,
            tipo,
            datos_nuevos,
            fecha
        ) VALUES (
            gen_random_uuid(),  -- Usar UUID aleatorio ya que extra_uid es TEXT
            'marcar_extra',
            p_actor_ref,
            'turno_extra',
            jsonb_build_object(
                'fecha', p_fecha::text,
                'instalacion_id', p_instalacion_id,
                'rol_id', p_rol_id,
                'puesto_id', p_puesto_id,
                'cobertura_guardia_id', p_cobertura_guardia_id,
                'origen', p_origen,
                'extra_uid', v_extra_uid
            ),
            NOW()
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignorar errores de logs
            NULL;
    END;
    
    RETURN QUERY SELECT 
        TRUE,
        v_extra_uid;
END;
$$;

COMMENT ON FUNCTION as_turnos.fn_marcar_extra IS 
'Marca un turno extra validando disponibilidad del guardia';

-- ===============================================
-- 4. FUNCIÓN: fn_deshacer
-- Compatible con endpoint -new
-- ===============================================

-- Eliminar versiones existentes (crear nueva)
DROP FUNCTION IF EXISTS as_turnos.fn_deshacer(bigint, text);

CREATE OR REPLACE FUNCTION as_turnos.fn_deshacer(
    p_pauta_id bigint,
    p_actor_ref text
)
RETURNS TABLE (
    ok boolean,
    pauta_id bigint,
    estado text
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_pauta_record RECORD;
    v_meta_original JSONB;
BEGIN
    -- Obtener la pauta actual
    SELECT *
    INTO v_pauta_record
    FROM public.as_turnos_pauta_mensual
    WHERE id = p_pauta_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            p_pauta_id,
            'error: Pauta no encontrada'::TEXT;
        RETURN;
    END IF;
    
    -- Guardar meta original para el log
    v_meta_original := v_pauta_record.meta;
    
    -- Limpiar campos relacionados con cobertura/reemplazo
    UPDATE public.as_turnos_pauta_mensual
    SET 
        estado_ui = 'plan',
        meta = (meta - 'reemplazo_guardia_id' 
                    - 'reemplazo_guardia_nombre'
                    - 'cobertura_guardia_id'
                    - 'cobertura_guardia_nombre'
                    - 'sin_cobertura'
                    - 'motivo'
                    - 'falta_sin_aviso'
                    - 'extra_uid'
                    - 'es_extra'
                    - 'tipo') || 
               jsonb_build_object(
                   'deshacer_actor', p_actor_ref,
                   'deshacer_ts', NOW()::text,
                   'action', 'deshacer'
               ),
        updated_at = NOW()
    WHERE id = p_pauta_id;
    
    -- Registrar en logs (opcional - si falla, continuar)
    BEGIN
        INSERT INTO public.logs_pauta_diaria (
            pauta_diaria_id,
            accion,
            usuario,
            tipo,
            datos_anteriores,
            fecha
        ) VALUES (
            gen_random_uuid(),  -- Usar UUID aleatorio ya que pauta_id es BIGINT
            'deshacer',
            p_actor_ref,
            'deshacer',
            jsonb_build_object(
                'pauta_id', p_pauta_id,
                'meta_anterior', v_meta_original,
                'estado_anterior', v_pauta_record.estado_ui
            ),
            NOW()
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignorar errores de logs
            NULL;
    END;
    
    RETURN QUERY SELECT 
        TRUE,
        p_pauta_id,
        'plan'::TEXT;
END;
$$;

COMMENT ON FUNCTION as_turnos.fn_deshacer IS 
'Revierte un turno al estado plan, limpiando metadatos de cobertura/reemplazo';

-- ===============================================
-- 5. PERMISOS
-- ===============================================

-- Revocar permisos públicos
REVOKE ALL ON FUNCTION as_turnos.fn_guardias_disponibles(date, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION as_turnos.fn_registrar_reemplazo(bigint, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION as_turnos.fn_marcar_extra(date, uuid, uuid, uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION as_turnos.fn_deshacer(bigint, text) FROM PUBLIC;

-- Otorgar permisos a roles de la aplicación (si existen)
DO $$
BEGIN
    -- Verificar si el rol authenticated existe
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT EXECUTE ON FUNCTION as_turnos.fn_guardias_disponibles(date, uuid, uuid, uuid) TO authenticated;
        GRANT EXECUTE ON FUNCTION as_turnos.fn_registrar_reemplazo(bigint, uuid, text, text) TO authenticated;
        GRANT EXECUTE ON FUNCTION as_turnos.fn_marcar_extra(date, uuid, uuid, uuid, uuid, text, text) TO authenticated;
        GRANT EXECUTE ON FUNCTION as_turnos.fn_deshacer(bigint, text) TO authenticated;
    END IF;
    
    -- Verificar si el rol app_user existe (común en Neon)
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        GRANT EXECUTE ON FUNCTION as_turnos.fn_guardias_disponibles(date, uuid, uuid, uuid) TO app_user;
        GRANT EXECUTE ON FUNCTION as_turnos.fn_registrar_reemplazo(bigint, uuid, text, text) TO app_user;
        GRANT EXECUTE ON FUNCTION as_turnos.fn_marcar_extra(date, uuid, uuid, uuid, uuid, text, text) TO app_user;
        GRANT EXECUTE ON FUNCTION as_turnos.fn_deshacer(bigint, text) TO app_user;
    END IF;
END $$;

-- ===============================================
-- 6. ÍNDICES PARA OPTIMIZACIÓN
-- ===============================================

-- Crear índices si no existen para mejorar performance
CREATE INDEX IF NOT EXISTS idx_pauta_mensual_fecha 
ON public.as_turnos_pauta_mensual(anio, mes, dia);

CREATE INDEX IF NOT EXISTS idx_pauta_mensual_puesto_fecha 
ON public.as_turnos_pauta_mensual(puesto_id, anio, mes, dia);

CREATE INDEX IF NOT EXISTS idx_pauta_mensual_estado_ui 
ON public.as_turnos_pauta_mensual(estado_ui);

-- Crear índices en columnas de fecha existentes
CREATE INDEX IF NOT EXISTS idx_logs_pauta_diaria_fecha 
ON public.logs_pauta_diaria(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_logs_turnos_extras_fecha 
ON public.logs_turnos_extras(fecha DESC);

-- ===============================================
-- CONFIRMACIÓN
-- ===============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Funciones de turnos creadas exitosamente:';
    RAISE NOTICE '  - as_turnos.fn_guardias_disponibles';
    RAISE NOTICE '  - as_turnos.fn_registrar_reemplazo';
    RAISE NOTICE '  - as_turnos.fn_marcar_extra';
    RAISE NOTICE '  - as_turnos.fn_deshacer';
    RAISE NOTICE '  - Tablas de logs verificadas/creadas';
    RAISE NOTICE '  - Índices de optimización creados';
END $$;

COMMIT;
