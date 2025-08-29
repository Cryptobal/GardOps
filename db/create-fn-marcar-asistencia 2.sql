-- Función para marcar asistencia con auditoría y control de permisos
-- Maneja los estados: asistio, no_asistio, deshacer
-- Parámetros: pauta_id, estado, meta (jsonb), actor_ref

DROP FUNCTION IF EXISTS as_turnos.fn_marcar_asistencia;

CREATE OR REPLACE FUNCTION as_turnos.fn_marcar_asistencia(
    p_pauta_id BIGINT,
    p_estado TEXT,
    p_meta JSONB,
    p_actor_ref TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    pauta_id BIGINT,
    nuevo_estado TEXT
) AS $$
DECLARE
    v_estado_actual TEXT;
    v_nuevo_estado TEXT;
    v_meta_final JSONB;
BEGIN
    -- Validar parámetros de entrada
    IF p_pauta_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'pauta_id es requerido', NULL::BIGINT, NULL::TEXT;
        RETURN;
    END IF;
    
    IF p_estado IS NULL OR p_estado NOT IN ('asistio', 'no_asistio', 'deshacer') THEN
        RETURN QUERY SELECT FALSE, 'Estado inválido. Use: asistio, no_asistio, deshacer', NULL::BIGINT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Obtener estado actual
    SELECT estado INTO v_estado_actual
    FROM as_turnos_pauta_mensual
    WHERE id = p_pauta_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Pauta no encontrada', NULL::BIGINT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Determinar nuevo estado según acción
    CASE p_estado
        WHEN 'asistio' THEN
            v_nuevo_estado := 'trabajado';
            v_meta_final := COALESCE(p_meta, '{}'::JSONB) || 
                           jsonb_build_object('timestamp', now(), 'actor', p_actor_ref);
        
        WHEN 'no_asistio' THEN
            -- Primero marcar inasistencia, luego sin_cobertura
            v_nuevo_estado := 'inasistencia';
            v_meta_final := COALESCE(p_meta, '{}'::JSONB) || 
                           jsonb_build_object('timestamp', now(), 'actor', p_actor_ref);
            
            -- Si tiene motivo, incluirlo en meta
            IF p_meta ? 'motivo' THEN
                v_meta_final := v_meta_final || jsonb_build_object('motivo', p_meta->>'motivo');
            END IF;
        
        WHEN 'deshacer' THEN
            -- Revertir a planificado
            v_nuevo_estado := 'planificado';
            v_meta_final := NULL;
    END CASE;
    
    -- Actualizar el estado
    UPDATE as_turnos_pauta_mensual
    SET 
        estado = v_nuevo_estado,
        meta = v_meta_final,
        updated_at = NOW()
    WHERE id = p_pauta_id;
    
    -- Si es no_asistio y no hay reemplazo configurado, marcar como sin_cobertura
    IF p_estado = 'no_asistio' AND NOT (p_meta ? 'reemplazo_guardia_id') THEN
        UPDATE as_turnos_pauta_mensual
        SET 
            estado = 'sin_cobertura',
            updated_at = NOW()
        WHERE id = p_pauta_id
        AND NOT EXISTS (
            SELECT 1 FROM as_turnos_pauta_mensual 
            WHERE id = p_pauta_id 
            AND meta ? 'reemplazo_guardia_id'
        );
        v_nuevo_estado := 'sin_cobertura';
    END IF;
    
    -- Registrar en log de auditoría (si existe tabla de logs)
    BEGIN
        INSERT INTO logs (
            fecha,
            hora,
            usuario,
            accion,
            detalle,
            created_at
        ) VALUES (
            CURRENT_DATE,
            CURRENT_TIME::TIME WITHOUT TIME ZONE,
            p_actor_ref,
            'MARCAR_ASISTENCIA',
            jsonb_build_object(
                'pauta_id', p_pauta_id,
                'estado_anterior', v_estado_actual,
                'estado_nuevo', v_nuevo_estado,
                'accion', p_estado,
                'meta', v_meta_final
            ),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Si falla el log, continuar sin error
        NULL;
    END;
    
    RETURN QUERY SELECT 
        TRUE, 
        'Asistencia actualizada correctamente'::TEXT, 
        p_pauta_id,
        v_nuevo_estado;
END;
$$ LANGUAGE plpgsql;

-- Agregar comentario descriptivo
COMMENT ON FUNCTION as_turnos.fn_marcar_asistencia IS 
'Marca asistencia de turnos. Estados: asistio (trabajado), no_asistio (inasistencia/sin_cobertura), deshacer (planificado)';

-- Grant permisos si es necesario
-- GRANT EXECUTE ON FUNCTION as_turnos.fn_marcar_asistencia TO tu_rol_aplicacion;
