-- Script para arreglar la función reactivar_rol_servicio_completo
-- Cambia referencias de sueldo_estructuras_roles a sueldo_estructuras_servicio

-- Eliminar la función existente
DROP FUNCTION IF EXISTS reactivar_rol_servicio_completo(UUID, TEXT, UUID);

-- Crear la función actualizada
CREATE OR REPLACE FUNCTION reactivar_rol_servicio_completo(
  p_rol_id UUID,
  p_motivo TEXT DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_rol_anterior JSONB;
  v_rol_nuevo JSONB;
  v_estructura_reactivada JSONB;
  v_resultado JSONB;
BEGIN
  -- Iniciar transacción
  BEGIN
    -- 1. Obtener datos del rol antes del cambio
    SELECT to_jsonb(rs.*) INTO v_rol_anterior
    FROM as_turnos_roles_servicio rs
    WHERE rs.id = p_rol_id;

    IF v_rol_anterior IS NULL THEN
      RAISE EXCEPTION 'Rol de servicio con ID % no encontrado', p_rol_id;
    END IF;

    -- 2. Reactivar el rol de servicio
    UPDATE as_turnos_roles_servicio
    SET
      estado = 'Activo',
      fecha_inactivacion = NULL,
      updated_at = NOW()
    WHERE id = p_rol_id;

    -- 3. Obtener datos del rol después del cambio
    SELECT to_jsonb(rs.*) INTO v_rol_nuevo
    FROM as_turnos_roles_servicio rs
    WHERE rs.id = p_rol_id;

    -- 4. Reactivar la estructura más reciente (si existe) usando sueldo_estructuras_servicio
    UPDATE sueldo_estructuras_servicio
    SET
      activo = true,
      fecha_inactivacion = NULL,
      updated_at = NOW()
    WHERE rol_servicio_id = p_rol_id
      AND activo = false
      AND fecha_inactivacion IS NOT NULL
      AND fecha_inactivacion = (
        SELECT MAX(fecha_inactivacion)
        FROM sueldo_estructuras_servicio
        WHERE rol_servicio_id = p_rol_id AND activo = false
      );

    -- 5. Obtener datos de la estructura reactivada
    SELECT to_jsonb(es.*) INTO v_estructura_reactivada
    FROM sueldo_estructuras_servicio es
    WHERE es.rol_servicio_id = p_rol_id AND es.activo = true AND es.bono_id IS NULL
    LIMIT 1;

    -- 6. Registrar en historial de roles (usando sueldo_historial_roles)
    INSERT INTO sueldo_historial_roles (
      rol_servicio_id,
      accion,
      fecha_accion,
      detalles,
      usuario_id,
      datos_anteriores,
      datos_nuevos
    ) VALUES (
      p_rol_id,
      'REACTIVACION',
      NOW(),
      COALESCE(p_motivo, 'Rol reactivado'),
      p_usuario_id,
      v_rol_anterior,
      v_rol_nuevo
    );

    -- 7. Registrar reactivación de estructura (si se reactivó) usando sueldo_historial_estructuras
    IF v_estructura_reactivada IS NOT NULL THEN
      INSERT INTO sueldo_historial_estructuras (
        estructura_id,
        accion,
        fecha_accion,
        detalles,
        usuario_id,
        datos_anteriores,
        datos_nuevos
      ) VALUES (
        (v_estructura_reactivada->>'id')::UUID,
        'REACTIVACION',
        NOW(),
        'Estructura reactivada por reactivación del rol de servicio',
        p_usuario_id,
        jsonb_build_object('activo', false, 'fecha_inactivacion', v_estructura_reactivada->>'fecha_inactivacion'),
        v_estructura_reactivada
      );
    END IF;

    -- 8. Preparar resultado
    v_resultado := jsonb_build_object(
      'success', true,
      'rol_id', p_rol_id,
      'accion', 'REACTIVACION',
      'fecha_reactivacion', NOW(),
      'estructura_reactivada', v_estructura_reactivada IS NOT NULL,
      'motivo', COALESCE(p_motivo, 'Reactivación manual'),
      'detalles', jsonb_build_object(
        'rol_anterior', v_rol_anterior,
        'rol_nuevo', v_rol_nuevo,
        'estructura_reactivada', v_estructura_reactivada
      )
    );

    RETURN v_resultado;

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback automático en caso de error
      RAISE EXCEPTION 'Error en reactivación: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;
