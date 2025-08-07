-- =====================================================
-- CREACIÓN DE FUNCIONES PARA ROLES Y ESTRUCTURAS DE SERVICIO
-- =====================================================
-- Objetivo: Funciones para inactivación completa y nueva estructura
-- Fecha: $(date)
-- Sistema: GardOps

-- =====================================================
-- 1. FUNCIÓN PARA INACTIVACIÓN COMPLETA DE ROL DE SERVICIO
-- =====================================================

CREATE OR REPLACE FUNCTION inactivar_rol_servicio_completo(
  p_rol_id UUID,
  p_motivo TEXT DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
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
    
    -- 2. Obtener datos de la estructura antes del cambio
    SELECT to_jsonb(es.*) INTO v_estructura_anterior
    FROM sueldo_estructuras_roles es
    WHERE es.rol_servicio_id = p_rol_id AND es.activo = true;
    
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
    
    -- 6. Inactivar la estructura de sueldo asociada
    UPDATE sueldo_estructuras_roles
    SET 
      activo = false,
      fecha_inactivacion = NOW(),
      updated_at = NOW()
    WHERE rol_servicio_id = p_rol_id AND activo = true;
    
    -- 7. Obtener datos de la estructura después del cambio
    SELECT to_jsonb(es.*) INTO v_estructura_nuevo
    FROM sueldo_estructuras_roles es
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
    
    -- 9. Registrar en historial de roles
    INSERT INTO historial_roles_servicio (
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
    
    -- 10. Registrar en historial de estructuras (si existía)
    IF v_estructura_anterior IS NOT NULL THEN
      INSERT INTO historial_estructuras_servicio (
        rol_servicio_id,
        estructura_id,
        accion,
        fecha_accion,
        detalles,
        usuario_id,
        datos_anteriores,
        datos_nuevos
      ) VALUES (
        p_rol_id,
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

-- =====================================================
-- 2. FUNCIÓN PARA CREAR NUEVA ESTRUCTURA DE SERVICIO
-- =====================================================

CREATE OR REPLACE FUNCTION crear_nueva_estructura_servicio(
  p_rol_id UUID,
  p_sueldo_base INTEGER DEFAULT 680000,
  p_bonos JSONB DEFAULT '{}'::jsonb,
  p_motivo TEXT DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_rol_info JSONB;
  v_estructura_anterior JSONB;
  v_estructura_nueva_id UUID;
  v_estructura_nueva JSONB;
  v_resultado JSONB;
BEGIN
  -- Iniciar transacción
  BEGIN
    -- 1. Verificar que el rol existe y está activo
    SELECT to_jsonb(rs.*) INTO v_rol_info
    FROM as_turnos_roles_servicio rs
    WHERE rs.id = p_rol_id AND rs.estado = 'Activo';
    
    IF v_rol_info IS NULL THEN
      RAISE EXCEPTION 'Rol de servicio con ID % no encontrado o no está activo', p_rol_id;
    END IF;
    
    -- 2. Obtener estructura actual activa
    SELECT to_jsonb(es.*) INTO v_estructura_anterior
    FROM sueldo_estructuras_roles es
    WHERE es.rol_servicio_id = p_rol_id AND es.activo = true;
    
    -- 3. Inactivar estructura actual (si existe)
    IF v_estructura_anterior IS NOT NULL THEN
      UPDATE sueldo_estructuras_roles
      SET 
        activo = false,
        fecha_inactivacion = NOW(),
        updated_at = NOW()
      WHERE id = (v_estructura_anterior->>'id')::UUID;
      
      -- Registrar inactivación en historial
      INSERT INTO historial_estructuras_servicio (
        rol_servicio_id,
        estructura_id,
        accion,
        fecha_accion,
        detalles,
        usuario_id,
        datos_anteriores,
        datos_nuevos
      ) VALUES (
        p_rol_id,
        (v_estructura_anterior->>'id')::UUID,
        'INACTIVACION',
        NOW(),
        'Estructura inactivada para crear nueva estructura',
        p_usuario_id,
        v_estructura_anterior,
        jsonb_build_object('activo', false, 'fecha_inactivacion', NOW())
      );
    END IF;
    
    -- 4. Crear nueva estructura
    INSERT INTO sueldo_estructuras_roles (
      rol_servicio_id,
      sueldo_base,
      bono_asistencia,
      bono_responsabilidad,
      bono_noche,
      bono_feriado,
      bono_riesgo,
      otros_bonos,
      activo,
      fecha_inactivacion
    ) VALUES (
      p_rol_id,
      p_sueldo_base,
      COALESCE((p_bonos->>'bono_asistencia')::INTEGER, 0),
      COALESCE((p_bonos->>'bono_responsabilidad')::INTEGER, 0),
      COALESCE((p_bonos->>'bono_noche')::INTEGER, 0),
      COALESCE((p_bonos->>'bono_feriado')::INTEGER, 0),
      COALESCE((p_bonos->>'bono_riesgo')::INTEGER, 0),
      COALESCE(p_bonos->'otros_bonos', '[]'::jsonb),
      true,
      NULL
    ) RETURNING id INTO v_estructura_nueva_id;
    
    -- 5. Obtener datos de la nueva estructura
    SELECT to_jsonb(es.*) INTO v_estructura_nueva
    FROM sueldo_estructuras_roles es
    WHERE es.id = v_estructura_nueva_id;
    
    -- 6. Registrar creación en historial
    INSERT INTO historial_estructuras_servicio (
      rol_servicio_id,
      estructura_id,
      accion,
      fecha_accion,
      detalles,
      usuario_id,
      datos_anteriores,
      datos_nuevos
    ) VALUES (
      p_rol_id,
      v_estructura_nueva_id,
      'NUEVA_ESTRUCTURA',
      NOW(),
      COALESCE(p_motivo, 'Nueva estructura creada'),
      p_usuario_id,
      v_estructura_anterior,
      v_estructura_nueva
    );
    
    -- 7. Preparar resultado
    v_resultado := jsonb_build_object(
      'success', true,
      'rol_id', p_rol_id,
      'estructura_id', v_estructura_nueva_id,
      'accion', 'NUEVA_ESTRUCTURA',
      'fecha_creacion', NOW(),
      'estructura_anterior_inactivada', v_estructura_anterior IS NOT NULL,
      'motivo', COALESCE(p_motivo, 'Creación de nueva estructura'),
      'detalles', jsonb_build_object(
        'rol_info', v_rol_info,
        'estructura_anterior', v_estructura_anterior,
        'estructura_nueva', v_estructura_nueva
      )
    );
    
    RETURN v_resultado;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback automático en caso de error
      RAISE EXCEPTION 'Error creando nueva estructura: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. FUNCIÓN PARA REACTIVAR ROL DE SERVICIO
-- =====================================================

CREATE OR REPLACE FUNCTION reactivar_rol_servicio_completo(
  p_rol_id UUID,
  p_motivo TEXT DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
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
    
    -- 4. Reactivar la estructura más reciente (si existe)
    UPDATE sueldo_estructuras_roles
    SET 
      activo = true,
      fecha_inactivacion = NULL,
      updated_at = NOW()
    WHERE rol_servicio_id = p_rol_id 
      AND activo = false
      AND fecha_inactivacion IS NOT NULL
      AND fecha_inactivacion = (
        SELECT MAX(fecha_inactivacion)
        FROM sueldo_estructuras_roles
        WHERE rol_servicio_id = p_rol_id AND activo = false
      );
    
    -- 5. Obtener datos de la estructura reactivada
    SELECT to_jsonb(es.*) INTO v_estructura_reactivada
    FROM sueldo_estructuras_roles es
    WHERE es.rol_servicio_id = p_rol_id AND es.activo = true;
    
    -- 6. Registrar en historial de roles
    INSERT INTO historial_roles_servicio (
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
    
    -- 7. Registrar reactivación de estructura (si se reactivó)
    IF v_estructura_reactivada IS NOT NULL THEN
      INSERT INTO historial_estructuras_servicio (
        rol_servicio_id,
        estructura_id,
        accion,
        fecha_accion,
        detalles,
        usuario_id,
        datos_anteriores,
        datos_nuevos
      ) VALUES (
        p_rol_id,
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

-- =====================================================
-- 4. FUNCIÓN PARA OBTENER ROLES DE SERVICIO
-- =====================================================

CREATE OR REPLACE FUNCTION get_roles_servicio(
  p_tenant_id TEXT DEFAULT '1',
  p_activo BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  descripcion TEXT,
  estado TEXT,
  activo BOOLEAN,
  tenant_id TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  fecha_inactivacion TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rs.id,
    rs.nombre,
    rs.descripcion,
    rs.estado,
    rs.activo,
    rs.tenant_id,
    rs.created_at,
    rs.updated_at,
    rs.fecha_inactivacion
  FROM as_turnos_roles_servicio rs
  WHERE rs.tenant_id = p_tenant_id
    AND (p_activo IS NULL OR rs.activo = p_activo)
  ORDER BY rs.nombre;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. FUNCIÓN PARA CREAR ROL DE SERVICIO
-- =====================================================

CREATE OR REPLACE FUNCTION create_rol_servicio(
  p_nombre TEXT,
  p_descripcion TEXT DEFAULT NULL,
  p_activo BOOLEAN DEFAULT true,
  p_tenant_id TEXT DEFAULT '1'
)
RETURNS JSONB AS $$
DECLARE
  v_rol_id UUID;
  v_resultado JSONB;
BEGIN
  -- Verificar que el nombre no esté duplicado para el tenant
  IF EXISTS (
    SELECT 1 FROM as_turnos_roles_servicio 
    WHERE nombre = p_nombre AND tenant_id = p_tenant_id
  ) THEN
    RETURN jsonb_build_object('error', 'Ya existe un rol de servicio con ese nombre en este tenant');
  END IF;
  
  -- Insertar nuevo rol
  INSERT INTO as_turnos_roles_servicio (
    nombre,
    descripcion,
    activo,
    tenant_id,
    estado
  ) VALUES (
    p_nombre,
    p_descripcion,
    p_activo,
    p_tenant_id,
    CASE WHEN p_activo THEN 'Activo' ELSE 'Inactivo' END
  ) RETURNING id INTO v_rol_id;
  
  -- Obtener el rol creado
  SELECT to_jsonb(rs.*) INTO v_resultado
  FROM as_turnos_roles_servicio rs
  WHERE rs.id = v_rol_id;
  
  RETURN v_resultado;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Error al crear rol de servicio: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. VERIFICACIÓN DE CREACIÓN
-- =====================================================

DO $$
BEGIN
  -- Verificar que las funciones se crearon correctamente
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'inactivar_rol_servicio_completo') THEN
    RAISE NOTICE '✅ Función inactivar_rol_servicio_completo creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear inactivar_rol_servicio_completo';
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'crear_nueva_estructura_servicio') THEN
    RAISE NOTICE '✅ Función crear_nueva_estructura_servicio creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear crear_nueva_estructura_servicio';
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'reactivar_rol_servicio_completo') THEN
    RAISE NOTICE '✅ Función reactivar_rol_servicio_completo creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear reactivar_rol_servicio_completo';
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'get_roles_servicio') THEN
    RAISE NOTICE '✅ Función get_roles_servicio creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear get_roles_servicio';
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'create_rol_servicio') THEN
    RAISE NOTICE '✅ Función create_rol_servicio creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear create_rol_servicio';
  END IF;
  
  RAISE NOTICE '🎉 Funciones de base de datos creadas correctamente';
END $$;
