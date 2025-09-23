-- ===============================================
-- CORRECCIÓN: Función fn_deshacer sin ambigüedad
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
    v_estado_anterior TEXT;
    v_nuevo_estado TEXT;
BEGIN
    -- Obtener información de la pauta
    SELECT * INTO v_pauta
    FROM public.as_turnos_pauta_mensual
    WHERE id = p_pauta_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, p_pauta_id, 'error: Pauta no encontrada'::text;
        RETURN;
    END IF;

    -- Guardar estado anterior para logging
    v_estado_anterior := COALESCE(v_pauta.meta->>'estado_ui', 'desconocido');
    
    -- LÓGICA DE DESHACER SEGÚN LOS 5 CASOS:
    
    -- CASO 1 y 2: PPC (sin guardia asignado) - Deshacer "Cubrir" o "Sin cobertura"
    IF v_pauta.guardia_id IS NULL THEN
        -- PPC: Volver a estado planificado sin cobertura
        v_nuevo_estado := 'ppc_planificado';
        
        UPDATE public.as_turnos_pauta_mensual
        SET 
            tipo_turno = 'planificado',
            estado_puesto = 'ppc',
            estado_guardia = NULL,
            tipo_cobertura = NULL,
            guardia_trabajo_id = NULL,
            meta = (COALESCE(meta, '{}'::jsonb)
                      - 'cobertura_guardia_id'
                      - 'cobertura_guardia_nombre'
                      - 'reemplazo_guardia_id'
                      - 'reemplazo_guardia_nombre'
                      - 'sin_cobertura'
                      - 'motivo'
                      - 'falta_sin_aviso'
                      - 'extra_uid'
                      - 'es_extra'
                      - 'tipo'
                      - 'estado_ui')
                   || jsonb_build_object(
                      'deshacer_actor', p_actor_ref,
                      'deshacer_ts', NOW()::text,
                      'action', 'deshacer_ppc',
                      'estado_anterior', v_estado_anterior,
                      'nuevo_estado', v_nuevo_estado
                   ),
            updated_at = NOW()
        WHERE id = p_pauta_id;
        
    -- CASO 3, 4 y 5: Turno con guardia asignado - Deshacer "Asistió" o "No asistió"
    ELSE
        -- Turno con guardia: Volver a estado planificado con guardia asignado
        v_nuevo_estado := 'planificado';
        
        UPDATE public.as_turnos_pauta_mensual
        SET 
            tipo_turno = 'planificado',
            estado_puesto = 'asignado',
            estado_guardia = NULL,
            tipo_cobertura = NULL,
            guardia_trabajo_id = guardia_id, -- Restaurar guardia original
            meta = (COALESCE(meta, '{}'::jsonb)
                      - 'cobertura_guardia_id'
                      - 'cobertura_guardia_nombre'
                      - 'reemplazo_guardia_id'
                      - 'reemplazo_guardia_nombre'
                      - 'sin_cobertura'
                      - 'motivo'
                      - 'falta_sin_aviso'
                      - 'extra_uid'
                      - 'es_extra'
                      - 'tipo'
                      - 'estado_ui')
                   || jsonb_build_object(
                      'deshacer_actor', p_actor_ref,
                      'deshacer_ts', NOW()::text,
                      'action', 'deshacer_turno',
                      'estado_anterior', v_estado_anterior,
                      'nuevo_estado', v_nuevo_estado
                   ),
            updated_at = NOW()
        WHERE id = p_pauta_id;
    END IF;

    -- ELIMINAR turnos extras relacionados (CRÍTICO)
    DELETE FROM public.TE_turnos_extras WHERE TE_turnos_extras.pauta_id = p_pauta_id;

    -- CORREGIDO: Usar p_pauta_id explícitamente para evitar ambigüedad
    RETURN QUERY SELECT TRUE, p_pauta_id, v_nuevo_estado::text;
END;
$$;

COMMENT ON FUNCTION as_turnos.fn_deshacer IS 'Revierte un turno al estado correcto según los 5 casos: PPC (cubrir/sin cobertura) y Turno con guardia (asistió/no asistió)';
