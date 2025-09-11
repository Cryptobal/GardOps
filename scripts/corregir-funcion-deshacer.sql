-- ===============================================
-- CORRECCIÓN DE FUNCIÓN fn_deshacer
-- ===============================================
-- Corrige el error "column reference 'pauta_id' is ambiguous"

-- 1. Eliminar la función existente
DROP FUNCTION IF EXISTS as_turnos.fn_deshacer(bigint, text);

-- 2. Crear la función corregida
CREATE OR REPLACE FUNCTION as_turnos.fn_deshacer(
    p_pauta_id bigint,
    p_actor_ref text
)
RETURNS TABLE(success boolean, pauta_id bigint, message text)
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

    -- ELIMINAR turnos extras relacionados (CORREGIDO: usar p_pauta_id explícitamente)
    DELETE FROM public.TE_turnos_extras WHERE pauta_id = p_pauta_id;

    RETURN QUERY SELECT TRUE, p_pauta_id, 'planificado'::text;
END;
$$;

-- 3. Comentario en la función
COMMENT ON FUNCTION as_turnos.fn_deshacer(bigint, text) IS 'Función para deshacer marcados de turnos - CORREGIDA: resuelve ambigüedad de pauta_id';

-- 4. Verificar que la función se creó correctamente
SELECT 
    'Verificación de función' as test,
    proname,
    proargnames,
    proargtypes::regtype[]
FROM pg_proc 
WHERE proname = 'fn_deshacer' 
AND pronamespace = 'as_turnos'::regnamespace;
