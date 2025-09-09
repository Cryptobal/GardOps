-- =============================================
-- Funciones faltantes para el rollout de Pauta Diaria v2
-- =============================================

-- Función para registrar reemplazos
CREATE OR REPLACE FUNCTION as_turnos.fn_registrar_reemplazo(
    p_pauta_id BIGINT,
    p_cobertura_guardia_id UUID,
    p_actor_ref TEXT DEFAULT 'system'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
    v_pauta RECORD;
BEGIN
    -- Validar que la pauta existe
    SELECT * INTO v_pauta
    FROM pauta_diaria
    WHERE id = p_pauta_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pauta % no existe', p_pauta_id;
    END IF;
    
    -- Actualizar la pauta con el reemplazo
    UPDATE pauta_diaria
    SET 
        estado = 'reemplazo',
        guardia_trabajo_id = p_cobertura_guardia_id,
        meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
            'cobertura_guardia_id', p_cobertura_guardia_id::text,
            'actor_ref', p_actor_ref,
            'updated_at', NOW()::text,
            'motivo', 'Reemplazo registrado'
        ),
        updated_at = NOW()
    WHERE id = p_pauta_id;
    
    -- Registrar en historial
    INSERT INTO as_turnos_historial (
        pauta_id,
        accion,
        actor_ref,
        meta,
        created_at
    ) VALUES (
        p_pauta_id,
        'reemplazo',
        p_actor_ref,
        jsonb_build_object(
            'cobertura_guardia_id', p_cobertura_guardia_id::text,
            'guardia_original_id', v_pauta.guardia_id::text
        ),
        NOW()
    );
    
    -- Retornar resultado
    v_result := jsonb_build_object(
        'success', true,
        'pauta_id', p_pauta_id,
        'cobertura_guardia_id', p_cobertura_guardia_id,
        'message', 'Reemplazo registrado exitosamente'
    );
    
    RETURN v_result;
END;
$$;

-- Función para marcar turnos extras
CREATE OR REPLACE FUNCTION as_turnos.fn_marcar_extra(
    p_pauta_id BIGINT,
    p_cobertura_guardia_id UUID,
    p_origen TEXT DEFAULT 'system'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
    v_pauta RECORD;
BEGIN
    -- Validar que la pauta existe y es PPC
    SELECT * INTO v_pauta
    FROM pauta_diaria
    WHERE id = p_pauta_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pauta % no existe', p_pauta_id;
    END IF;
    
    -- Verificar que sea un turno PPC o libre
    IF v_pauta.guardia_id IS NOT NULL THEN
        RAISE EXCEPTION 'La pauta % no es un turno PPC', p_pauta_id;
    END IF;
    
    -- Actualizar la pauta con el turno extra
    UPDATE pauta_diaria
    SET 
        estado = 'asistido',
        guardia_trabajo_id = p_cobertura_guardia_id,
        es_turno_extra = true,
        meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
            'cobertura_guardia_id', p_cobertura_guardia_id::text,
            'origen', p_origen,
            'tipo', 'turno_extra',
            'updated_at', NOW()::text
        ),
        updated_at = NOW()
    WHERE id = p_pauta_id;
    
    -- Registrar en historial
    INSERT INTO as_turnos_historial (
        pauta_id,
        accion,
        actor_ref,
        meta,
        created_at
    ) VALUES (
        p_pauta_id,
        'turno_extra',
        p_origen,
        jsonb_build_object(
            'cobertura_guardia_id', p_cobertura_guardia_id::text,
            'tipo', 'ppc_cubierto'
        ),
        NOW()
    );
    
    -- Retornar resultado
    v_result := jsonb_build_object(
        'success', true,
        'pauta_id', p_pauta_id,
        'cobertura_guardia_id', p_cobertura_guardia_id,
        'message', 'Turno extra registrado exitosamente'
    );
    
    RETURN v_result;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION as_turnos.fn_registrar_reemplazo TO authenticated;
GRANT EXECUTE ON FUNCTION as_turnos.fn_marcar_extra TO authenticated;

-- Comentarios
COMMENT ON FUNCTION as_turnos.fn_registrar_reemplazo IS 'Registra un reemplazo de guardia en un turno';
COMMENT ON FUNCTION as_turnos.fn_marcar_extra IS 'Marca un turno PPC como cubierto por un guardia (turno extra)';
