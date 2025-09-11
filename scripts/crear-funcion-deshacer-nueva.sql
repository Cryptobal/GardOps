-- ===============================================
-- CREAR NUEVA FUNCIÓN fn_deshacer_v2
-- ===============================================
-- Crear una nueva función sin ambigüedades

-- 1. Crear la nueva función
CREATE OR REPLACE FUNCTION as_turnos.fn_deshacer_v2(
    p_pauta_id bigint,
    p_actor_ref text
)
RETURNS TABLE(success boolean, pauta_id bigint, message text)
LANGUAGE plpgsql
AS $$
DECLARE
    v_pauta RECORD;
    v_result_id bigint;
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

    -- ELIMINAR turnos extras relacionados
    DELETE FROM public.TE_turnos_extras WHERE pauta_id = p_pauta_id;

    -- Usar variable para evitar ambigüedad
    v_result_id := p_pauta_id;
    RETURN QUERY SELECT TRUE, v_result_id, 'planificado'::text;
END;
$$;

-- 2. Comentario en la función
COMMENT ON FUNCTION as_turnos.fn_deshacer_v2(bigint, text) IS 'Nueva función para deshacer marcados de turnos - sin ambigüedades';

-- 3. Probar la nueva función
SELECT 'Probando nueva función' as test;
SELECT * FROM as_turnos.fn_deshacer_v2(7003, 'test');
