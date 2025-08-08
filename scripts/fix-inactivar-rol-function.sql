-- Script para arreglar la función inactivar_rol_servicio_completo
-- Cambia referencias de sueldo_estructuras_roles a sueldo_estructuras_servicio

-- Eliminar la función existente
DROP FUNCTION IF EXISTS inactivar_rol_servicio_completo(UUID, TEXT, UUID);

-- Crear la función actualizada
CREATE OR REPLACE FUNCTION inactivar_rol_servicio_completo(
  p_rol_id UUID,
  p_motivo TEXT DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_rol_anterior JSONB;
  v_rol_nuevo JSONB;
  v_estructura_anterior JSONB;
  v_estructura_nuevo JSONB;
  v_guardias_liberados INTEGER := 0;
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

    -- 2. Obtener datos de la estructura antes del cambio (usando sueldo_estructuras_servicio)
    SELECT to_jsonb(es.*) INTO v_estructura_anterior
    FROM sueldo_estructuras_servicio es
    WHERE es.rol_servicio_id = p_rol_id AND es.activo = true AND es.bono_id IS NULL
    LIMIT 1;

    -- 3. Contar guardias que serán liberados
    SELECT COUNT(*) INTO v_guardias_liberados
    FROM as_turnos_puestos_operativos po
    WHERE po.rol_id = p_rol_id
      AND po.guardia_id IS NOT NULL
      AND po.es_ppc = false;

    -- 4. Inactivar el rol de servicio
    UPDATE as_turnos_roles_servicio
    SET
      estado = 'Inactivo',
      fecha_inactivacion = NOW(),
      updated_at = NOW()
    WHERE id = p_rol_id;

    -- 5. Obtener datos del rol después del cambio
    SELECT to_jsonb(rs.*) INTO v_rol_nuevo
    FROM as_turnos_roles_servicio rs
    WHERE rs.id = p_rol_id;

    -- 6. Inactivar todas las estructuras de sueldo asociadas al rol (usando sueldo_estructuras_servicio)
    UPDATE sueldo_estructuras_servicio
    SET
      activo = false,
      fecha_inactivacion = NOW(),
      updated_at = NOW()
    WHERE rol_servicio_id = p_rol_id AND activo = true;

    -- 7. Obtener datos de la estructura después del cambio
    SELECT to_jsonb(es.*) INTO v_estructura_nuevo
    FROM sueldo_estructuras_servicio es
    WHERE es.rol_servicio_id = p_rol_id AND es.activo = false
    ORDER BY es.fecha_inactivacion DESC
    LIMIT 1;

    -- 8. Liberar guardias asignados (convertir a PPCs)
    UPDATE as_turnos_puestos_operativos
    SET
      guardia_id = NULL,
      es_ppc = true,
      actualizado_en = NOW()
    WHERE rol_id = p_rol_id
      AND guardia_id IS NOT NULL
      AND es_ppc = false;

    -- 9. Registrar en historial de roles (usando sueldo_historial_roles)
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
      'INACTIVACION',
      NOW(),
      COALESCE(p_motivo, 'Rol inactivado - Guardias liberados automáticamente'),
      p_usuario_id,
      v_rol_anterior,
      v_rol_nuevo
    );

    -- 10. Registrar en historial de estructuras (usando sueldo_historial_estructuras)
    IF v_estructura_anterior IS NOT NULL THEN
      INSERT INTO sueldo_historial_estructuras (
        estructura_id,
        accion,
        fecha_accion,
        detalles,
        usuario_id,
        datos_anteriores,
        datos_nuevos
      ) VALUES (
        (v_estructura_anterior->>'id')::UUID,
        'INACTIVACION',
        NOW(),
        'Estructura inactivada por inactivación del rol de servicio',
        p_usuario_id,
        v_estructura_anterior,
        v_estructura_nuevo
      );
    END IF;

    -- 11. Preparar resultado
    v_resultado := jsonb_build_object(
      'success', true,
      'rol_id', p_rol_id,
      'accion', 'INACTIVACION',
      'fecha_inactivacion', NOW(),
      'guardias_liberados', v_guardias_liberados,
      'estructura_inactivada', v_estructura_anterior IS NOT NULL,
      'motivo', COALESCE(p_motivo, 'Inactivación automática'),
      'detalles', jsonb_build_object(
        'rol_anterior', v_rol_anterior,
        'rol_nuevo', v_rol_nuevo,
        'estructura_anterior', v_estructura_anterior,
        'estructura_nuevo', v_estructura_nuevo
      )
    );

    RETURN v_resultado;

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback automático en caso de error
      RAISE EXCEPTION 'Error en inactivación: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;
