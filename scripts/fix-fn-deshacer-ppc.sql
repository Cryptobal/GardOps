-- ===============================================
-- CORRECCIÓN DE FUNCIÓN fn_deshacer PARA PPCs
-- ===============================================
-- Problema: Cuando se desasigna un guardia de un PPC, el estado_puesto no se 
-- restaura correctamente a 'ppc' porque guardia_id no se limpia.
-- 
-- Solución: Limpiar guardia_id cuando se trata de un PPC para que estado_puesto
-- se establezca correctamente como 'ppc'.

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
    v_es_ppc boolean;
BEGIN
    -- Obtener información de la pauta
    SELECT * INTO v_pauta
    FROM public.as_turnos_pauta_mensual
    WHERE id = p_pauta_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, p_pauta_id, 'error: Pauta no encontrada'::text;
        RETURN;
    END IF;

    -- Determinar si es PPC basándose en el estado original
    -- Un PPC es aquel que no tiene guardia asignado en la pauta mensual original
    v_es_ppc := (v_pauta.guardia_id IS NULL);

    -- Actualizar a estado planificado usando nueva estructura CORREGIDA
    UPDATE public.as_turnos_pauta_mensual
    SET 
        tipo_turno = 'planificado',
        -- CORRECCIÓN: Limpiar guardia_id para PPCs para que estado_puesto sea 'ppc'
        guardia_id = CASE 
            WHEN v_es_ppc THEN NULL  -- Limpiar guardia_id para PPCs
            ELSE guardia_id          -- Mantener guardia_id para turnos asignados
        END,
        estado_puesto = CASE 
            WHEN v_es_ppc THEN 'ppc'     -- PPC sin guardia asignado
            ELSE 'asignado'              -- Turno con guardia asignado
        END,
        estado_guardia = NULL,
        tipo_cobertura = NULL,
        guardia_trabajo_id = CASE 
            WHEN v_es_ppc THEN NULL      -- PPC no tiene guardia de trabajo
            ELSE guardia_id              -- Turno asignado mantiene su guardia
        END,
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
                  'action', 'deshacer',
                  'es_ppc_original', v_es_ppc
               ),
        updated_at = NOW()
    WHERE id = p_pauta_id;

    -- ELIMINAR turnos extras relacionados (CRÍTICO)
    DELETE FROM TE_turnos_extras WHERE pauta_id = p_pauta_id;

    RETURN QUERY SELECT TRUE, p_pauta_id, 'planificado'::text;
END;
$$;

COMMENT ON FUNCTION as_turnos.fn_deshacer IS 'Revierte un turno al estado planificado, corrigiendo el estado de PPCs al limpiar guardia_id correctamente';



