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
    v_nuevo_estado TEXT;
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
    
    -- Para todos los casos, volver a 'plan' (no existe ppc_libre)
    v_nuevo_estado := 'plan';
    
    -- Limpiar campos relacionados con cobertura/reemplazo
    UPDATE public.as_turnos_pauta_mensual
    SET 
        estado = 'planificado',
        estado_ui = v_nuevo_estado,
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
                   'action', 'deshacer',
                   'estado_anterior', v_pauta_record.estado_ui,
                   'nuevo_estado', v_nuevo_estado
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
        v_nuevo_estado::TEXT;
END;
$$;
