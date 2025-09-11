-- ===============================================
-- ACTUALIZACIÓN DE FUNCIONES CON NUEVA LÓGICA
-- ===============================================

-- 1. Función fn_deshacer actualizada
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
    v_pauta RECORD;
BEGIN
    -- Obtener información de la pauta
    SELECT * INTO v_pauta
    FROM public.as_turnos_pauta_mensual
    WHERE id = p_pauta_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, p_pauta_id, 'error: Pauta no encontrada'::text;
        RETURN;
    END IF;

    -- Actualizar a estado planificado usando nueva estructura
    UPDATE public.as_turnos_pauta_mensual
    SET 
        tipo_turno = 'planificado',
        estado_puesto = CASE 
            WHEN guardia_id IS NULL THEN 'ppc'
            ELSE 'asignado'
        END,
        estado_guardia = NULL,
        tipo_cobertura = NULL,
        guardia_trabajo_id = guardia_id,
        meta = (COALESCE(meta, '{}'::jsonb)
                  - 'cobertura_guardia_id'
                  - 'tipo'
                  - 'extra_uid'
                  - 'es_extra'
                  - 'reemplazo_guardia_id'
                  - 'reemplazo_guardia_nombre'
                  - 'sin_cobertura'
                  - 'motivo'
                  - 'falta_sin_aviso')
               || jsonb_build_object(
                  'deshacer_actor', p_actor_ref,
                  'deshacer_ts', NOW()::text,
                  'action', 'deshacer'
               ),
        updated_at = NOW()
    WHERE id = p_pauta_id;

    -- ELIMINAR turnos extras relacionados (CRÍTICO)
    DELETE FROM TE_turnos_extras WHERE pauta_id = p_pauta_id;

    RETURN QUERY SELECT TRUE, p_pauta_id, 'planificado'::text;
END;
$$;

COMMENT ON FUNCTION as_turnos.fn_deshacer IS 'Revierte un turno al estado planificado y elimina turnos extras relacionados';

-- 2. Función fn_marcar_extra actualizada
DROP FUNCTION IF EXISTS as_turnos.fn_marcar_extra(date, uuid, uuid, uuid, uuid, text, text);

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
    v_pauta_id bigint;
    v_extra_uid text;
    v_es_ppc boolean;
BEGIN
    -- Buscar la pauta correspondiente
    SELECT pm.id, (pm.guardia_id IS NULL) as es_ppc
    INTO v_pauta_id, v_es_ppc
    FROM as_turnos_pauta_mensual pm
    WHERE pm.puesto_id = p_puesto_id
      AND pm.fecha = p_fecha
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'error: Pauta no encontrada'::text;
        RETURN;
    END IF;

    -- Generar UID único
    v_extra_uid := gen_random_uuid()::text;

    -- Actualizar pauta con nueva estructura
    UPDATE as_turnos_pauta_mensual
    SET 
        tipo_turno = 'planificado',
        estado_puesto = CASE 
            WHEN v_es_ppc THEN 'ppc'
            ELSE 'asignado'
        END,
        estado_guardia = CASE 
            WHEN v_es_ppc THEN NULL
            ELSE 'falta'
        END,
        tipo_cobertura = 'turno_extra',
        guardia_trabajo_id = p_cobertura_guardia_id,
        meta = COALESCE(meta, '{}'::jsonb) || 
               jsonb_build_object(
                   'cobertura_guardia_id', p_cobertura_guardia_id::text,
                   'tipo', 'turno_extra',
                   'extra_uid', v_extra_uid,
                   'origen', p_origen,
                   'marcado_por', p_actor_ref,
                   'marcado_ts', NOW()::text,
                   'action', 'marcar_extra'
               ),
        updated_at = NOW()
    WHERE id = v_pauta_id;

    -- Crear o actualizar registro en turnos extras
    INSERT INTO TE_turnos_extras (
        pauta_id, 
        guardia_id, 
        tipo, 
        valor, 
        created_at
    ) VALUES (
        v_pauta_id, 
        p_cobertura_guardia_id, 
        CASE WHEN v_es_ppc THEN 'ppc' ELSE 'reemplazo' END, 
        0, 
        NOW()
    )
    ON CONFLICT (pauta_id) DO UPDATE SET
        guardia_id = EXCLUDED.guardia_id,
        tipo = EXCLUDED.tipo,
        updated_at = NOW();

    RETURN QUERY SELECT TRUE, v_extra_uid;
END;
$$;

COMMENT ON FUNCTION as_turnos.fn_marcar_extra IS 'Marca un turno extra usando nueva estructura de estados';

-- 3. Función fn_registrar_reemplazo actualizada
DROP FUNCTION IF EXISTS as_turnos.fn_registrar_reemplazo(bigint, uuid, text, text);

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
    v_pauta RECORD;
    v_es_ppc boolean;
BEGIN
    -- Obtener información de la pauta
    SELECT * INTO v_pauta
    FROM public.as_turnos_pauta_mensual
    WHERE id = p_pauta_id;
    
    -- Determinar si es PPC
    v_es_ppc := (v_pauta.guardia_id IS NULL);

    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            p_pauta_id,
            'error: Pauta no encontrada'::TEXT,
            '{}'::jsonb;
        RETURN;
    END IF;

    -- Actualizar pauta con nueva estructura
    UPDATE public.as_turnos_pauta_mensual
    SET 
        tipo_turno = 'planificado',
        estado_puesto = CASE 
            WHEN v_es_ppc THEN 'ppc'
            ELSE 'asignado'
        END,
        estado_guardia = CASE 
            WHEN v_es_ppc THEN NULL
            ELSE 'falta'
        END,
        tipo_cobertura = 'turno_extra',
        guardia_trabajo_id = p_cobertura_guardia_id,
        meta = COALESCE(meta, '{}'::jsonb) || 
               jsonb_build_object(
                   'cobertura_guardia_id', p_cobertura_guardia_id::text,
                   'tipo', 'turno_extra',
                   'motivo', p_motivo,
                   'marcado_por', p_actor_ref,
                   'marcado_ts', NOW()::text,
                   'action', 'registrar_reemplazo'
               ),
        updated_at = NOW()
    WHERE id = p_pauta_id;

    -- Crear registro en turnos extras
    INSERT INTO TE_turnos_extras (
        pauta_id, 
        guardia_id, 
        tipo, 
        valor, 
        created_at
    ) VALUES (
        p_pauta_id, 
        p_cobertura_guardia_id, 
        CASE WHEN v_es_ppc THEN 'ppc' ELSE 'reemplazo' END, 
        0, 
        NOW()
    )
    ON CONFLICT (pauta_id) DO UPDATE SET
        guardia_id = EXCLUDED.guardia_id,
        tipo = EXCLUDED.tipo,
        updated_at = NOW();

    -- Obtener estado actualizado
    SELECT meta INTO v_pauta
    FROM public.as_turnos_pauta_mensual
    WHERE id = p_pauta_id;

    RETURN QUERY SELECT 
        TRUE,
        p_pauta_id,
        'turno_extra'::TEXT,
        v_pauta.meta;
END;
$$;

COMMENT ON FUNCTION as_turnos.fn_registrar_reemplazo IS 'Registra un reemplazo usando nueva estructura de estados';
