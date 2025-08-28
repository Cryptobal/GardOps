--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: actualizar_timestamp(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.actualizar_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_timestamp() OWNER TO neondb_owner;

--
-- Name: asignar_guardia_puesto(uuid, uuid); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.asignar_guardia_puesto(p_puesto_id uuid, p_guardia_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
      BEGIN
        UPDATE as_turnos_puestos_operativos
        SET guardia_id = p_guardia_id, es_ppc = false
        WHERE id = p_puesto_id;
      END;
      $$;


ALTER FUNCTION public.asignar_guardia_puesto(p_puesto_id uuid, p_guardia_id uuid) OWNER TO neondb_owner;

--
-- Name: crear_estructura_sueldo_automatica(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.crear_estructura_sueldo_automatica() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- Crear estructura base cuando se crea un nuevo rol
        INSERT INTO sueldo_estructuras_roles (
          rol_servicio_id,
          sueldo_base,
          bono_asistencia,
          bono_responsabilidad,
          bono_noche,
          bono_feriado,
          bono_riesgo,
          activo
        ) VALUES (
          NEW.id,
          680000, -- Sueldo base por defecto
          0,
          0,
          0,
          0,
          0,
          true
        );
        
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.crear_estructura_sueldo_automatica() OWNER TO neondb_owner;

--
-- Name: crear_nueva_estructura_servicio(uuid, integer, jsonb, text, uuid); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.crear_nueva_estructura_servicio(p_rol_id uuid, p_sueldo_base integer DEFAULT 680000, p_bonos jsonb DEFAULT '{}'::jsonb, p_motivo text DEFAULT NULL::text, p_usuario_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.crear_nueva_estructura_servicio(p_rol_id uuid, p_sueldo_base integer, p_bonos jsonb, p_motivo text, p_usuario_id uuid) OWNER TO neondb_owner;

--
-- Name: crear_puestos_turno(uuid, uuid, integer, uuid); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.crear_puestos_turno(p_instalacion_id uuid, p_rol_id uuid, p_cantidad_guardias integer, p_tenant_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
      DECLARE
        i INTEGER;
      BEGIN
        FOR i IN 1..p_cantidad_guardias LOOP
          INSERT INTO as_turnos_puestos_operativos 
          (instalacion_id, rol_id, guardia_id, nombre_puesto, es_ppc, tenant_id)
          VALUES (p_instalacion_id, p_rol_id, NULL, 'Puesto #' || i, true, p_tenant_id);
        END LOOP;
      END;
      $$;


ALTER FUNCTION public.crear_puestos_turno(p_instalacion_id uuid, p_rol_id uuid, p_cantidad_guardias integer, p_tenant_id uuid) OWNER TO neondb_owner;

--
-- Name: create_estructura_sueldo(uuid, text, integer, text, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, numeric, numeric, boolean, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.create_estructura_sueldo(p_rol_id uuid, p_nombre text, p_sueldo_base integer, p_descripcion text DEFAULT NULL::text, p_bonificacion_nocturna integer DEFAULT 0, p_bonificacion_festivo integer DEFAULT 0, p_bonificacion_riesgo integer DEFAULT 0, p_bonificacion_zona integer DEFAULT 0, p_bonificacion_especialidad integer DEFAULT 0, p_bonificacion_antiguedad integer DEFAULT 0, p_bonificacion_presentismo integer DEFAULT 0, p_bonificacion_rendimiento integer DEFAULT 0, p_bonificacion_transporte integer DEFAULT 0, p_bonificacion_alimentacion integer DEFAULT 0, p_bonificacion_otros integer DEFAULT 0, p_descuento_afp numeric DEFAULT 0, p_descuento_salud numeric DEFAULT 0, p_descuento_impuesto numeric DEFAULT 0, p_descuento_otros numeric DEFAULT 0, p_activo boolean DEFAULT true, p_tenant_id text DEFAULT '1'::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
        DECLARE
          v_estructura_id UUID;
          v_resultado JSONB;
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM as_turnos_roles_servicio WHERE id = p_rol_id) THEN
            RETURN jsonb_build_object('error', 'Rol de servicio no encontrado');
          END IF;

          UPDATE sueldo_estructuras_roles
          SET activo = false, updated_at = NOW()
          WHERE rol_servicio_id = p_rol_id AND activo = true;

          INSERT INTO sueldo_estructuras_roles (
            rol_servicio_id,
            sueldo_base,
            bono_asistencia,
            bono_responsabilidad,
            bono_noche,
            bono_feriado,
            bono_riesgo,
            otros_bonos,
            activo
          ) VALUES (
            p_rol_id,
            p_sueldo_base,
            p_bonificacion_presentismo,
            p_bonificacion_especialidad,
            p_bonificacion_nocturna,
            p_bonificacion_festivo,
            p_bonificacion_riesgo,
            jsonb_build_object(
              'zona', p_bonificacion_zona,
              'antiguedad', p_bonificacion_antiguedad,
              'rendimiento', p_bonificacion_rendimiento,
              'transporte', p_bonificacion_transporte,
              'alimentacion', p_bonificacion_alimentacion,
              'otros', p_bonificacion_otros
            ),
            p_activo
          ) RETURNING id INTO v_estructura_id;

          SELECT to_jsonb(es.*) INTO v_resultado
          FROM sueldo_estructuras_roles es
          WHERE es.id = v_estructura_id;

          RETURN v_resultado;
        END;
        $$;


ALTER FUNCTION public.create_estructura_sueldo(p_rol_id uuid, p_nombre text, p_sueldo_base integer, p_descripcion text, p_bonificacion_nocturna integer, p_bonificacion_festivo integer, p_bonificacion_riesgo integer, p_bonificacion_zona integer, p_bonificacion_especialidad integer, p_bonificacion_antiguedad integer, p_bonificacion_presentismo integer, p_bonificacion_rendimiento integer, p_bonificacion_transporte integer, p_bonificacion_alimentacion integer, p_bonificacion_otros integer, p_descuento_afp numeric, p_descuento_salud numeric, p_descuento_impuesto numeric, p_descuento_otros numeric, p_activo boolean, p_tenant_id text) OWNER TO neondb_owner;

--
-- Name: create_rol_servicio(text, text, boolean, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.create_rol_servicio(p_nombre text, p_descripcion text DEFAULT NULL::text, p_activo boolean DEFAULT true, p_tenant_id text DEFAULT '1'::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_rol_id UUID;
  v_resultado JSONB;
BEGIN
  -- Verificar que el nombre no esté duplicado para el tenant
  IF EXISTS (
    SELECT 1 FROM roles_servicio 
    WHERE nombre = p_nombre AND (tenant_id::text = p_tenant_id OR (tenant_id IS NULL AND p_tenant_id = '1'))
  ) THEN
    RETURN jsonb_build_object('error', 'Ya existe un rol de servicio con ese nombre en este tenant');
  END IF;
  
  -- Insertar nuevo rol
  INSERT INTO roles_servicio (
    nombre,
    descripcion,
    activo,
    tenant_id
  ) VALUES (
    p_nombre,
    p_descripcion,
    p_activo,
    CASE WHEN p_tenant_id = '1' THEN NULL ELSE p_tenant_id::uuid END
  ) RETURNING id INTO v_rol_id;
  
  -- Obtener el rol creado
  SELECT to_jsonb(rs.*) INTO v_resultado
  FROM roles_servicio rs
  WHERE rs.id = v_rol_id;
  
  RETURN v_resultado;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Error al crear rol de servicio: ' || SQLERRM);
END;
$$;


ALTER FUNCTION public.create_rol_servicio(p_nombre text, p_descripcion text, p_activo boolean, p_tenant_id text) OWNER TO neondb_owner;

--
-- Name: delete_estructura_sueldo(uuid, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.delete_estructura_sueldo(p_id uuid, p_tenant_id text DEFAULT '1'::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
        DECLARE
          v_resultado JSONB;
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM sueldo_estructuras_roles WHERE id = p_id) THEN
            RETURN jsonb_build_object('error', 'Estructura de sueldo no encontrada');
          END IF;

          DELETE FROM sueldo_estructuras_roles WHERE id = p_id;

          RETURN jsonb_build_object('success', true, 'message', 'Estructura eliminada correctamente');
        END;
        $$;


ALTER FUNCTION public.delete_estructura_sueldo(p_id uuid, p_tenant_id text) OWNER TO neondb_owner;

--
-- Name: desasignar_guardia_puesto(uuid); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.desasignar_guardia_puesto(p_puesto_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
      BEGIN
        UPDATE as_turnos_puestos_operativos
        SET guardia_id = NULL, es_ppc = true
        WHERE id = p_puesto_id;
      END;
      $$;


ALTER FUNCTION public.desasignar_guardia_puesto(p_puesto_id uuid) OWNER TO neondb_owner;

--
-- Name: eliminar_puestos_turno(uuid, uuid); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.eliminar_puestos_turno(p_instalacion_id uuid, p_rol_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
      BEGIN
        DELETE FROM as_turnos_puestos_operativos 
        WHERE instalacion_id = p_instalacion_id AND rol_id = p_rol_id;
      END;
      $$;


ALTER FUNCTION public.eliminar_puestos_turno(p_instalacion_id uuid, p_rol_id uuid) OWNER TO neondb_owner;

--
-- Name: get_estructura_sueldo_by_id(uuid, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.get_estructura_sueldo_by_id(p_id uuid, p_tenant_id text DEFAULT '1'::text) RETURNS TABLE(id uuid, rol_servicio_id uuid, rol_nombre text, sueldo_base integer, bono_asistencia integer, bono_responsabilidad integer, bono_noche integer, bono_feriado integer, bono_riesgo integer, otros_bonos jsonb, activo boolean, created_at timestamp without time zone, updated_at timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            es.id,
            es.rol_servicio_id,
            rs.nombre as rol_nombre,
            es.sueldo_base,
            es.bono_asistencia,
            es.bono_responsabilidad,
            es.bono_noche,
            es.bono_feriado,
            es.bono_riesgo,
            es.otros_bonos,
            es.activo,
            es.created_at,
            es.updated_at
          FROM sueldo_estructuras_roles es
          INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
          WHERE es.id = p_id;
        END;
        $$;


ALTER FUNCTION public.get_estructura_sueldo_by_id(p_id uuid, p_tenant_id text) OWNER TO neondb_owner;

--
-- Name: get_estructuras_sueldo(text, boolean, uuid); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.get_estructuras_sueldo(p_tenant_id text DEFAULT '1'::text, p_activo boolean DEFAULT true, p_rol_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, rol_servicio_id uuid, rol_nombre text, sueldo_base integer, bono_asistencia integer, bono_responsabilidad integer, bono_noche integer, bono_feriado integer, bono_riesgo integer, otros_bonos jsonb, activo boolean, created_at timestamp without time zone, updated_at timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            es.id,
            es.rol_servicio_id,
            rs.nombre as rol_nombre,
            es.sueldo_base,
            es.bono_asistencia,
            es.bono_responsabilidad,
            es.bono_noche,
            es.bono_feriado,
            es.bono_riesgo,
            es.otros_bonos,
            es.activo,
            es.created_at,
            es.updated_at
          FROM sueldo_estructuras_roles es
          INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
          WHERE es.activo = p_activo
            AND (p_rol_id IS NULL OR es.rol_servicio_id = p_rol_id)
          ORDER BY rs.nombre, es.created_at DESC;
        END;
        $$;


ALTER FUNCTION public.get_estructuras_sueldo(p_tenant_id text, p_activo boolean, p_rol_id uuid) OWNER TO neondb_owner;

--
-- Name: get_roles_servicio(text, boolean); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.get_roles_servicio(p_tenant_id text DEFAULT '1'::text, p_activo boolean DEFAULT true) RETURNS TABLE(id uuid, nombre text, descripcion text, estado text, activo boolean, tenant_id text, created_at timestamp without time zone, updated_at timestamp without time zone, fecha_inactivacion timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rs.id,
    rs.nombre,
    rs.descripcion,
    CASE WHEN rs.activo THEN 'Activo' ELSE 'Inactivo' END as estado,
    rs.activo,
    rs.tenant_id,
    rs.creado_en as created_at,
    rs.creado_en as updated_at,
    NULL as fecha_inactivacion
  FROM roles_servicio rs
  WHERE (p_tenant_id IS NULL OR rs.tenant_id::text = p_tenant_id)
    AND (p_activo IS NULL OR rs.activo = p_activo)
  ORDER BY rs.nombre;
END;
$$;


ALTER FUNCTION public.get_roles_servicio(p_tenant_id text, p_activo boolean) OWNER TO neondb_owner;

--
-- Name: get_roles_servicio_stats(text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.get_roles_servicio_stats(p_tenant_id text DEFAULT '1'::text) RETURNS TABLE(total_roles bigint, roles_activos bigint, roles_inactivos bigint, total_estructuras bigint, estructuras_activas bigint, estructuras_inactivas bigint, roles_con_estructura bigint, roles_sin_estructura bigint)
    LANGUAGE plpgsql
    AS $$
      BEGIN
        RETURN QUERY
        WITH roles_stats AS (
          SELECT 
            COUNT(*) as total_roles,
            COUNT(*) FILTER (WHERE estado = 'Activo') as roles_activos,
            COUNT(*) FILTER (WHERE estado = 'Inactivo') as roles_inactivos
          FROM as_turnos_roles_servicio 
          WHERE (tenant_id::text = p_tenant_id OR (tenant_id IS NULL AND p_tenant_id = '1'))
        ),
        estructuras_stats AS (
          SELECT 
            COUNT(*) as total_estructuras,
            COUNT(*) FILTER (WHERE estado = 'Activo') as estructuras_activas,
            COUNT(*) FILTER (WHERE estado = 'Inactivo') as estructuras_inactivas
          FROM as_turnos_estructuras_servicio 
          WHERE (tenant_id::text = p_tenant_id OR (tenant_id IS NULL AND p_tenant_id = '1'))
        ),
        roles_con_estructura_stats AS (
          SELECT 
            COUNT(DISTINCT rs.id) as roles_con_estructura,
            (SELECT COUNT(*) FROM as_turnos_roles_servicio 
             WHERE (tenant_id::text = p_tenant_id OR (tenant_id IS NULL AND p_tenant_id = '1'))) - 
            COUNT(DISTINCT rs.id) as roles_sin_estructura
          FROM as_turnos_roles_servicio rs
          INNER JOIN as_turnos_estructuras_servicio es ON es.rol_servicio_id = rs.id
          WHERE (rs.tenant_id::text = p_tenant_id OR (rs.tenant_id IS NULL AND p_tenant_id = '1'))
        )
        SELECT 
          rs.total_roles,
          rs.roles_activos,
          rs.roles_inactivos,
          COALESCE(es.total_estructuras, 0),
          COALESCE(es.estructuras_activas, 0),
          COALESCE(es.estructuras_inactivas, 0),
          COALESCE(rcs.roles_con_estructura, 0),
          COALESCE(rcs.roles_sin_estructura, 0)
        FROM roles_stats rs
        CROSS JOIN LATERAL (SELECT 1) dummy
        LEFT JOIN estructuras_stats es ON true
        LEFT JOIN roles_con_estructura_stats rcs ON true;
      END;
      $$;


ALTER FUNCTION public.get_roles_servicio_stats(p_tenant_id text) OWNER TO neondb_owner;

--
-- Name: inactivar_rol_servicio_completo(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.inactivar_rol_servicio_completo(p_rol_id uuid, p_motivo text DEFAULT NULL::text, p_usuario_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.inactivar_rol_servicio_completo(p_rol_id uuid, p_motivo text, p_usuario_id uuid) OWNER TO neondb_owner;

--
-- Name: reactivar_rol_servicio_completo(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.reactivar_rol_servicio_completo(p_rol_id uuid, p_motivo text DEFAULT NULL::text, p_usuario_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.reactivar_rol_servicio_completo(p_rol_id uuid, p_motivo text, p_usuario_id uuid) OWNER TO neondb_owner;

--
-- Name: update_asistencia_diaria_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_asistencia_diaria_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_asistencia_diaria_updated_at() OWNER TO neondb_owner;

--
-- Name: update_estructura_sueldo(uuid, uuid, text, integer, text, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, numeric, numeric, boolean, text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_estructura_sueldo(p_id uuid, p_rol_id uuid, p_nombre text, p_sueldo_base integer, p_descripcion text DEFAULT NULL::text, p_bonificacion_nocturna integer DEFAULT 0, p_bonificacion_festivo integer DEFAULT 0, p_bonificacion_riesgo integer DEFAULT 0, p_bonificacion_zona integer DEFAULT 0, p_bonificacion_especialidad integer DEFAULT 0, p_bonificacion_antiguedad integer DEFAULT 0, p_bonificacion_presentismo integer DEFAULT 0, p_bonificacion_rendimiento integer DEFAULT 0, p_bonificacion_transporte integer DEFAULT 0, p_bonificacion_alimentacion integer DEFAULT 0, p_bonificacion_otros integer DEFAULT 0, p_descuento_afp numeric DEFAULT 0, p_descuento_salud numeric DEFAULT 0, p_descuento_impuesto numeric DEFAULT 0, p_descuento_otros numeric DEFAULT 0, p_activo boolean DEFAULT true, p_tenant_id text DEFAULT '1'::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
        DECLARE
          v_resultado JSONB;
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM sueldo_estructuras_roles WHERE id = p_id) THEN
            RETURN jsonb_build_object('error', 'Estructura de sueldo no encontrada');
          END IF;

          UPDATE sueldo_estructuras_roles
          SET 
            rol_servicio_id = p_rol_id,
            sueldo_base = p_sueldo_base,
            bono_asistencia = p_bonificacion_presentismo,
            bono_responsabilidad = p_bonificacion_especialidad,
            bono_noche = p_bonificacion_nocturna,
            bono_feriado = p_bonificacion_festivo,
            bono_riesgo = p_bonificacion_riesgo,
            otros_bonos = jsonb_build_object(
              'zona', p_bonificacion_zona,
              'antiguedad', p_bonificacion_antiguedad,
              'rendimiento', p_bonificacion_rendimiento,
              'transporte', p_bonificacion_transporte,
              'alimentacion', p_bonificacion_alimentacion,
              'otros', p_bonificacion_otros
            ),
            activo = p_activo,
            updated_at = NOW()
          WHERE id = p_id;

          SELECT to_jsonb(es.*) INTO v_resultado
          FROM sueldo_estructuras_roles es
          WHERE es.id = p_id;

          RETURN v_resultado;
        END;
        $$;


ALTER FUNCTION public.update_estructura_sueldo(p_id uuid, p_rol_id uuid, p_nombre text, p_sueldo_base integer, p_descripcion text, p_bonificacion_nocturna integer, p_bonificacion_festivo integer, p_bonificacion_riesgo integer, p_bonificacion_zona integer, p_bonificacion_especialidad integer, p_bonificacion_antiguedad integer, p_bonificacion_presentismo integer, p_bonificacion_rendimiento integer, p_bonificacion_transporte integer, p_bonificacion_alimentacion integer, p_bonificacion_otros integer, p_descuento_afp numeric, p_descuento_salud numeric, p_descuento_impuesto numeric, p_descuento_otros numeric, p_activo boolean, p_tenant_id text) OWNER TO neondb_owner;

--
-- Name: update_sueldo_estructuras_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_sueldo_estructuras_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_sueldo_estructuras_updated_at() OWNER TO neondb_owner;

--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
          BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
          END;
          $$;


ALTER FUNCTION public.update_timestamp() OWNER TO neondb_owner;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO neondb_owner;

--
-- Name: validar_asignacion_unica(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.validar_asignacion_unica() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- Verificar que el guardia no tenga otra asignación activa
        IF EXISTS (
          SELECT 1 
          FROM as_turnos_asignaciones
          WHERE guardia_id = NEW.guardia_id
            AND estado = 'Activa'
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) THEN
          RAISE EXCEPTION 'El guardia ya tiene una asignación activa';
        END IF;
        
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.validar_asignacion_unica() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: afps; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.afps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.afps OWNER TO neondb_owner;

--
-- Name: alertas_documentos; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.alertas_documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    documento_id uuid NOT NULL,
    dias_restantes integer NOT NULL,
    mensaje text NOT NULL,
    creada_en timestamp without time zone DEFAULT now(),
    leida boolean DEFAULT false,
    tenant_id uuid NOT NULL
);


ALTER TABLE public.alertas_documentos OWNER TO neondb_owner;

--
-- Name: as_turnos_pauta_mensual; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.as_turnos_pauta_mensual (
    id integer NOT NULL,
    puesto_id uuid NOT NULL,
    guardia_id uuid,
    anio integer NOT NULL,
    mes integer NOT NULL,
    dia integer NOT NULL,
    estado text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    observaciones text,
    reemplazo_guardia_id text,
    CONSTRAINT as_turnos_pauta_mensual_estado_check CHECK ((estado = ANY (ARRAY['T'::text, 'trabajado'::text, 'inasistencia'::text, 'reemplazo'::text, 'libre'::text, 'sin_cobertura'::text])))
);


ALTER TABLE public.as_turnos_pauta_mensual OWNER TO neondb_owner;

--
-- Name: COLUMN as_turnos_pauta_mensual.estado; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.as_turnos_pauta_mensual.estado IS 'Estados: T=Asignado, trabajado=Asistido, inasistencia=No asistió, reemplazo=Con reemplazo, libre=Disponible';


--
-- Name: as_turnos_pauta_mensual_new_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.as_turnos_pauta_mensual_new_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.as_turnos_pauta_mensual_new_id_seq OWNER TO neondb_owner;

--
-- Name: as_turnos_pauta_mensual_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.as_turnos_pauta_mensual_new_id_seq OWNED BY public.as_turnos_pauta_mensual.id;


--
-- Name: as_turnos_puestos_operativos; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.as_turnos_puestos_operativos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instalacion_id uuid NOT NULL,
    rol_id uuid NOT NULL,
    guardia_id uuid,
    nombre_puesto character varying(255) NOT NULL,
    es_ppc boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT now(),
    tenant_id uuid,
    activo boolean DEFAULT true,
    eliminado_por uuid,
    eliminado_en timestamp without time zone,
    observaciones text,
    actualizado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE public.as_turnos_puestos_operativos OWNER TO neondb_owner;

--
-- Name: COLUMN as_turnos_puestos_operativos.activo; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.as_turnos_puestos_operativos.activo IS 'Indica si el puesto está activo (true) o inactivo (false)';


--
-- Name: COLUMN as_turnos_puestos_operativos.eliminado_por; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.as_turnos_puestos_operativos.eliminado_por IS 'ID del usuario que eliminó/inactivó el puesto';


--
-- Name: COLUMN as_turnos_puestos_operativos.eliminado_en; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.as_turnos_puestos_operativos.eliminado_en IS 'Fecha y hora cuando el puesto fue eliminado/inactivado';


--
-- Name: COLUMN as_turnos_puestos_operativos.observaciones; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.as_turnos_puestos_operativos.observaciones IS 'Comentarios adicionales sobre el puesto';


--
-- Name: COLUMN as_turnos_puestos_operativos.actualizado_en; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.as_turnos_puestos_operativos.actualizado_en IS 'Fecha y hora de la última actualización del puesto';


--
-- Name: as_turnos_roles_servicio; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.as_turnos_roles_servicio (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    dias_trabajo integer NOT NULL,
    dias_descanso integer NOT NULL,
    horas_turno integer NOT NULL,
    estado text DEFAULT 'Activo'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    hora_inicio text DEFAULT '08:00'::text NOT NULL,
    hora_termino text DEFAULT '16:00'::text NOT NULL,
    nombre text,
    tenant_id uuid,
    fecha_inactivacion timestamp without time zone,
    CONSTRAINT roles_servicio_estado_check CHECK ((estado = ANY (ARRAY['Activo'::text, 'Inactivo'::text])))
);


ALTER TABLE public.as_turnos_roles_servicio OWNER TO neondb_owner;

--
-- Name: bancos; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bancos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    codigo text NOT NULL,
    nombre text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bancos OWNER TO neondb_owner;

--
-- Name: clientes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.clientes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre text NOT NULL,
    rut text NOT NULL,
    representante_legal text,
    rut_representante text,
    estado text DEFAULT 'Activo'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    razon_social character varying(255),
    tenant_id uuid,
    email text,
    telefono text,
    direccion text,
    latitud double precision,
    longitud double precision,
    ciudad text,
    comuna text,
    CONSTRAINT check_cliente_estado CHECK ((estado = ANY (ARRAY['Activo'::text, 'Inactivo'::text, 'Suspendido'::text])))
);


ALTER TABLE public.clientes OWNER TO neondb_owner;

--
-- Name: comunas; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.comunas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(100) NOT NULL,
    region character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.comunas OWNER TO neondb_owner;

--
-- Name: doc_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.doc_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    content_html text NOT NULL,
    variables text[] DEFAULT '{}'::text[],
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.doc_templates OWNER TO neondb_owner;

--
-- Name: documentos; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    tipo text,
    url text NOT NULL,
    guardia_id uuid,
    instalacion_id uuid,
    creado_en timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_documento_id uuid,
    contenido_archivo bytea,
    fecha_vencimiento date,
    CONSTRAINT documentos_tipo_check CHECK ((tipo = ANY (ARRAY['contrato'::text, 'finiquito'::text, 'f30'::text, 'f30-1'::text, 'directiva'::text, 'otros'::text])))
);


ALTER TABLE public.documentos OWNER TO neondb_owner;

--
-- Name: documentos_clientes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documentos_clientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    nombre text NOT NULL,
    tipo text NOT NULL,
    archivo_url text NOT NULL,
    "tamaño" integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    tipo_documento_id uuid,
    contenido_archivo bytea,
    fecha_vencimiento date,
    tenant_id uuid
);


ALTER TABLE public.documentos_clientes OWNER TO neondb_owner;

--
-- Name: documentos_guardias; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documentos_guardias (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    guardia_id uuid,
    tipo text NOT NULL,
    url text NOT NULL,
    fecha_subida timestamp without time zone DEFAULT now(),
    tenant_id uuid,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_documento_id uuid,
    contenido_archivo bytea,
    fecha_vencimiento date
);


ALTER TABLE public.documentos_guardias OWNER TO neondb_owner;

--
-- Name: documentos_instalacion; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documentos_instalacion (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    instalacion_id uuid,
    tipo text,
    url text NOT NULL,
    fecha_subida timestamp without time zone DEFAULT now(),
    tenant_id uuid,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_documento_id uuid,
    contenido_archivo bytea,
    fecha_vencimiento date
);


ALTER TABLE public.documentos_instalacion OWNER TO neondb_owner;

--
-- Name: documentos_tipos; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documentos_tipos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    modulo text NOT NULL,
    nombre text NOT NULL,
    creado_en timestamp without time zone DEFAULT now(),
    requiere_vencimiento boolean DEFAULT false,
    dias_antes_alarma integer DEFAULT 30,
    activo boolean DEFAULT true,
    tenant_id uuid
);


ALTER TABLE public.documentos_tipos OWNER TO neondb_owner;

--
-- Name: documentos_usuarios; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documentos_usuarios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    tipo text NOT NULL,
    nombre_archivo text NOT NULL,
    url text NOT NULL,
    fecha_subida timestamp without time zone DEFAULT now(),
    observaciones text,
    tenant_id uuid,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_documento_id uuid,
    contenido_archivo bytea
);


ALTER TABLE public.documentos_usuarios OWNER TO neondb_owner;

--
-- Name: firmas; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.firmas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    documento_id uuid,
    usuario_id uuid,
    tipo text,
    metodo text,
    fecha timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT firmas_metodo_check CHECK ((metodo = ANY (ARRAY['otp'::text, 'token'::text, 'biometria'::text]))),
    CONSTRAINT firmas_tipo_check CHECK ((tipo = ANY (ARRAY['simple'::text, 'avanzada'::text])))
);


ALTER TABLE public.firmas OWNER TO neondb_owner;

--
-- Name: guardias; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.guardias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    nombre text NOT NULL,
    email text,
    telefono text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    usuario_id uuid,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    latitud numeric(10,8),
    longitud numeric(11,8),
    ciudad character varying(100),
    comuna character varying(100),
    region character varying(100),
    rut text,
    apellido_paterno text DEFAULT ''::text NOT NULL,
    apellido_materno text DEFAULT ''::text NOT NULL,
    nacionalidad text,
    sexo text,
    direccion text,
    fecha_os10 date,
    created_from_excel boolean DEFAULT false,
    instalacion_id uuid,
    banco uuid,
    tipo_cuenta text,
    numero_cuenta text,
    tipo_guardia character varying(20) DEFAULT 'contratado'::character varying,
    CONSTRAINT guardias_sexo_check CHECK ((sexo = ANY (ARRAY['Hombre'::text, 'Mujer'::text]))),
    CONSTRAINT guardias_tipo_cuenta_check CHECK ((tipo_cuenta = ANY (ARRAY['CCT'::text, 'CTE'::text, 'CTA'::text, 'RUT'::text]))),
    CONSTRAINT guardias_tipo_guardia_check CHECK (((tipo_guardia)::text = ANY ((ARRAY['contratado'::character varying, 'esporadico'::character varying])::text[])))
);


ALTER TABLE public.guardias OWNER TO neondb_owner;

--
-- Name: COLUMN guardias.latitud; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.guardias.latitud IS 'Latitud geográfica de la ubicación del guardia';


--
-- Name: COLUMN guardias.longitud; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.guardias.longitud IS 'Longitud geográfica de la ubicación del guardia';


--
-- Name: COLUMN guardias.ciudad; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.guardias.ciudad IS 'Ciudad de residencia del guardia';


--
-- Name: COLUMN guardias.comuna; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.guardias.comuna IS 'Comuna de residencia del guardia';


--
-- Name: COLUMN guardias.region; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.guardias.region IS 'Región de residencia del guardia';


--
-- Name: sueldo_historial_estructuras; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sueldo_historial_estructuras (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rol_servicio_id uuid NOT NULL,
    estructura_id uuid NOT NULL,
    accion character varying(50) NOT NULL,
    fecha_accion timestamp without time zone DEFAULT now() NOT NULL,
    detalles text,
    usuario_id uuid,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT historial_estructuras_servicio_accion_check CHECK (((accion)::text = ANY ((ARRAY['CREACION'::character varying, 'ACTUALIZACION'::character varying, 'INACTIVACION'::character varying, 'REACTIVACION'::character varying, 'NUEVA_ESTRUCTURA'::character varying, 'REEMPLAZO'::character varying])::text[])))
);


ALTER TABLE public.sueldo_historial_estructuras OWNER TO neondb_owner;

--
-- Name: TABLE sueldo_historial_estructuras; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.sueldo_historial_estructuras IS 'Historial completo de cambios en estructuras de servicio para auditoría';


--
-- Name: COLUMN sueldo_historial_estructuras.accion; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.sueldo_historial_estructuras.accion IS 'Tipo de acción realizada (CREACION, ACTUALIZACION, INACTIVACION, REACTIVACION, NUEVA_ESTRUCTURA)';


--
-- Name: COLUMN sueldo_historial_estructuras.datos_anteriores; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.sueldo_historial_estructuras.datos_anteriores IS 'Datos de la estructura antes del cambio (JSON)';


--
-- Name: COLUMN sueldo_historial_estructuras.datos_nuevos; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.sueldo_historial_estructuras.datos_nuevos IS 'Datos de la estructura después del cambio (JSON)';


--
-- Name: historial_estructuras_servicio; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.historial_estructuras_servicio AS
 SELECT id,
    rol_servicio_id,
    estructura_id,
    accion,
    fecha_accion,
    detalles,
    usuario_id,
    datos_anteriores,
    datos_nuevos,
    created_at
   FROM public.sueldo_historial_estructuras;


ALTER VIEW public.historial_estructuras_servicio OWNER TO neondb_owner;

--
-- Name: sueldo_historial_roles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sueldo_historial_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rol_servicio_id uuid NOT NULL,
    accion character varying(50) NOT NULL,
    fecha_accion timestamp without time zone DEFAULT now() NOT NULL,
    detalles text,
    usuario_id uuid,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT historial_roles_servicio_accion_check CHECK (((accion)::text = ANY ((ARRAY['ACTIVACION'::character varying, 'INACTIVACION'::character varying, 'MODIFICACION'::character varying, 'REACTIVACION'::character varying])::text[])))
);


ALTER TABLE public.sueldo_historial_roles OWNER TO neondb_owner;

--
-- Name: TABLE sueldo_historial_roles; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.sueldo_historial_roles IS 'Historial completo de cambios en roles de servicio para auditoría';


--
-- Name: COLUMN sueldo_historial_roles.accion; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.sueldo_historial_roles.accion IS 'Tipo de acción realizada (CREACION, ACTUALIZACION, INACTIVACION, REACTIVACION, ELIMINACION)';


--
-- Name: COLUMN sueldo_historial_roles.datos_anteriores; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.sueldo_historial_roles.datos_anteriores IS 'Datos del rol antes del cambio (JSON)';


--
-- Name: COLUMN sueldo_historial_roles.datos_nuevos; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.sueldo_historial_roles.datos_nuevos IS 'Datos del rol después del cambio (JSON)';


--
-- Name: historial_roles_servicio; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.historial_roles_servicio AS
 SELECT id,
    rol_servicio_id,
    accion,
    fecha_accion,
    detalles,
    usuario_id,
    datos_anteriores,
    datos_nuevos,
    created_at
   FROM public.sueldo_historial_roles;


ALTER VIEW public.historial_roles_servicio OWNER TO neondb_owner;

--
-- Name: instalaciones; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.instalaciones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cliente_id uuid,
    nombre text NOT NULL,
    direccion text,
    latitud numeric(10,8),
    longitud numeric(11,8),
    valor_turno_extra numeric(12,2),
    estado text DEFAULT 'Activo'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id uuid,
    ciudad character varying(100),
    comuna character varying(100),
    CONSTRAINT instalaciones_estado_check CHECK ((estado = ANY (ARRAY['Activo'::text, 'Inactivo'::text])))
);


ALTER TABLE public.instalaciones OWNER TO neondb_owner;

--
-- Name: isapres; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.isapres (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.isapres OWNER TO neondb_owner;

--
-- Name: logs_clientes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.logs_clientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    accion text NOT NULL,
    usuario text NOT NULL,
    tipo text DEFAULT 'manual'::text,
    contexto text,
    fecha timestamp without time zone DEFAULT now()
);


ALTER TABLE public.logs_clientes OWNER TO neondb_owner;

--
-- Name: logs_documentos; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.logs_documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    documento_id uuid NOT NULL,
    accion text NOT NULL,
    usuario text NOT NULL,
    tipo text DEFAULT 'manual'::text,
    contexto text,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    fecha timestamp without time zone DEFAULT now(),
    tenant_id uuid
);


ALTER TABLE public.logs_documentos OWNER TO neondb_owner;

--
-- Name: logs_guardias; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.logs_guardias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guardia_id uuid NOT NULL,
    accion text NOT NULL,
    usuario text NOT NULL,
    tipo text DEFAULT 'manual'::text,
    contexto text,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    fecha timestamp without time zone DEFAULT now(),
    tenant_id uuid
);


ALTER TABLE public.logs_guardias OWNER TO neondb_owner;

--
-- Name: logs_instalaciones; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.logs_instalaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instalacion_id uuid NOT NULL,
    accion text NOT NULL,
    usuario text DEFAULT 'Admin'::text NOT NULL,
    tipo text DEFAULT 'manual'::text NOT NULL,
    contexto text,
    fecha timestamp without time zone DEFAULT now()
);


ALTER TABLE public.logs_instalaciones OWNER TO neondb_owner;

--
-- Name: logs_pauta_diaria; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.logs_pauta_diaria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pauta_diaria_id uuid NOT NULL,
    accion text NOT NULL,
    usuario text NOT NULL,
    tipo text DEFAULT 'manual'::text,
    contexto text,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    fecha timestamp without time zone DEFAULT now(),
    tenant_id uuid
);


ALTER TABLE public.logs_pauta_diaria OWNER TO neondb_owner;

--
-- Name: logs_pauta_mensual; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.logs_pauta_mensual (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pauta_mensual_id uuid NOT NULL,
    accion text NOT NULL,
    usuario text NOT NULL,
    tipo text DEFAULT 'manual'::text,
    contexto text,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    fecha timestamp without time zone DEFAULT now(),
    tenant_id uuid
);


ALTER TABLE public.logs_pauta_mensual OWNER TO neondb_owner;

--
-- Name: logs_puestos_operativos; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.logs_puestos_operativos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    puesto_operativo_id uuid NOT NULL,
    accion text NOT NULL,
    usuario text NOT NULL,
    tipo text DEFAULT 'manual'::text,
    contexto text,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    fecha timestamp without time zone DEFAULT now(),
    tenant_id uuid
);


ALTER TABLE public.logs_puestos_operativos OWNER TO neondb_owner;

--
-- Name: logs_turnos_extras; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.logs_turnos_extras (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    turno_extra_id uuid NOT NULL,
    accion text NOT NULL,
    usuario text NOT NULL,
    tipo text DEFAULT 'manual'::text,
    contexto text,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    fecha timestamp without time zone DEFAULT now(),
    tenant_id uuid
);


ALTER TABLE public.logs_turnos_extras OWNER TO neondb_owner;

--
-- Name: logs_usuarios; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.logs_usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    accion text NOT NULL,
    usuario text NOT NULL,
    tipo text DEFAULT 'manual'::text,
    contexto text,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    fecha timestamp without time zone DEFAULT now(),
    tenant_id uuid
);


ALTER TABLE public.logs_usuarios OWNER TO neondb_owner;

--
-- Name: pagos_turnos_extras; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.pagos_turnos_extras (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guardia_id uuid NOT NULL,
    instalacion_id uuid NOT NULL,
    puesto_id uuid NOT NULL,
    pauta_id integer NOT NULL,
    fecha date NOT NULL,
    estado text,
    valor numeric NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pagos_turnos_extras_estado_check CHECK ((estado = ANY (ARRAY['reemplazo'::text, 'ppc'::text])))
);


ALTER TABLE public.pagos_turnos_extras OWNER TO neondb_owner;

--
-- Name: pautas_diarias; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.pautas_diarias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    pauta_mensual_id uuid,
    fecha date NOT NULL,
    guardia_asignado_id uuid,
    estado text NOT NULL,
    cobertura_por_id uuid,
    observacion text,
    creado_en timestamp without time zone DEFAULT now(),
    CONSTRAINT pautas_diarias_estado_check CHECK ((estado = ANY (ARRAY['asistio'::text, 'licencia'::text, 'falta_asignacion'::text, 'permiso'::text, 'libre'::text, 'ppc'::text, 'cobertura'::text])))
);


ALTER TABLE public.pautas_diarias OWNER TO neondb_owner;

--
-- Name: pautas_mensuales; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.pautas_mensuales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    instalacion_id uuid,
    guardia_id uuid,
    rol_servicio_id uuid,
    dia date NOT NULL,
    tipo text DEFAULT 'turno'::text,
    observacion text,
    creado_en timestamp without time zone DEFAULT now(),
    CONSTRAINT pautas_mensuales_tipo_check CHECK ((tipo = ANY (ARRAY['turno'::text, 'libre'::text, 'licencia'::text, 'permiso'::text, 'falta_asignacion'::text])))
);


ALTER TABLE public.pautas_mensuales OWNER TO neondb_owner;

--
-- Name: te_planillas_turnos_extras; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.te_planillas_turnos_extras (
    id integer NOT NULL,
    fecha_generacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuario_id uuid,
    monto_total numeric(10,2) NOT NULL,
    cantidad_turnos integer NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    fecha_pago timestamp without time zone,
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    codigo text,
    CONSTRAINT planillas_turnos_extras_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'pagada'::character varying])::text[])))
);


ALTER TABLE public.te_planillas_turnos_extras OWNER TO neondb_owner;

--
-- Name: planillas_turnos_extras_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.planillas_turnos_extras_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.planillas_turnos_extras_id_seq OWNER TO neondb_owner;

--
-- Name: planillas_turnos_extras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.planillas_turnos_extras_id_seq OWNED BY public.te_planillas_turnos_extras.id;


--
-- Name: puestos_por_cubrir; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.puestos_por_cubrir (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    pauta_diaria_id uuid,
    instalacion_id uuid,
    rol_servicio_id uuid,
    motivo text DEFAULT 'falta_asignacion'::text,
    observacion text,
    creado_en timestamp without time zone DEFAULT now(),
    CONSTRAINT puestos_por_cubrir_motivo_check CHECK ((motivo = ANY (ARRAY['falta_asignacion'::text, 'falta_con_aviso'::text, 'ausencia_temporal'::text, 'renuncia'::text])))
);


ALTER TABLE public.puestos_por_cubrir OWNER TO neondb_owner;

--
-- Name: roles_servicio; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.roles_servicio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    nombre text NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE public.roles_servicio OWNER TO neondb_owner;

--
-- Name: rondas; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rondas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    guardia_id uuid,
    instalacion_id uuid,
    fecha timestamp without time zone DEFAULT now(),
    tipo text,
    ubicacion text,
    lat numeric,
    lng numeric,
    observacion text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rondas_tipo_check CHECK ((tipo = ANY (ARRAY['inicio'::text, 'fin'::text, 'punto_control'::text])))
);


ALTER TABLE public.rondas OWNER TO neondb_owner;

--
-- Name: sueldo_afp; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sueldo_afp (
    id integer NOT NULL,
    periodo character varying(7) NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    tasa numeric(5,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sueldo_afp OWNER TO neondb_owner;

--
-- Name: sueldo_afp_new_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sueldo_afp_new_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sueldo_afp_new_id_seq OWNER TO neondb_owner;

--
-- Name: sueldo_afp_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sueldo_afp_new_id_seq OWNED BY public.sueldo_afp.id;


--
-- Name: sueldo_asignacion_familiar; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sueldo_asignacion_familiar (
    id integer NOT NULL,
    periodo character varying(7) NOT NULL,
    tramo character varying(10) NOT NULL,
    desde numeric(15,2) NOT NULL,
    hasta numeric(15,2),
    monto numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sueldo_asignacion_familiar OWNER TO neondb_owner;

--
-- Name: sueldo_asignacion_familiar_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sueldo_asignacion_familiar_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sueldo_asignacion_familiar_id_seq OWNER TO neondb_owner;

--
-- Name: sueldo_asignacion_familiar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sueldo_asignacion_familiar_id_seq OWNED BY public.sueldo_asignacion_familiar.id;


--
-- Name: sueldo_bonos_globales; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sueldo_bonos_globales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    imponible boolean DEFAULT true NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sueldo_bonos_globales OWNER TO neondb_owner;

--
-- Name: sueldo_estructuras_servicio; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sueldo_estructuras_servicio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instalacion_id uuid NOT NULL,
    rol_servicio_id uuid NOT NULL,
    monto integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    sueldo_base integer DEFAULT 0 NOT NULL,
    bono_id uuid,
    activo boolean DEFAULT true NOT NULL,
    fecha_inactivacion timestamp without time zone
);


ALTER TABLE public.sueldo_estructuras_servicio OWNER TO neondb_owner;

--
-- Name: sueldo_isapre; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sueldo_isapre (
    id integer NOT NULL,
    nombre text NOT NULL,
    plan text NOT NULL,
    valor_uf numeric(10,4) NOT NULL
);


ALTER TABLE public.sueldo_isapre OWNER TO neondb_owner;

--
-- Name: sueldo_isapre_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sueldo_isapre_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sueldo_isapre_id_seq OWNER TO neondb_owner;

--
-- Name: sueldo_isapre_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sueldo_isapre_id_seq OWNED BY public.sueldo_isapre.id;


--
-- Name: sueldo_mutualidad; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sueldo_mutualidad (
    id integer NOT NULL,
    entidad text NOT NULL,
    tasa numeric(5,4) NOT NULL
);


ALTER TABLE public.sueldo_mutualidad OWNER TO neondb_owner;

--
-- Name: sueldo_mutualidad_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sueldo_mutualidad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sueldo_mutualidad_id_seq OWNER TO neondb_owner;

--
-- Name: sueldo_mutualidad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sueldo_mutualidad_id_seq OWNED BY public.sueldo_mutualidad.id;


--
-- Name: sueldo_parametros_generales; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sueldo_parametros_generales (
    id integer NOT NULL,
    periodo character varying(7) NOT NULL,
    parametro character varying(100) NOT NULL,
    valor numeric(15,4) NOT NULL,
    descripcion text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sueldo_parametros_generales OWNER TO neondb_owner;

--
-- Name: sueldo_parametros_generales_new_id_seq1; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sueldo_parametros_generales_new_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sueldo_parametros_generales_new_id_seq1 OWNER TO neondb_owner;

--
-- Name: sueldo_parametros_generales_new_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sueldo_parametros_generales_new_id_seq1 OWNED BY public.sueldo_parametros_generales.id;


--
-- Name: sueldo_tramos_impuesto; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sueldo_tramos_impuesto (
    id integer NOT NULL,
    tramo integer NOT NULL,
    desde numeric(12,2) NOT NULL,
    hasta numeric(12,2),
    factor numeric(5,4) NOT NULL,
    rebaja numeric(10,2) NOT NULL,
    periodo character varying(7),
    tasa_max numeric(5,2)
);


ALTER TABLE public.sueldo_tramos_impuesto OWNER TO neondb_owner;

--
-- Name: sueldo_tramos_impuesto_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sueldo_tramos_impuesto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sueldo_tramos_impuesto_id_seq OWNER TO neondb_owner;

--
-- Name: sueldo_tramos_impuesto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sueldo_tramos_impuesto_id_seq OWNED BY public.sueldo_tramos_impuesto.id;


--
-- Name: sueldo_valor_uf; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sueldo_valor_uf (
    fecha date NOT NULL,
    valor numeric(12,4) NOT NULL
);


ALTER TABLE public.sueldo_valor_uf OWNER TO neondb_owner;

--
-- Name: te_turnos_extras; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.te_turnos_extras (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guardia_id uuid NOT NULL,
    instalacion_id uuid NOT NULL,
    puesto_id uuid NOT NULL,
    pauta_id integer NOT NULL,
    fecha date NOT NULL,
    estado text,
    valor numeric NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    pagado boolean DEFAULT false,
    fecha_pago date,
    observaciones_pago text,
    usuario_pago text,
    tenant_id uuid DEFAULT 'accebf8a-bacc-41fa-9601-ed39cb320a52'::uuid NOT NULL,
    planilla_id integer,
    preservado boolean DEFAULT false,
    turno_original_id uuid,
    desacoplado_en timestamp with time zone,
    CONSTRAINT turnos_extras_estado_check CHECK ((estado = ANY (ARRAY['reemplazo'::text, 'ppc'::text])))
);


ALTER TABLE public.te_turnos_extras OWNER TO neondb_owner;

--
-- Name: COLUMN te_turnos_extras.pagado; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.te_turnos_extras.pagado IS 'Indica si el turno extra ha sido pagado';


--
-- Name: COLUMN te_turnos_extras.fecha_pago; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.te_turnos_extras.fecha_pago IS 'Fecha en que se realizó el pago del turno extra';


--
-- Name: COLUMN te_turnos_extras.observaciones_pago; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.te_turnos_extras.observaciones_pago IS 'Observaciones o notas sobre el pago';


--
-- Name: COLUMN te_turnos_extras.usuario_pago; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.te_turnos_extras.usuario_pago IS 'Usuario que marcó el turno extra como pagado';


--
-- Name: COLUMN te_turnos_extras.preservado; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.te_turnos_extras.preservado IS 'Indica si el turno extra debe preservarse aunque se elimine el turno original';


--
-- Name: COLUMN te_turnos_extras.turno_original_id; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.te_turnos_extras.turno_original_id IS 'ID del turno original que generó este turno extra';


--
-- Name: COLUMN te_turnos_extras.desacoplado_en; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.te_turnos_extras.desacoplado_en IS 'Timestamp cuando el turno extra fue desacoplado del turno original';


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    rut text,
    created_at timestamp with time zone DEFAULT now(),
    activo boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tenants OWNER TO neondb_owner;

--
-- Name: tipos_documentos; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tipos_documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    modulo text NOT NULL,
    nombre text NOT NULL,
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT now(),
    requiere_vencimiento boolean DEFAULT false,
    dias_antes_alarma integer DEFAULT 30,
    tenant_id uuid
);


ALTER TABLE public.tipos_documentos OWNER TO neondb_owner;

--
-- Name: turnos_extras; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.turnos_extras (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    pauta_diaria_id uuid,
    guardia_id uuid,
    instalacion_origen_id uuid,
    instalacion_destino_id uuid,
    tipo text DEFAULT 'cobertura'::text,
    aprobado_por text,
    observacion text,
    creado_en timestamp without time zone DEFAULT now(),
    CONSTRAINT turnos_extras_tipo_check CHECK ((tipo = ANY (ARRAY['cobertura'::text, 'refuerzo'::text, 'emergencia'::text])))
);


ALTER TABLE public.turnos_extras OWNER TO neondb_owner;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    email text NOT NULL,
    password text NOT NULL,
    nombre text NOT NULL,
    apellido text NOT NULL,
    rol text NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT now(),
    ultimo_acceso timestamp without time zone,
    telefono text,
    avatar text,
    CONSTRAINT usuarios_rol_check CHECK ((rol = ANY (ARRAY['admin'::text, 'supervisor'::text, 'guardia'::text])))
);


ALTER TABLE public.usuarios OWNER TO neondb_owner;

--
-- Name: usuarios_permisos; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.usuarios_permisos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    rol_id uuid,
    modulo text NOT NULL,
    accion text NOT NULL,
    tenant_id uuid,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.usuarios_permisos OWNER TO neondb_owner;

--
-- Name: usuarios_roles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.usuarios_roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre text NOT NULL,
    tenant_id uuid,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.usuarios_roles OWNER TO neondb_owner;

--
-- Name: as_turnos_pauta_mensual id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.as_turnos_pauta_mensual ALTER COLUMN id SET DEFAULT nextval('public.as_turnos_pauta_mensual_new_id_seq'::regclass);


--
-- Name: sueldo_afp id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_afp ALTER COLUMN id SET DEFAULT nextval('public.sueldo_afp_new_id_seq'::regclass);


--
-- Name: sueldo_asignacion_familiar id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_asignacion_familiar ALTER COLUMN id SET DEFAULT nextval('public.sueldo_asignacion_familiar_id_seq'::regclass);


--
-- Name: sueldo_isapre id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_isapre ALTER COLUMN id SET DEFAULT nextval('public.sueldo_isapre_id_seq'::regclass);


--
-- Name: sueldo_mutualidad id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_mutualidad ALTER COLUMN id SET DEFAULT nextval('public.sueldo_mutualidad_id_seq'::regclass);


--
-- Name: sueldo_parametros_generales id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_parametros_generales ALTER COLUMN id SET DEFAULT nextval('public.sueldo_parametros_generales_new_id_seq1'::regclass);


--
-- Name: sueldo_tramos_impuesto id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_tramos_impuesto ALTER COLUMN id SET DEFAULT nextval('public.sueldo_tramos_impuesto_id_seq'::regclass);


--
-- Name: te_planillas_turnos_extras id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.te_planillas_turnos_extras ALTER COLUMN id SET DEFAULT nextval('public.planillas_turnos_extras_id_seq'::regclass);


--
-- Data for Name: afps; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.afps (id, nombre, created_at, updated_at) FROM stdin;
12b728eb-4549-4b6b-85f7-58453820984e	AFP Habitat	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
333cb1c0-61b3-45a3-82a2-69149bb15737	AFP Capital	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
dba4ae95-142b-48d4-aab5-204eef8d9815	AFP Provida	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
bba0289d-5e00-42cf-b29d-5013336f92ac	AFP Cuprum	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
8058ec5d-6db0-4798-9d6a-7c408cd7c3be	AFP PlanVital	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
a25c62b5-e328-46bc-825d-a37c1c845182	AFP Modelo	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
\.


--
-- Data for Name: alertas_documentos; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.alertas_documentos (id, documento_id, dias_restantes, mensaje, creada_en, leida, tenant_id) FROM stdin;
\.


--
-- Data for Name: as_turnos_pauta_mensual; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.as_turnos_pauta_mensual (id, puesto_id, guardia_id, anio, mes, dia, estado, created_at, updated_at, observaciones, reemplazo_guardia_id) FROM stdin;
1845	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	1	T	2025-08-05 15:51:01.04699	2025-08-05 15:51:01.04699	\N	\N
1846	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	2	T	2025-08-05 15:51:01.190908	2025-08-05 15:51:01.190908	\N	\N
1847	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	3	T	2025-08-05 15:51:01.320457	2025-08-05 15:51:01.320457	\N	\N
1849	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	5	libre	2025-08-05 15:51:01.586477	2025-08-05 15:51:01.586477	\N	\N
1850	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	6	libre	2025-08-05 15:51:01.719894	2025-08-05 15:51:01.719894	\N	\N
1851	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	7	libre	2025-08-05 15:51:01.855459	2025-08-05 15:51:01.855459	\N	\N
1852	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	8	libre	2025-08-05 15:51:01.9846	2025-08-05 15:51:01.9846	\N	\N
1854	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	10	T	2025-08-05 15:51:02.246493	2025-08-05 15:51:02.246493	\N	\N
1856	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	12	T	2025-08-05 15:51:02.510564	2025-08-05 15:51:02.510564	\N	\N
1857	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	13	libre	2025-08-05 15:51:02.653539	2025-08-05 15:51:02.653539	\N	\N
1858	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	14	libre	2025-08-05 15:51:02.784021	2025-08-05 15:51:02.784021	\N	\N
1859	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	15	libre	2025-08-05 15:51:02.914048	2025-08-05 15:51:02.914048	\N	\N
1860	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	16	libre	2025-08-05 15:51:03.043667	2025-08-05 15:51:03.043667	\N	\N
1861	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	17	T	2025-08-05 15:51:03.17407	2025-08-05 15:51:03.17407	\N	\N
1862	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	18	T	2025-08-05 15:51:03.304054	2025-08-05 15:51:03.304054	\N	\N
1863	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	19	T	2025-08-05 15:51:03.434492	2025-08-05 15:51:03.434492	\N	\N
1864	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	20	T	2025-08-05 15:51:03.566489	2025-08-05 15:51:03.566489	\N	\N
1865	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	21	libre	2025-08-05 15:51:03.698585	2025-08-05 15:51:03.698585	\N	\N
1866	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	22	libre	2025-08-05 15:51:03.82947	2025-08-05 15:51:03.82947	\N	\N
1867	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	23	libre	2025-08-05 15:51:03.960353	2025-08-05 15:51:03.960353	\N	\N
1868	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	24	libre	2025-08-05 15:51:04.093646	2025-08-05 15:51:04.093646	\N	\N
1869	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	25	T	2025-08-05 15:51:04.233335	2025-08-05 15:51:04.233335	\N	\N
1870	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	26	T	2025-08-05 15:51:04.365382	2025-08-05 15:51:04.365382	\N	\N
1871	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	27	T	2025-08-05 15:51:04.49749	2025-08-05 15:51:04.49749	\N	\N
1872	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	28	T	2025-08-05 15:51:04.629314	2025-08-05 15:51:04.629314	\N	\N
1873	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	29	libre	2025-08-05 15:51:04.765834	2025-08-05 15:51:04.765834	\N	\N
1874	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	30	libre	2025-08-05 15:51:04.898108	2025-08-05 15:51:04.898108	\N	\N
1875	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	31	libre	2025-08-05 15:51:05.028715	2025-08-05 15:51:05.028715	\N	\N
1876	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	1	T	2025-08-05 15:51:05.162311	2025-08-05 15:51:05.162311	\N	\N
1877	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	2	T	2025-08-05 15:51:05.294547	2025-08-05 15:51:05.294547	\N	\N
1878	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	3	T	2025-08-05 15:51:05.426918	2025-08-05 15:51:05.426918	\N	\N
1880	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	5	libre	2025-08-05 15:51:05.687829	2025-08-05 15:51:05.687829	\N	\N
1881	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	6	libre	2025-08-05 15:51:05.819387	2025-08-05 15:51:05.819387	\N	\N
1882	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	7	libre	2025-08-05 15:51:05.951529	2025-08-05 15:51:05.951529	\N	\N
1883	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	8	libre	2025-08-05 15:51:06.081461	2025-08-05 15:51:06.081461	\N	\N
1887	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	12	T	2025-08-05 15:51:06.606034	2025-08-05 15:51:06.606034	\N	\N
1888	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	13	libre	2025-08-05 15:51:06.735984	2025-08-05 15:51:06.735984	\N	\N
1889	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	14	libre	2025-08-05 15:51:06.871302	2025-08-05 15:51:06.871302	\N	\N
1890	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	15	libre	2025-08-05 15:51:07.002018	2025-08-05 15:51:07.002018	\N	\N
1891	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	16	libre	2025-08-05 15:51:07.133249	2025-08-05 15:51:07.133249	\N	\N
1892	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	17	T	2025-08-05 15:51:07.266296	2025-08-05 15:51:07.266296	\N	\N
1893	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	18	T	2025-08-05 15:51:07.400177	2025-08-05 15:51:07.400177	\N	\N
1894	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	19	T	2025-08-05 15:51:07.531332	2025-08-05 15:51:07.531332	\N	\N
1895	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	20	T	2025-08-05 15:51:07.663672	2025-08-05 15:51:07.663672	\N	\N
1896	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	21	libre	2025-08-05 15:51:07.798761	2025-08-05 15:51:07.798761	\N	\N
1897	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	22	libre	2025-08-05 15:51:07.931193	2025-08-05 15:51:07.931193	\N	\N
1898	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	23	libre	2025-08-05 15:51:08.062665	2025-08-05 15:51:08.062665	\N	\N
1899	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	24	libre	2025-08-05 15:51:08.194243	2025-08-05 15:51:08.194243	\N	\N
1900	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	25	T	2025-08-05 15:51:08.332368	2025-08-05 15:51:08.332368	\N	\N
1901	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	26	T	2025-08-05 15:51:08.468265	2025-08-05 15:51:08.468265	\N	\N
1902	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	27	T	2025-08-05 15:51:08.599786	2025-08-05 15:51:08.599786	\N	\N
1903	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	28	T	2025-08-05 15:51:08.733517	2025-08-05 15:51:08.733517	\N	\N
1904	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	29	libre	2025-08-05 15:51:08.865608	2025-08-05 15:51:08.865608	\N	\N
1905	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	30	libre	2025-08-05 15:51:08.993864	2025-08-05 15:51:08.993864	\N	\N
1906	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	31	libre	2025-08-05 15:51:09.125393	2025-08-05 15:51:09.125393	\N	\N
1907	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	1	T	2025-08-05 15:51:09.263795	2025-08-05 15:51:09.263795	\N	\N
1908	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	2	T	2025-08-05 15:51:09.392888	2025-08-05 15:51:09.392888	\N	\N
1909	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	3	T	2025-08-05 15:51:09.523894	2025-08-05 15:51:09.523894	\N	\N
1911	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	5	libre	2025-08-05 15:51:09.790903	2025-08-05 15:51:09.790903	\N	\N
1912	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	6	libre	2025-08-05 15:51:09.922075	2025-08-05 15:51:09.922075	\N	\N
1913	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	7	libre	2025-08-05 15:51:10.05321	2025-08-05 15:51:10.05321	\N	\N
1914	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	8	libre	2025-08-05 15:51:10.184625	2025-08-05 15:51:10.184625	\N	\N
1918	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	12	T	2025-08-05 15:51:10.722802	2025-08-05 15:51:10.722802	\N	\N
1919	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	13	libre	2025-08-05 15:51:10.864194	2025-08-05 15:51:10.864194	\N	\N
1920	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	14	libre	2025-08-05 15:51:10.993352	2025-08-05 15:51:10.993352	\N	\N
1921	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	15	libre	2025-08-05 15:51:11.124715	2025-08-05 15:51:11.124715	\N	\N
1922	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	16	libre	2025-08-05 15:51:11.256125	2025-08-05 15:51:11.256125	\N	\N
1923	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	17	T	2025-08-05 15:51:11.386771	2025-08-05 15:51:11.386771	\N	\N
1924	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	18	T	2025-08-05 15:51:11.51705	2025-08-05 15:51:11.51705	\N	\N
1910	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	4	reemplazo	2025-08-05 15:51:09.658224	2025-08-05 16:58:07.021205	\N	40d7e2cb-de31-45e5-99c5-1e965daed7e9
1855	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	11	T	2025-08-05 15:51:02.378187	2025-08-06 04:58:49.568266	\N	\N
1886	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	11	T	2025-08-05 15:51:06.473223	2025-08-06 04:58:58.083229	\N	\N
1885	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	10	T	2025-08-05 15:51:06.343198	2025-08-06 05:20:04.171659	\N	\N
1916	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	10	T	2025-08-05 15:51:10.445305	2025-08-06 05:20:07.236116	\N	\N
1853	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	9	T	2025-08-05 15:51:02.115207	2025-08-06 05:42:52.769848	\N	\N
1915	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	9	trabajado	2025-08-05 15:51:10.314903	2025-08-06 16:54:05.192647	\N	\N
1925	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	19	T	2025-08-05 15:51:11.64751	2025-08-05 15:51:11.64751	\N	\N
1926	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	20	T	2025-08-05 15:51:11.778505	2025-08-05 15:51:11.778505	\N	\N
1927	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	21	libre	2025-08-05 15:51:11.911475	2025-08-05 15:51:11.911475	\N	\N
1928	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	22	libre	2025-08-05 15:51:12.0432	2025-08-05 15:51:12.0432	\N	\N
1929	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	23	libre	2025-08-05 15:51:12.173665	2025-08-05 15:51:12.173665	\N	\N
1930	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	24	libre	2025-08-05 15:51:12.303845	2025-08-05 15:51:12.303845	\N	\N
1931	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	25	T	2025-08-05 15:51:12.43393	2025-08-05 15:51:12.43393	\N	\N
1932	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	26	T	2025-08-05 15:51:12.565462	2025-08-05 15:51:12.565462	\N	\N
1933	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	27	T	2025-08-05 15:51:12.699496	2025-08-05 15:51:12.699496	\N	\N
1934	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	28	T	2025-08-05 15:51:12.83297	2025-08-05 15:51:12.83297	\N	\N
1935	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	29	libre	2025-08-05 15:51:12.962004	2025-08-05 15:51:12.962004	\N	\N
1936	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	30	libre	2025-08-05 15:51:13.091088	2025-08-05 15:51:13.091088	\N	\N
1937	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	31	libre	2025-08-05 15:51:13.223169	2025-08-05 15:51:13.223169	\N	\N
1938	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	1	libre	2025-08-05 15:51:13.357476	2025-08-05 15:51:13.357476	\N	\N
1939	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	2	libre	2025-08-05 15:51:13.491038	2025-08-05 15:51:13.491038	\N	\N
1940	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	3	libre	2025-08-05 15:51:13.622186	2025-08-05 15:51:13.622186	\N	\N
1941	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	4	libre	2025-08-05 15:51:13.756125	2025-08-05 15:51:13.756125	\N	\N
1945	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	8	T	2025-08-05 15:51:14.278364	2025-08-05 15:51:14.278364	\N	\N
1946	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	9	libre	2025-08-05 15:51:14.409544	2025-08-05 15:51:14.409544	\N	\N
1947	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	10	libre	2025-08-05 15:51:14.540725	2025-08-05 15:51:14.540725	\N	\N
1948	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	11	libre	2025-08-05 15:51:14.681372	2025-08-05 15:51:14.681372	\N	\N
1949	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	12	libre	2025-08-05 15:51:14.823818	2025-08-05 15:51:14.823818	\N	\N
1950	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	13	T	2025-08-05 15:51:14.955746	2025-08-05 15:51:14.955746	\N	\N
1951	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	14	T	2025-08-05 15:51:15.101318	2025-08-05 15:51:15.101318	\N	\N
1952	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	15	T	2025-08-05 15:51:15.231268	2025-08-05 15:51:15.231268	\N	\N
1953	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	16	T	2025-08-05 15:51:15.363139	2025-08-05 15:51:15.363139	\N	\N
1954	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	17	libre	2025-08-05 15:51:15.494445	2025-08-05 15:51:15.494445	\N	\N
1955	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	18	libre	2025-08-05 15:51:15.625879	2025-08-05 15:51:15.625879	\N	\N
1956	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	19	libre	2025-08-05 15:51:15.758773	2025-08-05 15:51:15.758773	\N	\N
1957	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	20	libre	2025-08-05 15:51:15.889801	2025-08-05 15:51:15.889801	\N	\N
1958	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	21	T	2025-08-05 15:51:16.020129	2025-08-05 15:51:16.020129	\N	\N
1959	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	22	T	2025-08-05 15:51:16.186114	2025-08-05 15:51:16.186114	\N	\N
1960	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	23	T	2025-08-05 15:51:16.31604	2025-08-05 15:51:16.31604	\N	\N
1961	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	24	T	2025-08-05 15:51:16.446337	2025-08-05 15:51:16.446337	\N	\N
1962	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	25	libre	2025-08-05 15:51:16.577269	2025-08-05 15:51:16.577269	\N	\N
1963	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	26	libre	2025-08-05 15:51:16.708367	2025-08-05 15:51:16.708367	\N	\N
1964	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	27	libre	2025-08-05 15:51:16.838479	2025-08-05 15:51:16.838479	\N	\N
1965	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	28	libre	2025-08-05 15:51:16.967387	2025-08-05 15:51:16.967387	\N	\N
1966	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	29	T	2025-08-05 15:51:17.098821	2025-08-05 15:51:17.098821	\N	\N
1967	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	30	T	2025-08-05 15:51:17.230645	2025-08-05 15:51:17.230645	\N	\N
1968	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	31	T	2025-08-05 15:51:17.361777	2025-08-05 15:51:17.361777	\N	\N
1848	704e202e-b502-49fc-9c90-f4a97fec46a6	\N	2025	8	4	reemplazo	2025-08-05 15:51:01.4491	2025-08-05 16:57:52.155264	\N	d8083f2a-d246-4ec1-9c77-d92d8bde496b
1879	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	4	sin_cobertura	2025-08-05 15:51:05.557162	2025-08-05 16:57:56.262293	\N	\N
1942	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	5	sin_cobertura	2025-08-05 15:51:13.887034	2025-08-05 17:14:56.36553	\N	\N
1917	a81d9847-ddd8-4771-9d45-012a24dd0839	55e48627-6dc6-4052-876e-d52f27601e2a	2025	8	11	T	2025-08-05 15:51:10.5907	2025-08-06 04:59:46.521131	\N	\N
1884	37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	2025	8	9	trabajado	2025-08-05 15:51:06.21243	2025-08-06 16:53:00.713576	\N	\N
1944	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	7	T	2025-08-05 15:51:14.147198	2025-08-06 17:53:42.675784	\N	\N
1943	d0189148-4c40-459e-b570-2211a57f5bea	\N	2025	8	6	T	2025-08-05 15:51:14.0183	2025-08-06 18:05:16.393188	\N	\N
1969	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	1	trabajado	2025-08-06 20:11:00.784857	2025-08-06 20:11:00.784857	\N	\N
1970	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	2	trabajado	2025-08-06 20:11:00.945106	2025-08-06 20:11:00.945106	\N	\N
1971	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	3	trabajado	2025-08-06 20:11:01.079012	2025-08-06 20:11:01.079012	\N	\N
1972	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	4	trabajado	2025-08-06 20:11:01.211196	2025-08-06 20:11:01.211196	\N	\N
1973	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	5	trabajado	2025-08-06 20:11:01.348242	2025-08-06 20:11:01.348242	\N	\N
1974	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	6	libre	2025-08-06 20:11:01.487207	2025-08-06 20:11:01.487207	\N	\N
1975	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	7	trabajado	2025-08-06 20:11:01.620175	2025-08-06 20:11:01.620175	\N	\N
1976	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	8	trabajado	2025-08-06 20:11:01.752208	2025-08-06 20:11:01.752208	\N	\N
1977	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	9	trabajado	2025-08-06 20:11:01.885147	2025-08-06 20:11:01.885147	\N	\N
1978	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	10	trabajado	2025-08-06 20:11:02.018224	2025-08-06 20:11:02.018224	\N	\N
1979	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	11	trabajado	2025-08-06 20:11:02.153157	2025-08-06 20:11:02.153157	\N	\N
1980	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	12	trabajado	2025-08-06 20:11:02.285587	2025-08-06 20:11:02.285587	\N	\N
1981	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	13	libre	2025-08-06 20:11:02.421784	2025-08-06 20:11:02.421784	\N	\N
1982	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	14	trabajado	2025-08-06 20:11:02.556791	2025-08-06 20:11:02.556791	\N	\N
1984	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	16	trabajado	2025-08-06 20:11:02.828266	2025-08-06 20:11:02.828266	\N	\N
1985	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	17	trabajado	2025-08-06 20:11:02.967119	2025-08-06 20:11:02.967119	\N	\N
1986	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	18	trabajado	2025-08-06 20:11:03.102086	2025-08-06 20:11:03.102086	\N	\N
1987	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	19	trabajado	2025-08-06 20:11:03.233132	2025-08-06 20:11:03.233132	\N	\N
1988	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	20	reemplazo	2025-08-06 20:11:03.365143	2025-08-06 20:11:03.365143	Reemplazado por otro guardia	\N
1989	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	21	trabajado	2025-08-06 20:11:03.498124	2025-08-06 20:11:03.498124	\N	\N
1990	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	22	trabajado	2025-08-06 20:11:03.630181	2025-08-06 20:11:03.630181	\N	\N
1991	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	23	trabajado	2025-08-06 20:11:03.763095	2025-08-06 20:11:03.763095	\N	\N
1992	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	24	trabajado	2025-08-06 20:11:03.898099	2025-08-06 20:11:03.898099	\N	\N
1994	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	26	trabajado	2025-08-06 20:11:04.166747	2025-08-06 20:11:04.166747	\N	\N
1995	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	27	libre	2025-08-06 20:11:04.297771	2025-08-06 20:11:04.297771	\N	\N
1996	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	28	trabajado	2025-08-06 20:11:04.42973	2025-08-06 20:11:04.42973	\N	\N
1997	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	29	trabajado	2025-08-06 20:11:04.56215	2025-08-06 20:11:04.56215	\N	\N
1998	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	30	trabajado	2025-08-06 20:11:04.696045	2025-08-06 20:11:04.696045	\N	\N
1999	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	31	trabajado	2025-08-06 20:11:04.829041	2025-08-06 20:11:04.829041	\N	\N
2000	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	1	trabajado	2025-08-06 20:11:04.961028	2025-08-06 20:11:04.961028	\N	\N
2001	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	2	trabajado	2025-08-06 20:11:05.092086	2025-08-06 20:11:05.092086	\N	\N
2002	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	3	trabajado	2025-08-06 20:11:05.227038	2025-08-06 20:11:05.227038	\N	\N
2003	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	4	trabajado	2025-08-06 20:11:05.359036	2025-08-06 20:11:05.359036	\N	\N
2004	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	5	trabajado	2025-08-06 20:11:05.492062	2025-08-06 20:11:05.492062	\N	\N
2005	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	6	libre	2025-08-06 20:11:05.627062	2025-08-06 20:11:05.627062	\N	\N
2006	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	7	trabajado	2025-08-06 20:11:05.757107	2025-08-06 20:11:05.757107	\N	\N
2007	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	8	trabajado	2025-08-06 20:11:05.891733	2025-08-06 20:11:05.891733	\N	\N
2008	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	9	trabajado	2025-08-06 20:11:06.028767	2025-08-06 20:11:06.028767	\N	\N
2009	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	10	trabajado	2025-08-06 20:11:06.162718	2025-08-06 20:11:06.162718	\N	\N
2010	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	11	trabajado	2025-08-06 20:11:06.297098	2025-08-06 20:11:06.297098	\N	\N
2011	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	12	trabajado	2025-08-06 20:11:06.428062	2025-08-06 20:11:06.428062	\N	\N
2012	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	13	libre	2025-08-06 20:11:06.566975	2025-08-06 20:11:06.566975	\N	\N
2013	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	14	trabajado	2025-08-06 20:11:06.699209	2025-08-06 20:11:06.699209	\N	\N
2015	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	16	trabajado	2025-08-06 20:11:06.965059	2025-08-06 20:11:06.965059	\N	\N
2016	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	17	trabajado	2025-08-06 20:11:07.097008	2025-08-06 20:11:07.097008	\N	\N
2017	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	18	trabajado	2025-08-06 20:11:07.228005	2025-08-06 20:11:07.228005	\N	\N
2018	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	19	trabajado	2025-08-06 20:11:07.361975	2025-08-06 20:11:07.361975	\N	\N
2019	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	20	reemplazo	2025-08-06 20:11:07.492294	2025-08-06 20:11:07.492294	Reemplazado por otro guardia	\N
2020	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	21	trabajado	2025-08-06 20:11:07.624721	2025-08-06 20:11:07.624721	\N	\N
2021	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	22	trabajado	2025-08-06 20:11:07.755631	2025-08-06 20:11:07.755631	\N	\N
2022	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	23	trabajado	2025-08-06 20:11:07.88965	2025-08-06 20:11:07.88965	\N	\N
2023	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	24	trabajado	2025-08-06 20:11:08.022011	2025-08-06 20:11:08.022011	\N	\N
2025	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	26	trabajado	2025-08-06 20:11:08.293973	2025-08-06 20:11:08.293973	\N	\N
2026	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	27	libre	2025-08-06 20:11:08.42599	2025-08-06 20:11:08.42599	\N	\N
2027	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	28	trabajado	2025-08-06 20:11:08.561178	2025-08-06 20:11:08.561178	\N	\N
2028	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	29	trabajado	2025-08-06 20:11:08.695938	2025-08-06 20:11:08.695938	\N	\N
2029	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	30	trabajado	2025-08-06 20:11:08.830949	2025-08-06 20:11:08.830949	\N	\N
2030	b5edf643-3ac7-4406-94fb-b67e03f7adf8	c5823e4d-a58f-4854-be39-62ed89e6b7af	2025	8	31	trabajado	2025-08-06 20:11:08.962944	2025-08-06 20:11:08.962944	\N	\N
\.


--
-- Data for Name: as_turnos_puestos_operativos; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.as_turnos_puestos_operativos (id, instalacion_id, rol_id, guardia_id, nombre_puesto, es_ppc, creado_en, tenant_id, activo, eliminado_por, eliminado_en, observaciones, actualizado_en) FROM stdin;
2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	15631bd6-03a9-459d-ae60-fc480f7f3e84	64bef7f7-7d41-4ce6-a8bd-f26ed0482825	\N	Puesto #1	t	2025-08-04 03:25:26.739775	\N	t	\N	\N	\N	2025-08-04 03:25:26.739775
b5edf643-3ac7-4406-94fb-b67e03f7adf8	15631bd6-03a9-459d-ae60-fc480f7f3e84	64bef7f7-7d41-4ce6-a8bd-f26ed0482825	817d21b0-d5ef-4438-8adf-6258585b23a3	Puesto #2	f	2025-08-04 03:25:26.739775	\N	t	\N	\N	\N	2025-08-04 03:25:26.739775
d0189148-4c40-459e-b570-2211a57f5bea	7e05a55d-8db6-4c20-b51c-509f09d69f74	0e768453-97b3-4bc0-b111-4b4e421ef308	\N	Puesto #4	t	2025-08-04 03:24:55.338772	\N	t	\N	\N	\N	2025-08-04 03:24:55.338772
37efc41d-3d48-4fa2-b84d-1cb9f7cc5b3a	7e05a55d-8db6-4c20-b51c-509f09d69f74	0e768453-97b3-4bc0-b111-4b4e421ef308	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	Puesto #2	f	2025-08-04 03:24:55.338772	\N	t	\N	\N	\N	2025-08-04 03:24:55.338772
704e202e-b502-49fc-9c90-f4a97fec46a6	7e05a55d-8db6-4c20-b51c-509f09d69f74	0e768453-97b3-4bc0-b111-4b4e421ef308	\N	Puesto #1	t	2025-08-04 03:24:55.338772	\N	t	\N	\N	\N	2025-08-04 03:24:55.338772
a81d9847-ddd8-4771-9d45-012a24dd0839	7e05a55d-8db6-4c20-b51c-509f09d69f74	0e768453-97b3-4bc0-b111-4b4e421ef308	55e48627-6dc6-4052-876e-d52f27601e2a	Puesto #3	f	2025-08-04 03:24:55.338772	\N	t	\N	\N	 - Desasignado: 2025-08-04 19:39:45.21516+00	2025-08-04 00:00:00
96487661-3cea-4187-ba0c-a1a4a665b90a	0e8ba906-e64b-4d4d-a104-ba29f21f48a9	0e768453-97b3-4bc0-b111-4b4e421ef308	\N	Puesto #1	t	2025-08-07 23:49:50.734701	\N	t	\N	\N	\N	2025-08-07 23:49:50.734701
328ce715-c2fa-401f-9a31-7b3d32994a04	0e8ba906-e64b-4d4d-a104-ba29f21f48a9	0e768453-97b3-4bc0-b111-4b4e421ef308	\N	Puesto 3	t	2025-08-08 02:37:35.402588	\N	t	\N	\N	\N	2025-08-08 02:37:35.402588
\.


--
-- Data for Name: as_turnos_roles_servicio; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.as_turnos_roles_servicio (id, dias_trabajo, dias_descanso, horas_turno, estado, created_at, updated_at, hora_inicio, hora_termino, nombre, tenant_id, fecha_inactivacion) FROM stdin;
bb4abe42-7e84-45a0-8b55-0a38b163c886	6	2	10	Activo	2025-07-24 22:11:06.535	2025-07-24 22:11:06.535	22:00	08:00	Noche 6x2x10 / 22:00 08:00	\N	\N
64bef7f7-7d41-4ce6-a8bd-f26ed0482825	5	2	8	Activo	2025-07-24 22:04:25.576	2025-08-07 17:35:19.061077	08:00	16:00	Día 5x2x8 / 08:00 16:00	\N	\N
e4a42f1e-4a80-4a00-b428-77a9915b8604	4	4	12	Activo	2025-07-24 22:11:49.388	2025-08-07 17:35:22.61161	20:00	08:00	Noche 4x4x12 / 20:00 08:00	\N	\N
48bc7016-ff20-44f6-a36d-b010280ab7ce	3	3	12	Activo	2025-08-07 17:09:45.179354	2025-08-08 02:02:27.156677	06:00	18:00	Test Inactivación 3x3x12 / 06:00 18:00	\N	2025-08-07 23:51:37.13511
0e768453-97b3-4bc0-b111-4b4e421ef308	4	4	12	Inactivo	2025-07-24 22:06:08.015	2025-08-08 03:26:49.365588	08:00	20:00	Día 4x4x12 / 08:00 20:00	\N	2025-08-08 03:26:49.365588
\.


--
-- Data for Name: bancos; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.bancos (id, codigo, nombre, updated_at) FROM stdin;
9aaa69ff-8981-4534-b8cf-bb3888cfc3f1	001	Banco de Chile	2025-07-28 13:09:56.966891
01c16d3a-df43-49c1-a4f8-dfe643d67f4e	009	Banco Internacional	2025-07-28 13:09:56.966891
756a508e-948c-40d4-b675-ce4e1a16daf1	012	Banco del Estado de Chile (BancoEstado)	2025-07-28 13:09:56.966891
ae18bf67-9429-4f68-8463-d09356b08ef2	014	Scotiabank Chile (BancoDesarrollo)	2025-07-28 13:09:56.966891
d8f390a2-2466-4bc8-9032-903a0e84e85b	016	Banco de Crédito e Inversiones (BCI)	2025-07-28 13:09:56.966891
343c27ef-2988-4a86-919e-cf306e5c123d	028	Banco BICE	2025-07-28 13:09:56.966891
a18ccad6-b747-4ed8-93b6-dcc0c4e92d94	031	HSBC Bank Chile	2025-07-28 13:09:56.966891
dfc676af-0c8d-4475-a831-b313e513c21b	037	Banco Santander Chile	2025-07-28 13:09:56.966891
fc534332-7da3-42de-93e3-edf46f8b6d18	039	Banco Itaú Corpbanca (Itaú Chile)	2025-07-28 13:09:56.966891
413ca99e-71dc-4d2b-9d8d-f1417747ffaf	049	Banco Security	2025-07-28 13:09:56.966891
eaf03a6a-c53a-43b5-8eda-80f0c44cef40	051	Banco Falabella	2025-07-28 13:09:56.966891
d2d9e830-6ef6-42da-9dd4-a4de45177baf	052	Deutsche Bank (Chile)	2025-07-28 13:09:56.966891
7b4d5794-241f-4267-aa43-9bae55e7b82f	053	Banco Ripley	2025-07-28 13:09:56.966891
a979e7e0-7b16-4ed4-a17b-d65967daef9f	054	Rabobank Chile	2025-07-28 13:09:56.966891
90636223-71fc-4184-b2e9-5223684c820b	055	Banco Consorcio	2025-07-28 13:09:56.966891
0d600961-85b5-49de-af06-b5104885d7cb	056	Banco Penta	2025-07-28 13:09:56.966891
4c66e677-9c7f-449b-9a25-f005b76ff642	059	Banco BTG Pactual Chile	2025-07-28 13:09:56.966891
5a850b73-f0cf-479a-a27e-df0e656bca58	062	Tanner Banco Digital	2025-07-28 13:09:56.966891
bda92040-ac11-4e2c-b8c9-dd017f48be09	MACH	Mach	2025-08-02 17:02:00.538509
06ec2d0a-7a22-44b7-9131-ae4089a96543	MP	MercadoPago	2025-08-02 17:02:00.954252
4870c49b-6be2-4f54-adb5-9783274bb467	COOP	Coopeuch	2025-08-02 17:02:01.445276
36cb4f56-61ad-4d0a-9f27-fcd4643e23bd	TENPO	Tenpo Prepago S.A.	2025-08-02 17:02:01.84796
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.clientes (id, nombre, rut, representante_legal, rut_representante, estado, created_at, updated_at, razon_social, tenant_id, email, telefono, direccion, latitud, longitud, ciudad, comuna) FROM stdin;
8d24d353-375c-41e1-b54c-f07437a98c3e	A Test Cliente	13333333-3	Juan Pérez	11111111-1	Activo	2025-07-24 15:42:17.559498	2025-08-04 19:30:17.630111	Test Empresa Test	\N	juan.pérez@empresa.cl	\N	Av. Las Condes 3344, Las Condes, Región Metropolitana, Chile	-33.4073821	-70.56161689999999	Santiago	Las Condes
d10d64d1-7bc7-42a2-b783-2fefe25e97c5	N&G	65.136.824-3	\N	\N	Activo	2025-07-23 20:02:01.996416	2025-07-23 20:02:01.996416	N&G	\N	\N	\N	\N	\N	\N	\N	\N
eb2222b2-6e91-44b4-87c2-9e332bca07f0	SCRB	78985840-3	TEST	\N	Activo	2025-07-23 20:02:01.996416	2025-07-31 12:50:01.133271	SCRB	\N	\N	\N	\N	\N	\N	\N	\N
6a55967d-981c-4825-8f6f-5be3fee1d132	Caicona	76951815-0	Carolina Soledad Prado Morán	12465573-0	Activo	2025-07-23 20:02:01.996416	2025-07-23 20:02:01.996416	Caicona	\N	carolina.soledad.prado.roman@empresa.cl	\N	\N	\N	\N	\N	\N
b6c521f9-edb3-41bd-9b01-f70fa46acc51	Asfalcura	76298660-4	Cristian Cabrera	10843913-0	Activo	2025-07-23 20:02:01.996416	2025-07-23 20:02:01.996416	Asfalcura	\N	cristian.cabrera@empresa.cl	\N	\N	\N	\N	\N	\N
e70f4f8e-9454-4743-ab76-6ebdc6e1b873	Chañaral	60.511.032-0	Jorge Andres Fernandez Herrera	15.949.870-0	Activo	2025-07-23 20:02:01.996416	2025-07-23 20:02:01.996416	Chañaral	\N	jorge.andres.fernandez.herrera@empresa.cl	\N	\N	\N	\N	\N	\N
9fa21016-257e-4730-a832-fcdaff1a646f	FMT	77.729.842-9	Jorge Vergara Mondaca	7.882.167-1	Activo	2025-07-23 20:02:01.996416	2025-07-23 20:02:01.996416	FMT	\N	jorge.vergara.mondaca@empresa.cl	\N	\N	\N	\N	\N	\N
13c1239a-2c1c-4570-9e6e-42a9f571520c	GL Events	76096284-8	Francisco Sotomayor	16096698-K	Activo	2025-07-23 20:02:01.996416	2025-07-23 20:02:01.996416	GL Events	\N	francisco.sotomayor@empresa.cl	\N	\N	\N	\N	\N	\N
55c8aa2c-7542-42e9-9d9e-05a2b6a3e49a	Newtree	77873029-4	Xingfa Zhou	14712298-5	Activo	2025-07-23 20:02:01.996416	2025-07-23 20:02:01.996416	Newtree	\N	xingfa.zhou@empresa.cl	\N	\N	\N	\N	\N	\N
97ae8d15-1ecb-401f-b189-3252c76354a0	Transmat	76.270.521-4	Jorge Herrera Peña	13.198.539-8	Activo	2025-07-23 20:02:01.996416	2025-07-23 20:02:01.996416	Transmat	\N	jorge.herrera.peña@empresa.cl	\N	\N	\N	\N	\N	\N
96384272-00ef-4f49-b913-863249b5eb1a	Moova spa	77.092.764-1	lucas jaime	27.446.795-9	Activo	2025-07-23 20:02:01.996416	2025-07-23 20:02:01.996416	Moova spa	\N	lucas.jaime@empresa.cl	\N	\N	\N	\N	\N	\N
14a7e1de-9a50-4f92-b694-35c063f64343	Inversiones Santa Amalia SA	79.513.230-9	Richard Kraus Larrain	9.991.380-0	Activo	2025-07-23 20:02:01.996416	2025-07-23 20:02:01.996416	Inversiones Santa Amalia SA	\N	richard.kraus.larrain@empresa.cl	\N	\N	\N	\N	\N	\N
39e543bc-55e5-4cc4-a444-cdf135cc2b89	Emecar	0079567820-4	Fabian Biderman Rudman	10.099.291-4	Activo	2025-07-23 20:02:01.996416	2025-07-23 20:02:01.996416	Emecar	\N	fabian.biderman.rudman@empresa.cl	\N	\N	\N	\N	\N	\N
c6425c57-e57f-4028-8241-77d675a9e500	Inversiones pedemonte spa	096993280-6	Víctor pedemonte	7013304-0	Activo	2025-07-23 20:02:01.996416	2025-07-23 20:02:01.996416	Inversiones pedemonte spa	\N	víctor.pedemonte@empresa.cl	\N	\N	\N	\N	\N	\N
ee5fc9c3-3a84-4af0-9bc0-f3805d81d9ca	Zerando	77126979-6	Tales Lima Barreto	27059305-4	Inactivo	2025-07-23 20:02:01.996416	2025-08-01 20:48:15.317757	Zerando	\N	tales.lima.barreto@empresa.cl	\N	\N	\N	\N	\N	\N
f85549cf-60b3-4d08-b4cc-08d01a95b5f2	CRIG	59301350-2	He Yuanjun	55555555-5	Inactivo	2025-07-23 20:02:01.996416	2025-08-01 20:49:41.250851	CRIG	\N	he.yuanjun@empresa.cl	\N	\N	\N	\N	\N	\N
d825a799-16e7-451f-96cc-50180393b400	Polpaico	91.337.000-7	Luis Felipe Ureta Vicuña	6977521-7	Activo	2025-07-23 20:02:01.996416	2025-08-01 23:58:52.837152	Polpaico	\N	luis.felipe.ureta.vicuna@empresa.cl	\N	\N	\N	\N	\N	\N
4cfbc94f-a3bc-45ca-8939-334cf549d34f	Dhemax	76252650-6	\N	\N	Activo	2025-07-23 20:02:01.996416	2025-08-01 23:59:37.577064	Dhemax	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: comunas; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.comunas (id, nombre, region, created_at) FROM stdin;
edc58be5-5269-46c7-a7cf-5703dd0408f8	Santiago	Región Metropolitana	2025-08-03 23:59:24.849859+00
d2678a02-351a-46f1-8f08-d901e67235f9	Providencia	Región Metropolitana	2025-08-03 23:59:24.849859+00
0c839e30-cec0-4cda-98a9-f4c976b1722c	Las Condes	Región Metropolitana	2025-08-03 23:59:24.849859+00
ba07185a-c64f-424e-93b2-f0b8d7821016	Ñuñoa	Región Metropolitana	2025-08-03 23:59:24.849859+00
3f4bafc0-2a9d-4a17-bf39-a1085ffa78dc	Maipú	Región Metropolitana	2025-08-03 23:59:24.849859+00
298e2c29-5786-479a-97ef-d5583e8e497a	Valparaíso	Región de Valparaíso	2025-08-03 23:59:24.849859+00
bbff1f24-b4eb-46d4-8da8-2ae22f25e42a	Viña del Mar	Región de Valparaíso	2025-08-03 23:59:24.849859+00
45173c77-c34f-4d95-82dd-df61ddb62713	Quilpué	Región de Valparaíso	2025-08-03 23:59:24.849859+00
43d5c940-9fd7-4569-8ada-108a53c50bef	Villa Alemana	Región de Valparaíso	2025-08-03 23:59:24.849859+00
6a827018-19ac-46a4-99ce-d4fc2b851209	Concepción	Región del Biobío	2025-08-03 23:59:24.849859+00
741c6a4f-c211-44c1-bbe6-b5a500a18b4a	Talcahuano	Región del Biobío	2025-08-03 23:59:24.849859+00
e7faaaef-bddc-4506-912a-ace8b8c4197e	Chillán	Región del Biobío	2025-08-03 23:59:24.849859+00
33a6e301-72c7-433c-a901-35d7c96a1844	La Serena	Región de Coquimbo	2025-08-03 23:59:24.849859+00
b68a1b31-130a-4ce5-889c-0c2b6d450039	Coquimbo	Región de Coquimbo	2025-08-03 23:59:24.849859+00
7e50e27f-a143-4102-a99e-fd06fa741016	Antofagasta	Región de Antofagasta	2025-08-03 23:59:24.849859+00
ba03b2e1-722d-453e-ac4b-333215c5df48	Calama	Región de Antofagasta	2025-08-03 23:59:24.849859+00
1aeb12f7-9579-4b20-8e8d-bbad6fc3fa85	Iquique	Región de Tarapacá	2025-08-03 23:59:24.849859+00
ea90c227-6c5a-40a3-a318-af0c755a6b56	Arica	Región de Arica y Parinacota	2025-08-03 23:59:24.849859+00
e71dc876-3957-49f6-b01b-0153dcd67ec7	Temuco	Región de La Araucanía	2025-08-03 23:59:24.849859+00
85269119-3c3f-4033-bbfd-d082295aefea	Valdivia	Región de Los Ríos	2025-08-03 23:59:24.849859+00
a63a752d-a4d1-4a06-b83f-a15ecdecd554	Puerto Montt	Región de Los Lagos	2025-08-03 23:59:24.849859+00
6452b73c-2e22-4947-a9af-144ce91ccfde	Punta Arenas	Región de Magallanes	2025-08-03 23:59:24.849859+00
\.


--
-- Data for Name: doc_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.doc_templates (id, name, content_html, variables, created_at, updated_at) FROM stdin;
2ebcb71a-db3c-45a6-8fe5-7c63afc785f4	Contrato de Guardia	<h1>Contrato de Guardia</h1><p>Fecha: {{fecha_contrato}}</p>	{fecha_contrato}	2025-08-08 06:09:19.301646	2025-08-08 06:09:19.301646
\.


--
-- Data for Name: documentos; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documentos (id, tenant_id, tipo, url, guardia_id, instalacion_id, creado_en, updated_at, tipo_documento_id, contenido_archivo, fecha_vencimiento) FROM stdin;
\.


--
-- Data for Name: documentos_clientes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documentos_clientes (id, cliente_id, nombre, tipo, archivo_url, "tamaño", created_at, tipo_documento_id, contenido_archivo, fecha_vencimiento, tenant_id) FROM stdin;
\.


--
-- Data for Name: documentos_guardias; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documentos_guardias (id, guardia_id, tipo, url, fecha_subida, tenant_id, updated_at, tipo_documento_id, contenido_archivo, fecha_vencimiento) FROM stdin;
\.


--
-- Data for Name: documentos_instalacion; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documentos_instalacion (id, instalacion_id, tipo, url, fecha_subida, tenant_id, updated_at, tipo_documento_id, contenido_archivo, fecha_vencimiento) FROM stdin;
\.


--
-- Data for Name: documentos_tipos; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documentos_tipos (id, modulo, nombre, creado_en, requiere_vencimiento, dias_antes_alarma, activo, tenant_id) FROM stdin;
3e2d61c2-5396-4446-8ee1-6f042fa0fd1f	clientes	Contrato Cliente	2025-08-06 18:45:48.561378	t	30	t	\N
\.


--
-- Data for Name: documentos_usuarios; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documentos_usuarios (id, usuario_id, tipo, nombre_archivo, url, fecha_subida, observaciones, tenant_id, updated_at, tipo_documento_id, contenido_archivo) FROM stdin;
\.


--
-- Data for Name: firmas; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.firmas (id, documento_id, usuario_id, tipo, metodo, fecha, updated_at) FROM stdin;
\.


--
-- Data for Name: guardias; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.guardias (id, tenant_id, nombre, email, telefono, activo, created_at, usuario_id, updated_at, latitud, longitud, ciudad, comuna, region, rut, apellido_paterno, apellido_materno, nacionalidad, sexo, direccion, fecha_os10, created_from_excel, instalacion_id, banco, tipo_cuenta, numero_cuenta, tipo_guardia) FROM stdin;
c5823e4d-a58f-4854-be39-62ed89e6b7af	accebf8a-bacc-41fa-9601-ed39cb320a52	FRANCISCO JESUS	FRANCISCO.MALKAVIAN@GMAIL.COM	926498008	t	2025-07-28 01:27:45.946	\N	2025-08-02 17:04:03.967508	-33.45855789	-70.65311392	Santiago	Santiago	\N	17433701-2	FLORES	FERNANDEZ	CHILENA	Hombre	LORD COCHRANE 1007 DPTO 903	2027-06-12	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTA	50014143649	contratado
e8ef3b0b-ccb4-4ed8-8ad6-23a5663db894	accebf8a-bacc-41fa-9601-ed39cb320a52	Ignacio Alejandro	ignacioalvear7@gmail.com	929027544	t	2025-07-28 01:27:44.664	\N	2025-08-02 17:04:05.129713	-33.41029812	-70.66463870	Santiago	Independencia	\N	18407846-5	Donoso	Alvear	CHILENA	Hombre	Freirina 1832	2026-10-03	f	0d3c9a36-3357-40a5-85db-d94086f22b32	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	18407846	contratado
2c87965a-c93a-4867-ae84-078757df5977	accebf8a-bacc-41fa-9601-ed39cb320a52	Melo, Zapata	belenscarlett2424.z@gmail.com	968254659	t	2025-07-28 01:27:40.962	\N	2025-08-02 17:04:09.057647	-33.51476456	-70.74419046	Concepción	Lota	\N	20275075-3	Melo	Zapata	CHILENA	Mujer	Exequiel 038	2027-08-27	f	01574763-b65c-4b67-b638-1d19de13f28b	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19802001808	contratado
c2972320-242b-46d3-b0e2-ef84b001a28a	accebf8a-bacc-41fa-9601-ed39cb320a52	Bayron daylan	vegabayron80@gmail.com	983347924	t	2025-07-28 01:27:39.966	\N	2025-08-02 17:04:09.535544	-33.58168721	-70.66328587	Santiago	El Bosque	\N	20597667-1	Marinao	Vega	CHILENA	Hombre	Vecinal sur 1962	2026-03-07	f	d17cd2f0-850c-4af2-845e-bce5ce80a269	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	205976671	contratado
497a25b7-2576-406a-9abd-47318375f228	accebf8a-bacc-41fa-9601-ed39cb320a52	Constanza, Breve, Villa	franciscabrevevilla@gmail.com	984234770	t	2025-07-28 01:27:46.088	\N	2025-08-02 17:04:10.784771	-33.60165672	-70.69723873	Concepción	Lota	\N	21176547-K	Breve	Villa	CHILENA	Mujer	Julio Rivas 64	2028-06-10	f	01574763-b65c-4b67-b638-1d19de13f28b	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	21176547	contratado
11740046-eb51-4a8a-913b-b24ac709f6eb	accebf8a-bacc-41fa-9601-ed39cb320a52	Alexi Alejandro	asndvl9@gmail.com	946235204	f	2025-07-30 18:51:30.542309	\N	2025-08-02 17:04:11.007265	-33.49917001	-70.73651730	Concepción	Coronel	\N	21381703-5	Sandoval	Inostroza	CHILENA	Hombre	pasaje valle hondo 1729	2028-02-11	t	\N	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19995964953	contratado
19199a0e-ce79-4f4b-8d2a-d5e20aaea829	accebf8a-bacc-41fa-9601-ed39cb320a52	Rafael Ervigio	rafaelescalona11@gmail.com	949534643	t	2025-07-28 01:27:44.81	\N	2025-08-02 17:04:13.82218	-33.57155433	-70.66827482	Santiago	Ñuñoa	\N	26131604-8	Escalona	Aponte	VENEZOLANA	Hombre	los Alerces 2660	\N	f	7e05a55d-8db6-4c20-b51c-509f09d69f74	ae18bf67-9429-4f68-8463-d09356b08ef2	CTE	990181764	contratado
267905e8-933c-4d5b-9fbc-16fe6937291d	accebf8a-bacc-41fa-9601-ed39cb320a52	Valenzuela Víctor Alejandro	victordelcanto07@gmail.com	989635226	t	2025-07-28 01:27:39.107	\N	2025-08-02 17:04:15.174533	-33.45543509	-70.70148723	Santiago	Estación Central	\N	8667233-2	Del Canto	Valenzuela	CHILENA	Hombre	Radal 066 torre A Dpto 2403	\N	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19822226717	contratado
a752bc80-f65f-4926-9295-1d8a3334bd58	accebf8a-bacc-41fa-9601-ed39cb320a52	Marco antonio	9178825K@gardops.cl	966751399	f	2025-07-30 19:12:33.244113	\N	2025-08-02 17:04:16.167426	-33.44599460	-70.66705690	Valparaíso	Viña del Mar	\N	9178825-K	Zamora	Zamora	CHILENA	Hombre	Calle austral 4933 primer sector gomez carreño	\N	t	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	9178825	contratado
8f18d31c-0588-40a1-af58-d32d21397783	accebf8a-bacc-41fa-9601-ed39cb320a52	Winter Benjamin		959517552	f	2025-07-30 18:51:30.262215	\N	2025-08-02 17:04:21.133325	-33.61941440	-70.60843870	Antofagasta	Antofagasta	\N	12833245-6	Rebolledo	Molina	CHILENA	Hombre	Antonio Rendic 5859	\N	t	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	128332456	contratado
cacdbbae-8e2f-4b82-a396-fc921e2c5030	accebf8a-bacc-41fa-9601-ed39cb320a52	Hortencia Johanna	Vasquesjhoana1@gmail.com	987919415	t	2025-07-28 01:28:09.365	\N	2025-08-02 17:04:24.572456	-33.59295961	-70.60279912	Cordillera	Puente Alto	\N	14161708-7	Vasquez	Medel	CHILENA	Mujer	Llallin blok 1869 departamento B12 villa padre hurtado	\N	f	d3715abb-191d-4456-8f36-970fd355c399	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	14161708	contratado
895c85d0-3b42-473e-ab81-61fb77717257	accebf8a-bacc-41fa-9601-ed39cb320a52	Vanessa Soledad	vanessadonaire1182@gmail.com	989758437	t	2025-07-28 01:27:44.522	\N	2025-08-02 17:04:25.454009	-33.36634982	-70.66733686	Talagante	Padre Hurtado	\N	15357842-7	Donaire	Balboa	CHILENA	Mujer	Los datiles 1182	\N	f	387f0af5-751d-465e-aff3-0768c3fb55c1	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	15357842	contratado
da5e9ed2-bbf0-4ee6-85a3-ce68b27099f8	accebf8a-bacc-41fa-9601-ed39cb320a52	Sergio omar	sergio.fuentes1985@gmail.com	993056249	t	2025-07-28 01:27:46.654	\N	2025-08-02 17:04:27.071844	-33.47005642	-70.64228598	Santiago	Santiago	\N	16069830-6	fuentes	parra	CHILENA	Hombre	avenida santa rosa 1865	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16069830	contratado
a3e75274-7548-4567-921e-617d74542b43	accebf8a-bacc-41fa-9601-ed39cb320a52	esteban	esteban.schuldiner@gmail.com	992361720	t	2025-07-28 01:27:46.513	\N	2025-08-02 17:04:36.102035	-33.43052208	-70.66688100	Talagante	Peñaflor	\N	19230331-1	fuentes	hernandez	CHILENA	Hombre	manuel castillo 1404	\N	f	\N	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19991598307	contratado
b3b36795-f373-4b5b-a19c-03680dec63e4	accebf8a-bacc-41fa-9601-ed39cb320a52	Franco Antonio	francofireyes5@gmail.com	940828884	t	2025-07-28 01:27:45.66	\N	2025-08-02 17:04:39.205553	-33.54618646	-70.76544867	Diguillín	Chillán	\N	20375871-5	Figueroa	Reyes	CHILENA	Hombre	Fray juan macias	\N	f	fe761cd0-320f-404a-aa26-2e81093ee12e	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	20375871	contratado
2e2ac2e2-c8cc-46b6-96c1-693b34f3f697	accebf8a-bacc-41fa-9601-ed39cb320a52	Jesus	jabatkd73@gmail.com	920471068	t	2025-07-28 01:27:38.255	\N	2025-08-02 17:04:40.205604	-33.47757919	-70.58010730	Santiago	Macul	\N	20598931-5	Basoalto	Araya	CHILENA	Hombre	Enrique Molina Garmendia 4883	\N	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19831594650	contratado
06bb0d02-4e08-4141-879d-014f1b274d66	accebf8a-bacc-41fa-9601-ed39cb320a52	Darrlynn maylin	darrlynn8@gmail.com	942749043	t	2025-07-28 01:27:41.533	\N	2025-08-02 17:46:30.759676	-34.12488000	-71.10039000	Antofagasta	Mejillones	\N	19701833-K	Caballero	Julio	CHILENA	Mujer	Ernesto salinas block 1240	\N	f	c6ded533-6227-45ad-bb64-e1f029a6f0b2	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	19701833	contratado
9cfb8257-5ff2-4465-a366-9e01679d4c06	accebf8a-bacc-41fa-9601-ed39cb320a52	Osvaldo Francisco	mej0394@hotmail.com	962283295	t	2025-07-28 01:27:45.096	\N	2025-08-02 17:03:55.725796	-33.57501882	-70.60533766	Cordillera	Puente Alto	\N	9127178-8	Escobar	Jorquera	CHILENA	Hombre	Pasaje Salar Grande #3878	2027-08-20	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	9127178	contratado
51c4ce5d-0878-4ebc-8ba9-4387db520c6b	accebf8a-bacc-41fa-9601-ed39cb320a52	JUAN ISRAEL	JUANFUENTEALBA03@GMAIL.COM	976984009	t	2025-07-28 01:27:46.373	\N	2025-08-02 17:03:57.972753	-33.44456430	-70.66947112	Santiago	Santiago	\N	11628893-1	FUENTEALBA	VASQUEZ	CHILENA	Hombre	GENERAL BULNES82 CASA 4	2027-10-09	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	11628893	contratado
5565bc44-1e30-4dfa-ac8d-017ee65f0dc8	accebf8a-bacc-41fa-9601-ed39cb320a52	Miguel angel	michelandita2023@gmail.com	992669652	t	2025-07-28 01:27:41.958	\N	2025-08-02 17:04:01.743571	-33.52553131	-70.77273290	Concepción	Penco	\N	15952021-8	Carrrera	Jara	CHILENA	Hombre	La conquista jaime lea plaza #180	2025-02-20	f	4bfe800b-06d0-4633-be95-23fae0ac1401	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	15952021	contratado
187cf0bc-e730-46f8-ad96-6993623a1fad	accebf8a-bacc-41fa-9601-ed39cb320a52	Luis Antonio	z.luis.antonio1996@gmail.com	953566281	t	2025-07-28 01:27:38.825	\N	2025-08-02 17:04:07.119245	-33.55664886	-70.69155783	Santiago	El Bosque	\N	19236961-4	Zúñiga	Villanueva	CHILENA	Hombre	Av José Joaquín prieto 10914	2026-04-28	f	d17cd2f0-850c-4af2-845e-bce5ce80a269	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	19236961	contratado
5a355f95-311a-4b59-be07-50f82c5c8c07	accebf8a-bacc-41fa-9601-ed39cb320a52	Javiera Fernanda	javiera.alfaro.bst@gmail.com	986291207	t	2025-07-28 01:27:39.25	\N	2025-08-02 17:04:34.207634	-33.66855599	-70.74717408	Talagante	Talagante	\N	18347858-3	Alfaro	Bustamante	CHILENA	Mujer	Volcán isluga 649	\N	f	387f0af5-751d-465e-aff3-0768c3fb55c1	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	18347858	contratado
3790fabc-83af-400c-b4c2-5acfe6b2bd41	accebf8a-bacc-41fa-9601-ed39cb320a52	MARIO ANTONIO	mario.gonzaleznovoa@gmail.com	987418347	t	2025-07-28 01:27:47.931	\N	2025-08-02 17:03:56.176499	-33.41670000	-70.71670000	Santiago	Cerro Navia	\N	9494724-3	GONZÁLEZ	NOVOA	CHILENA	Hombre	Av. ventisqueros 1561, sector 2 torre C dpto:104	\N	f	fbe9a174-aa3d-490c-8522-a42b8fe296e2	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	9494724	contratado
7095f1bc-bcbb-4e83-b9a1-443bfb5e9b3c	accebf8a-bacc-41fa-9601-ed39cb320a52	Berta Carolina	bertita081964@gmail.com	998813886	t	2025-07-28 01:27:54.759	\N	2025-08-02 17:03:56.792722	-33.44943620	-70.66536743	Santiago	Santiago	\N	10488294-3	Molina	Castillo	CHILENA	Mujer	Salvador san fuente 2150	2027-01-18	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	10488294	contratado
15f25035-abd3-49c6-b169-57413fc0da9a	accebf8a-bacc-41fa-9601-ed39cb320a52	Isaac Andres	isacmo39@gmail.com	929969268	t	2025-07-28 01:27:55.609	\N	2025-08-02 17:03:57.015192	-33.52755570	-70.66543406	Santiago	La Cisterna	\N	10536248-K	Muñoz	Castillo	CHILENA	Hombre	Calle plaza 8146	2025-11-14	f	d17cd2f0-850c-4af2-845e-bce5ce80a269	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	10536248	contratado
af274bcc-7980-43fe-b543-06541a9c2845	accebf8a-bacc-41fa-9601-ed39cb320a52	Freddy	toribiorobinet1362@gmail.com	939730790	t	2025-07-28 01:27:47.647	\N	2025-08-02 17:03:58.979672	-33.41127318	-70.67273068	Santiago	Independencia	\N	12241748-4	gonzalez	campos	CHILENA	Hombre	carlos toribio robinet #1362	2027-11-05	f	0d3c9a36-3357-40a5-85db-d94086f22b32	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	12241748	contratado
47ebd326-af62-40d7-95f7-530ecad67d58	accebf8a-bacc-41fa-9601-ed39cb320a52	Jorge Andres	jorge.montenegro@gard.cl		t	2025-07-28 01:27:55.184	\N	2025-08-02 17:04:00.509348	-33.38520718	-70.54451958	Santiago	Vitacura	\N	13051246-1	Montenegro	Fuenzalida	CHILENA	Hombre	Las Hulaltatas 9351	\N	f	7e05a55d-8db6-4c20-b51c-509f09d69f74	9aaa69ff-8981-4534-b8cf-bb3888cfc3f1	CTE	1463779599	contratado
9d60e716-8d55-4f7c-bf64-7e8b0c88c466	accebf8a-bacc-41fa-9601-ed39cb320a52	Francisco Guillermo	franciscojofre27@gmail.com	994344846	t	2025-07-28 01:27:50.779	\N	2025-08-02 17:04:02.926625	-33.40731728	-70.76690209	Santiago	Cerro Navia	\N	16646373-4	Jofré	Jofré	CHILENA	Hombre	Av. Ventisqueros 1561 B /C dep 302	2026-04-10	f	fbe9a174-aa3d-490c-8522-a42b8fe296e2	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16646373	contratado
a991c64c-9e8a-4260-876b-1148656fd8a4	accebf8a-bacc-41fa-9601-ed39cb320a52	Jeferson Alexander	alexanderjeferson30@gmail.com	930390530	t	2025-07-30 19:19:32.180744	\N	2025-08-02 17:04:06.607272	-36.82690000	-73.04980000	Concepción	Concepción	\N	19139275-2	Roa	Figueroa	CHILENA	Hombre	Chacabuco 1021	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	19139275	contratado
4b45a290-50e3-456e-8667-b678d1ab5dc7	accebf8a-bacc-41fa-9601-ed39cb320a52	Cristopher Guillermo	vicentematias972@gmail.com	992240550	t	2025-07-28 01:27:54.9	\N	2025-08-02 17:04:06.886783	-33.42036000	-70.72528000	Diguillín	San Ignacio	\N	19164452-2	Molina	Roldan	CHILENA	Hombre	Las quilas km 1.4 pueblo seco	2027-02-21	f	fe761cd0-320f-404a-aa26-2e81093ee12e	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	15180260791	contratado
2429a737-27e1-451c-b32e-8505499050c4	accebf8a-bacc-41fa-9601-ed39cb320a52	Braulio Giovanni	braulio.gio.54@gmail.com	977281738	t	2025-07-28 01:27:54.328	\N	2025-08-02 17:04:07.333883	-33.44401608	-70.66618902	Santiago	Santiago	\N	19263689-2	Miranda	Alvarez	CHILENA	Hombre	Santa Mónica 2239	2025-12-22	f	b28aecde-b43d-4d98-9cff-93640ca14aed	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	19263689	contratado
27b3f043-0a2f-4ea4-aba2-abae85f8d2fd	accebf8a-bacc-41fa-9601-ed39cb320a52	Luis ivan	luisinostrozavasquez1@gmail.com	935196320	t	2025-07-28 01:27:50.071	\N	2025-08-02 17:04:07.806459	-33.54193721	-70.57130512	Santiago	La Florida	\N	19587903-6	Inostroza	Vasquez	CHILENA	Hombre	Pto príncipe 1479	2026-06-01	f	fbe9a174-aa3d-490c-8522-a42b8fe296e2	4870c49b-6be2-4f54-adb5-9783274bb467	CTA	240512493	contratado
7f01a561-2dc7-483a-bacd-90113ef991a8	accebf8a-bacc-41fa-9601-ed39cb320a52	Nils Excelquiel	nilsexequiell@gmail.com	935866628	t	2025-07-28 01:27:51.769	\N	2025-08-02 17:04:11.457056	-33.45464161	-70.66877434	Aisén	Aisén	\N	22382630-K	Leiva	Castañon	CHILENA	Hombre	Av españa 474	2028-07-03	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19812438744	contratado
b586944b-4685-42d1-a6f0-2cc94ed9ebfc	accebf8a-bacc-41fa-9601-ed39cb320a52	Cristian	cfloresm6304@gmail.com	993996691	t	2025-07-28 01:27:53.901	\N	2025-08-02 17:04:12.460749	-33.48093860	-70.61093062	Calama	Calama	\N	25547490-1	Mesa	Flores	BOLIVIANA	Hombre	Ñielol poniente 2769	2027-11-11	f	8cdf54bf-7959-4487-a7e7-45d49e139413	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	25547490	contratado
c6c01285-b6c1-46ed-a86d-af1dc877319a	accebf8a-bacc-41fa-9601-ed39cb320a52	Paula Andrea	pauandreahurtado97@gmail.com	923897064	t	2025-07-30 19:19:32.734637	\N	2025-08-02 17:04:13.334302	-23.65090000	-70.39550000	Antofagasta	Mejillones	\N	25933812-3	Hurtado	Campos	CHILENA	Mujer	España casa 3	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	25933812	contratado
f4b929b3-e76d-45bb-bff5-ca85ec729965	accebf8a-bacc-41fa-9601-ed39cb320a52	Xavier Antonio	gxavierantonio12@gmail.com	959638689	t	2025-07-28 01:27:48.074	\N	2025-08-02 17:04:14.517444	-33.42107611	-70.69106458	Santiago	Quinta Normal	\N	27263431-9	González	Torres	VENEZOLANA	Hombre	juaquin warkel martines 2428	\N	f	e575e81e-f7b0-4891-8853-dfa64af6c963	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	27263431	contratado
04b31eb5-c5ac-4de6-bd21-ef7efc3a56d5	accebf8a-bacc-41fa-9601-ed39cb320a52	Test Apellidos	test.apellidos@test.com	+56987654321	t	2025-07-31 04:52:40.670157	\N	2025-07-31 04:52:40.670157	\N	\N	\N	\N	\N	99888777-6	Paterno	Materno	\N	\N	\N	\N	f	\N	\N	\N	\N	contratado
9dd15351-dfdf-4308-9aea-5a020003037e	accebf8a-bacc-41fa-9601-ed39cb320a52	Ricardo	r.montero181@gmail.com	944344419	t	2025-07-28 01:27:55.325	\N	2025-08-02 17:04:17.091994	-33.47038180	-70.66827599	Talagante	Peñaflor	\N	10088316-3	Montero	Vasquez	CHILENA	Hombre	Parcela 24 camino pelvin	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	10088316	contratado
dd96c4d6-06b0-4b7c-805d-5e4c00a2f6bd	accebf8a-bacc-41fa-9601-ed39cb320a52	Pedro antonio	132112924@gardops.cl	957868900	f	2025-07-30 19:12:33.927955	\N	2025-08-02 17:04:21.854543	-33.59908493	-70.67393705	Antofagasta	Antofagasta	\N	13211292-4	Avalos	Correa	CHILENA	Hombre	Ernesto riquelme 1575 - A	\N	t	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	13211292	contratado
3555c2c9-e5b2-4807-95a8-aa238d4bf6ae	accebf8a-bacc-41fa-9601-ed39cb320a52	Escandar Jamil	jamiljalil2878@gmail.com	981911912	t	2025-07-28 01:27:50.355	\N	2025-08-02 17:04:23.68789	-33.43227791	-70.66635500	Maipo	San Bernardo	\N	13925685-9	Jalil	Jalil	CHILENA	Hombre	Baquedano1401	\N	f	387f0af5-751d-465e-aff3-0768c3fb55c1	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	15842335527	contratado
1fb458d0-3124-44be-82e7-ee45671c12f7	accebf8a-bacc-41fa-9601-ed39cb320a52	Mariana	marianalagos886@gmail.com	928559476	t	2025-07-28 01:27:51.342	\N	2025-08-02 17:04:30.835567	-33.47585722	-70.56166216	Santiago	Peñalolén	\N	17315963-3	Lagos	Antinao	CHILENA	Mujer	Chimiles 6998	\N	f	d3715abb-191d-4456-8f36-970fd355c399	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	17315963	contratado
cf34cee2-2318-4e91-b32a-fa2e0c7fa092	accebf8a-bacc-41fa-9601-ed39cb320a52	Felipe Andrés	felipelazo1992@gmail.com	921823743	t	2025-07-28 01:27:51.483	\N	2025-08-02 17:04:33.846941	-33.37711365	-70.50879315	Santiago	Pudahuel	\N	18089259-1	Lazo	Monroy	CHILENA	Hombre	Pasaje mira 860i	\N	f	e575e81e-f7b0-4891-8853-dfa64af6c963	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	18089259	contratado
f418cc9a-fd92-4b77-913a-dd8a2a74f494	accebf8a-bacc-41fa-9601-ed39cb320a52	Sergio alexander	alexander33ga420@gmail.com	959915680	t	2025-07-28 01:27:47.504	\N	2025-08-02 17:04:34.045589	-33.43489899	-70.64290126	Talagante	Peñaflor	\N	18200193-7	Gonzalez	Alvarado	CHILENA	Hombre	Forestal 1125	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	18200193	contratado
c0e2b175-6148-42ed-b770-8f5e1af7bb1d	accebf8a-bacc-41fa-9601-ed39cb320a52	Diego Andres	diegopurpura@hotmail.com	945229874	t	2025-07-28 01:27:47.788	\N	2025-08-02 17:04:35.333704	-33.53081966	-70.69421283	Antofagasta	Antofagasta	\N	19102275-0	Gonzalez	Maragaño	CHILENA	Hombre	Veinte de agosto 623	\N	f	f86c238c-145e-48c8-a528-c6897ba8134d	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	19102275	contratado
fb2ea2ac-33cd-4f74-bf5c-45c01e36feca	accebf8a-bacc-41fa-9601-ed39cb320a52	Jose fermin	pepefermin702@gmail.com	946375629	t	2025-07-28 01:27:47.363	\N	2025-08-02 17:04:42.142792	-33.61720779	-70.58255523	Cordillera	Puente Alto	\N	25061565-5	Gonzales	Carrasco	PERUANA	Hombre	Sargento menadier 655	\N	f	fa95f165-9796-4823-9eca-5acf3a1e92c1	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	25061565	contratado
f41ec921-0aae-4549-8664-9fc6a699412e	accebf8a-bacc-41fa-9601-ed39cb320a52	SERGIO ROBERTO	totochuncho@gmail.com	991626267	t	2025-07-30 19:19:31.679487	\N	2025-08-02 17:03:55.927173	-36.82690000	-73.04980000	Concepción	Lota	\N	9166943-9	CASTILLO	LASTRA	CHILENA	Hombre	Perez Rosales 832	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	9166943	contratado
6584f049-f64b-444f-8ac1-fd93418fbdaa	accebf8a-bacc-41fa-9601-ed39cb320a52	Daniel Ignacio	d.zuniga35@icloud.com	950535708	t	2025-07-30 19:19:32.367691	\N	2025-08-02 17:04:09.319197	-33.44890000	-70.66930000	Santiago	La Florida	\N	20382235-9	Zúñiga	Arce	CHILENA	Hombre	Los canarios	\N	f	\N	9aaa69ff-8981-4534-b8cf-bb3888cfc3f1	CTA	100224143	contratado
817d21b0-d5ef-4438-8adf-6258585b23a3	accebf8a-bacc-41fa-9601-ed39cb320a52	Test Modal	test.modal@test.com	+56912345678	t	2025-07-31 04:42:09.16558	\N	2025-08-06 19:44:50.584937	\N	\N	\N	\N	\N	11222333-4	Guardia Test		\N	\N	\N	2025-08-21	f	\N	\N	\N	\N	contratado
7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	accebf8a-bacc-41fa-9601-ed39cb320a52	A Test	test@test.com	+56912345678	t	2025-07-31 04:33:14.445291	\N	2025-08-06 20:03:19.019033	-33.36405540	-70.51478340	\N	\N	\N	12345678-0	Guardia		\N	\N	Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile	2025-08-15	f	15631bd6-03a9-459d-ae60-fc480f7f3e84	\N	\N	\N	contratado
b3ed4a25-493d-4246-9a60-f5525fc5b809	accebf8a-bacc-41fa-9601-ed39cb320a52	Ivan Enzo	ivangrandon29@gmail.com	926397028	t	2025-07-28 01:27:57.316	\N	2025-08-02 17:03:57.52811	-33.47907916	-70.55900051	Antofagasta	Antofagasta	\N	10682652-8	Grandon	Hormazabal	CHILENA	Hombre	Pasaje paranal 158	2025-11-28	f	f86c238c-145e-48c8-a528-c6897ba8134d	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	11510177918	contratado
97bbfaf8-2c11-4f95-9a16-f2c964660a7a	accebf8a-bacc-41fa-9601-ed39cb320a52	Cristian	Cristian.larenas@live.com	920469968	t	2025-07-28 01:28:01.007	\N	2025-08-02 17:03:59.484504	-33.50450279	-70.60328720	Santiago	Macul	\N	12474213-7	Reyes	Larenas	CHILENA	Hombre	Las codornices 2929	2017-09-08	f	254b6b4a-6d74-4f1a-a1ca-d3e23960998c	ae18bf67-9429-4f68-8463-d09356b08ef2	CTE	989136410	contratado
09748c2d-252d-484c-aba3-725d540ed004	accebf8a-bacc-41fa-9601-ed39cb320a52	Miguel Alejandro	miguel.parra.morales@gmail.com	940608040	t	2025-07-28 01:27:58.589	\N	2025-08-02 17:04:02.454858	-33.51244038	-70.64645629	Santiago	San Miguel	\N	16407431-5	Parra	Morales	CHILENA	Hombre	San petersburgo 6351 dpto 1407A	2026-04-13	f	88b0407a-01bb-43b9-87cd-d06da531aa08	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16407431	contratado
99a272c8-3e1d-4f9b-852c-213ea0f4afb4	accebf8a-bacc-41fa-9601-ed39cb320a52	Manuel Ignacio	sazopadim@gmail.com	955164519	t	2025-07-28 01:28:03.987	\N	2025-08-02 17:04:04.453403	-33.39858674	-70.55275231	Santiago	Las Condes	\N	17822533-2	Sazo	Padilla	CHILENA	Hombre	Las Verbenas 8055	\N	f	7e05a55d-8db6-4c20-b51c-509f09d69f74	d8f390a2-2466-4bc8-9032-903a0e84e85b	CTE	76072827	contratado
5c98b895-4ec5-4d7a-9560-1ab6538f29d7	accebf8a-bacc-41fa-9601-ed39cb320a52	Karla Mabelyn	cristhoperogaldeogalde@gmail.com	954585801	t	2025-07-28 01:27:56.036	\N	2025-08-02 17:04:05.928111	-33.54707049	-70.66292697	Antofagasta	Mejillones	\N	18825021-1	Ogalde	Campos	CHILENA	Mujer	Riquelme 323	2026-05-30	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	18825021	contratado
49d52452-a8b3-41ee-a0bf-5a3d6ea9e3ab	accebf8a-bacc-41fa-9601-ed39cb320a52	Jorge Luis	jorgesaez29032001@gmail.com	920139245	t	2025-07-28 01:28:03.276	\N	2025-08-02 17:04:09.783009	-33.37359691	-70.67352738	Santiago	Conchalí	\N	20672441-2	Saez	Molina	CHILENA	Hombre	Rupanco 5642	\N	f	fbe9a174-aa3d-490c-8522-a42b8fe296e2	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19830655354	contratado
0cd87509-12fc-4a0b-a8c1-0ce1bfbdc6cc	accebf8a-bacc-41fa-9601-ed39cb320a52	Fernando jesus	fernandoolave11@gmail.com	949099671	t	2025-07-28 01:27:56.461	\N	2025-08-02 17:04:10.054509	-33.35350031	-70.71982223	Chañaral	Chañaral	\N	20741083-7	Olave	Gutierrez	CHILENA	Hombre	Julio Montt 537	2028-06-26	f	ff6689ad-88f5-4089-b007-f4a88b73549a	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	20741083	contratado
143ce7d3-079b-4662-8e11-535679c41cbd	accebf8a-bacc-41fa-9601-ed39cb320a52	Ayelen Natali	anatalypaez@gmail.com	922540289	t	2025-07-28 01:27:57.743	\N	2025-08-02 17:04:11.964866	-33.48906911	-70.60672730	Santiago	Macul	\N	24443494-0	Paez	Martinez	CHILENA	Mujer	Pedro de Valdivia 7057	\N	f	d3715abb-191d-4456-8f36-970fd355c399	06ec2d0a-7a22-44b7-9131-ae4089a96543	CTA	1015936397	contratado
c95bdc12-07ff-429a-9af7-fda82c628e66	accebf8a-bacc-41fa-9601-ed39cb320a52	MARCO AURELIO	91466899@gardops.cl	957142804	f	2025-07-30 19:19:33.422457	\N	2025-08-02 17:04:15.933095	-33.44890000	-70.66930000	Santiago	Ñuñoa	\N	9146689-9	CEVASCO	BAIER	CHILENA	Hombre	AVENIDA CARLOS DITTBORN 0410 DPTO 105 BLOCK 54	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	9146689	contratado
882bfb82-506c-4402-ac3c-08e363c00c1c	accebf8a-bacc-41fa-9601-ed39cb320a52	Marcos eduardo	93508076@gardops.cl	966518239	f	2025-07-30 19:19:33.609074	\N	2025-08-02 17:04:16.405767	-33.61670000	-70.58330000	Cordillera	Puente Alto	\N	9350807-6	Pailamilla	Torres	CHILENA	Hombre	El meli 997	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	9350807	contratado
2dfe3beb-af5d-4217-8b69-712ed9c050a6	accebf8a-bacc-41fa-9601-ed39cb320a52	PEDRO ISMAEL	99204834@gardops.cl	941489231	f	2025-07-30 19:19:33.790845	\N	2025-08-02 17:04:16.655286	-33.44890000	-70.66930000	Santiago	Independencia	\N	9920483-4	SEVERINO	MIRANDA	CHILENA	Hombre	LAS CAÑAS 1451	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	9920483	contratado
542ca641-a706-4add-a4f5-8a1ba239b836	accebf8a-bacc-41fa-9601-ed39cb320a52	Mauricio Sebastian	Mauricio.Quilaqueo.salazar@gmail.com	930572187	t	2025-07-28 01:28:00.289	\N	2025-08-02 17:04:18.292252	-33.55976099	-70.80223762	Talagante	Padre Hurtado	\N	10361467-8	Quilaqueo	Salazar	CHILENA	Hombre	Camino San Alberto Hurtado 3812	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	10361467	contratado
09baf1a5-f1c1-4d1d-a563-98ebf2ac34ff	accebf8a-bacc-41fa-9601-ed39cb320a52	JOAQUIN ENRIQUE	103962889@gardops.cl	939025162	f	2025-07-30 19:19:35.124524	\N	2025-08-02 17:04:18.495464	-33.44890000	-70.66930000	Santiago	Estación Central	\N	10396288-9	MEDINA	MUÑOZ	CHILENA	Hombre	MANUEL PLAZA 4807	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	10396288	contratado
caa478b3-5a3a-4c07-aeba-cdd2fbd5374e	accebf8a-bacc-41fa-9601-ed39cb320a52	Oscar Enrique	108262818@gardops.cl	993865322	f	2025-07-30 19:19:35.329003	\N	2025-08-02 17:04:18.67899	-33.44890000	-70.66930000	Santiago	El Bosque	\N	10826281-8	Ruiz	Urrea	CHILENA	Hombre	Pasaje Los Robles  11293	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	10826281	contratado
29c743b5-fb8a-46c3-ae1e-453f0f4cd6ee	accebf8a-bacc-41fa-9601-ed39cb320a52	Tatiana	112074945@gardops.cl	991574435	f	2025-07-30 19:19:35.51487	\N	2025-08-02 17:04:18.882238	-33.44890000	-70.66930000	Santiago	Lo Barnechea	\N	11207494-5	Contreras	Salas	CHILENA	Mujer	Las condes 1226	\N	f	\N	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	1001-379559-8	contratado
77b58c7b-8de5-4144-b22a-c2a3aead9001	accebf8a-bacc-41fa-9601-ed39cb320a52	Fabián Antonio	116143577@gardops.cl	990097974	f	2025-07-30 19:19:35.697024	\N	2025-08-02 17:04:19.477255	-23.65090000	-70.39550000	Antofagasta	Antofagasta	\N	11614357-7	Hormazabal	Ascueta	CHILENA	Hombre	Pasaje Juan ferra # 7435	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	11614357-7	contratado
29720b55-78ef-4f51-af2c-40d4933c6a2b	accebf8a-bacc-41fa-9601-ed39cb320a52	Auristela del Carmen	Kelapalma9@gmail.com	944075813	t	2025-07-28 01:27:58.025	\N	2025-08-02 17:04:20.574513	-33.57523940	-70.66937221	Concepción	Concepción	\N	12181223-1	Palma	Ulloa	CHILENA	Mujer	Tacna 3	\N	f	4bfe800b-06d0-4633-be95-23fae0ac1401	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	53371706328	contratado
9f09f78c-b914-4d74-b0fc-f0a904bf81f5	accebf8a-bacc-41fa-9601-ed39cb320a52	Ariel antonio	arielseguelgarrido41@gmail.com	954391547	t	2025-07-28 01:28:04.269	\N	2025-08-02 17:04:25.294674	-33.43250262	-70.76233540	Santiago	Pudahuel	\N	15231756-5	Seguel	Garrido	CHILENA	Hombre	Federico errazuris 1245	\N	f	e575e81e-f7b0-4891-8853-dfa64af6c963	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19810970338	contratado
9254d98a-0700-4ef2-ab28-5402465296ea	accebf8a-bacc-41fa-9601-ed39cb320a52	Luis alfonso	lxolopez.1987@gmail.com	983030733	t	2025-07-28 01:28:03.419	\N	2025-08-02 17:04:29.708617	-33.46423810	-70.69825382	Diguillín	Chillán	\N	16885321-1	Sandoval	Lopez	CHILENA	Hombre	Calle padre hurtado 198	\N	f	fe761cd0-320f-404a-aa26-2e81093ee12e	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16885321	contratado
e6419c71-1cec-4831-acc2-825efed16abb	accebf8a-bacc-41fa-9601-ed39cb320a52	Cristian Andrés	cristianandres.pieces@gmail.com	934858238	t	2025-07-28 01:27:59.722	\N	2025-08-02 17:04:31.072057	-33.45245697	-70.60501970	Antofagasta	Antofagasta	\N	17378998-K	Pieces	Pieces	CHILENA	Hombre	Calle Valdivia 3285	\N	f	3c1586b5-136a-4ee1-88a9-410284f49807	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	17378998	contratado
c2614875-686c-4450-9a7d-607bff76817a	accebf8a-bacc-41fa-9601-ed39cb320a52	Barbara Patricia	barbara.p.bravo@gmail.com	986037678	t	2025-07-28 01:27:59.438	\N	2025-08-02 17:04:35.688282	-33.59704003	-70.67506468	Maipo	San Bernardo	\N	19189337-9	Perez	Bravo	CHILENA	Mujer	Cerro la cruz 14600 dpto 13	\N	f	387f0af5-751d-465e-aff3-0768c3fb55c1	7b4d5794-241f-4267-aa43-9bae55e7b82f	CTE	4014792323	contratado
df003e4f-78ea-4c64-98df-abf21cbec417	accebf8a-bacc-41fa-9601-ed39cb320a52	Andres esteban	andres.ruiz.esteban@gmail.com	987060053	t	2025-07-28 01:28:02.994	\N	2025-08-02 17:04:40.615134	-33.60398839	-70.55541027	Talagante	Peñaflor	\N	20816989-0	Ruiz	Alarcon	CHILENA	Hombre	Villa las lomas pasaje cerro alegre 569	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	20816989	contratado
1b84832c-049b-4c70-9076-f2fd8cca3205	accebf8a-bacc-41fa-9601-ed39cb320a52	Carolina Brigit	quesquenbrigit@gmail.com	935368171	t	2025-07-28 01:28:00.009	\N	2025-08-02 17:04:41.79926	-33.41790396	-70.73527543	Santiago	Independencia	\N	24471940-6	Quesquen	Torres	PERUANA	Mujer	Anibal pinto	\N	f	d3715abb-191d-4456-8f36-970fd355c399	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	24471940	contratado
29e43be6-526b-4805-abfd-9653ae01f4a4	accebf8a-bacc-41fa-9601-ed39cb320a52	Isabel	Isabelashery123@gmail.com	996759158	t	2025-07-28 01:28:04.552	\N	2025-08-02 17:04:42.329173	-33.42370000	-70.60831000	Calama	Calama	\N	25972165-2	Shery	Shery	DOMINICANA	Mujer	Felix hoyos 2849	\N	f	8cdf54bf-7959-4487-a7e7-45d49e139413	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	12100086033	contratado
40d7e2cb-de31-45e5-99c5-1e965daed7e9	accebf8a-bacc-41fa-9601-ed39cb320a52	ANNDY JHAIR	ANNDYJHAIRP@GMAIL.COM	951907709	t	2025-07-28 01:27:59.155	\N	2025-08-02 17:04:42.726865	-33.47166769	-70.57367779	Santiago	Peñalolén	\N	26168695-3	PAZ	VALERIO	PERUANA	Hombre	PASAJE LADERA 1917	\N	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	26168695	contratado
6cf5712d-757d-4667-a690-08aacaa7d5b7	accebf8a-bacc-41fa-9601-ed39cb320a52	Humberto Eduardo Pedro	hsavini@gmail.com	995722033	t	2025-07-28 01:28:03.848	\N	2025-08-02 17:03:55.273061	-33.58234381	-70.56297971	Cordillera	Puente Alto	\N	9013015-3	Savini	Sariego	CHILENA	Hombre	Pasaje Los Misioneros 2972	2027-06-12	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	9013015	contratado
d8083f2a-d246-4ec1-9c77-d92d8bde496b	accebf8a-bacc-41fa-9601-ed39cb320a52	ADRIAN GABRIEL	colina02caldera@gmail.com	940651347	t	2025-07-28 01:27:43.811	\N	2025-08-02 17:04:14.0586	-33.40637232	-70.73104611	Santiago	Santiago	\N	26313985-2	COLINA	CALDERA	VENEZOLANA	Hombre	Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile	2027-11-14	f	b28aecde-b43d-4d98-9cff-93640ca14aed	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	15200175047	contratado
f2eb2a66-43ad-44e9-a59b-221e5ff4ca01	accebf8a-bacc-41fa-9601-ed39cb320a52	Juan Javier	jjjaraalarcon@gmail.com	957497592	t	2025-07-28 01:27:50.498	\N	2025-08-02 17:03:54.24726	-31.62592914	-71.16390009	Antofagasta	Antofagasta	\N	7808255-0	Jara	Alarcón	CHILENA	Hombre	Illapel 4781	2025-12-12	f	f86c238c-145e-48c8-a528-c6897ba8134d	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	7808255	contratado
930af3ac-4d37-4003-90df-b551866ce9c9	accebf8a-bacc-41fa-9601-ed39cb320a52	Cecilia	ceci_31@live.cl	984010595	t	2025-07-28 01:27:55.894	\N	2025-08-02 17:03:54.470618	-33.47097689	-70.67153399	Santiago	Santiago	\N	8337507-8	Norambuena	Prado	CHILENA	Mujer	Bascuñán Guerrero 1845	2027-08-21	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	8337507	contratado
d95d2727-b4fd-426a-8d2a-b344ffe7b02a	accebf8a-bacc-41fa-9601-ed39cb320a52	Rigoberto Felipe	rigoberto.briceno@gmail.com	975676229	t	2025-07-28 01:27:41.39	\N	2025-08-02 17:03:54.678038	-33.55277403	-70.61365609	Antofagasta	Antofagasta	\N	8360720-3	Briceño	Chuy	CHILENA	Hombre	Río imperial 8960	2027-07-30	f	f86c238c-145e-48c8-a528-c6897ba8134d	9aaa69ff-8981-4534-b8cf-bb3888cfc3f1	CTE	1340258409	contratado
374a80c6-df91-4c74-890b-bf4dd772c067	accebf8a-bacc-41fa-9601-ed39cb320a52	Anton Igor	acolimap@gmail.com	993587638	t	2025-07-28 01:27:43.668	\N	2025-08-02 17:03:55.015619	-33.47412769	-70.58518271	Santiago	Macul	\N	8452777-7	Colima	Packe	CHILENA	Hombre	Avenida Rodrigo de Araya 4507	2027-04-25	f	b28aecde-b43d-4d98-9cff-93640ca14aed	bda92040-ac11-4e2c-b8c9-dd017f48be09	CTE	777008452777	contratado
8521b322-1565-4517-a113-f3dd37ef7c1b	accebf8a-bacc-41fa-9601-ed39cb320a52	Jaime antonio	jaime.rojas81966@gmail.com	944080930	t	2025-07-28 01:28:02.142	\N	2025-08-02 17:03:56.375013	-33.51164379	-70.66481724	Santiago	San Miguel	\N	9570718-1	Rojas	Otarola	CHILENA	Hombre	Decima avenida 1430	\N	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	9570718	contratado
55dd4e1a-d165-43d7-adb2-3f0c0820936b	accebf8a-bacc-41fa-9601-ed39cb320a52	MARCELO IVAN	marceloastorga07@gmail.com	998692500	t	2025-07-28 01:27:40.395	\N	2025-08-02 17:03:57.267566	-33.50910000	-70.75670000	Santiago	Maipú	\N	10639040-1	ASTORGA	INOSTROZA	CHILENA	Hombre	COLISEO 970, VILLA EL ROSAL	2026-09-25	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	10639040	contratado
eea5fed4-a8ef-4f11-bc72-b626c0ee55db	accebf8a-bacc-41fa-9601-ed39cb320a52	Luis Wladimir	inostroza503castro@gmail.com	995149839	t	2025-07-28 01:27:49.784	\N	2025-08-02 17:03:58.208217	-33.44221842	-70.73696514	Santiago	Lo Prado	\N	11847393-0	Inostroza	Castro	CHILENA	Hombre	Los pimientos  8043	2025-07-21	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	11847393	contratado
563f1f35-4eb7-4698-be04-4b6c7c7bb188	accebf8a-bacc-41fa-9601-ed39cb320a52	Mariana olivia	marianatrigo1236@gmail.com	952181428	t	2025-07-28 01:28:05.966	\N	2025-08-02 17:04:01.437026	-33.59326156	-70.66002081	Antofagasta	Antofagasta	\N	15733474-3	Trigo	Tobar	CHILENA	Mujer	Colo Colo 1935	2028-05-26	f	8cdf54bf-7959-4487-a7e7-45d49e139413	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	15733474	contratado
173ee51d-c05e-4958-b9d3-1fd33929bf92	accebf8a-bacc-41fa-9601-ed39cb320a52	Alberto	Betostein89@gmail.com	975279788	t	2025-07-28 01:28:05.117	\N	2025-08-02 17:04:04.208023	-33.42697668	-70.61442750	Santiago	Providencia	\N	17596441-K	Stein	Andonegui	CHILENA	Hombre	Carlos Antunez 1831 dpto 210	\N	f	7e05a55d-8db6-4c20-b51c-509f09d69f74	9aaa69ff-8981-4534-b8cf-bb3888cfc3f1	CTA	177120269	contratado
55e48627-6dc6-4052-876e-d52f27601e2a	accebf8a-bacc-41fa-9601-ed39cb320a52	A Test 2	cl@cl.cl	982307771	t	2025-07-31 04:46:11.503924	\N	2025-08-02 00:42:33.956636	-33.36332430	-70.51511800	Región Metropolitana	Chile	\N	13255838-8	test		\N	\N	Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile	\N	f	\N	\N	\N	\N	contratado
3f29b636-e8db-4441-af03-0f99bcde6ff6	accebf8a-bacc-41fa-9601-ed39cb320a52	Constanza	torresmorenoconstanza@gmail.com	977890956	t	2025-07-28 01:28:05.824	\N	2025-08-02 17:04:05.687574	-33.54652181	-70.68355224	Santiago	El Bosque	\N	18764833-5	Torres	Moreno	CHILENA	Mujer	Antonio Borquez Solar 9733	2026-07-19	f	d3715abb-191d-4456-8f36-970fd355c399	7b4d5794-241f-4267-aa43-9bae55e7b82f	CTA	4040950326	contratado
7b931e60-1b80-4bfa-8f61-f86904214fc4	accebf8a-bacc-41fa-9601-ed39cb320a52	Fabián Alexis	yosoyfabiwilo@gmail.com	965564259	t	2025-07-28 01:28:08.514	\N	2025-08-02 17:04:06.167461	-33.37365529	-70.67245299	Santiago	Conchalí	\N	18947023-1	Valenzuela	Rojas	CHILENA	Hombre	Pasaje Moraleda 5668	2027-07-24	f	fbe9a174-aa3d-490c-8522-a42b8fe296e2	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	18947023	contratado
44a5d6f3-17d9-4b32-baa0-267af11f8d3a	accebf8a-bacc-41fa-9601-ed39cb320a52	Marta Abigail Sinaí	mvasconcelosveca@gmail.com	935073855	t	2025-07-28 01:28:09.081	\N	2025-08-02 17:04:08.56685	-33.45461891	-70.70451682	Santiago	Estación Central	\N	20140977-2	Vasconcelos	Veca	CHILENA	Mujer	Santa Petronila 28 depto #2515	2026-12-20	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	dfc676af-0c8d-4475-a831-b313e513c21b	CTE	95449514	contratado
24896086-42d4-401c-b7c9-15c64aedbf03	accebf8a-bacc-41fa-9601-ed39cb320a52	Francisca alejandra	Franciscavasquez57@gmail.com	933341615	t	2025-07-28 01:28:06.53	\N	2025-08-02 17:04:08.808003	-33.50355639	-70.56494326	Santiago	Peñalolén	\N	20200143-2	Vasquez	Vega	CHILENA	Mujer	Pasaje7 #5424	2028-06-19	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	20200143	contratado
67fde531-fbc0-47be-bbb6-dbc988f2436e	accebf8a-bacc-41fa-9601-ed39cb320a52	Albert junior	alb.sode22hh@gmail.com	930580853	t	2025-07-28 01:28:04.975	\N	2025-08-02 17:04:12.914487	-33.43678891	-70.67643188	Santiago	Santiago	\N	25764547-9	Sono	Delgado	PERUANA	Hombre	Rosas 3015	2027-12-10	f	d3715abb-191d-4456-8f36-970fd355c399	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	25764547	contratado
5aeeefd7-62c8-415d-9dfa-2fa3b55a2816	accebf8a-bacc-41fa-9601-ed39cb320a52	Wilmer Jose	wilmersimoza981@gmail.com	956281850	t	2025-07-28 01:28:04.834	\N	2025-08-02 17:04:14.287017	-33.41414189	-70.71232637	Santiago	Quinta Normal	\N	26440696-K	Simoza	Lopez	VENEZOLANA	Hombre	pasaje dos casa 2337	2027-04-18	f	e575e81e-f7b0-4891-8853-dfa64af6c963	dfc676af-0c8d-4475-a831-b313e513c21b	CTE	87346080	contratado
39087744-d4c3-4d68-a336-d0047c926ded	accebf8a-bacc-41fa-9601-ed39cb320a52	Juan daniel	ulloajuandaniel61@gmail.com	933364750	t	2025-07-28 01:28:07.807	\N	2025-08-02 17:04:15.615127	-33.43933391	-70.70242349	Santiago	Quinta Normal	\N	9117278-K	Ulloa	Oliva	CHILENA	Hombre	Pje ch  4764	\N	f	e92fbd13-f7b7-47ba-8f0f-a14808bfe1eb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	9117278	contratado
73380226-5bd2-4f91-a7ee-8d093f7e77e9	accebf8a-bacc-41fa-9601-ed39cb320a52	Claudia Carolina	vegamartinez69@gmail.com	966992576	t	2025-07-28 01:28:06.671	\N	2025-08-02 17:04:19.26286	-33.41065699	-70.65548860	Santiago	Independencia	\N	11486769-1	Vega	Martínez	CHILENA	Mujer	AV Francia #1157	\N	f	d3715abb-191d-4456-8f36-970fd355c399	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	11486769	contratado
fed6f6aa-7b36-4df7-81fa-540cdd648b59	accebf8a-bacc-41fa-9601-ed39cb320a52	Rodrigo Andrés	13283511K@gardops.cl	971904846	f	2025-07-30 19:19:36.734495	\N	2025-08-02 17:04:22.389541	-33.44890000	-70.66930000	Santiago	La Florida	\N	13283511-K	Rozas	Cortés	CHILENA	Hombre	Luche 7212	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTE	36000052773	contratado
847dc29c-7420-4708-8b34-9b46b7a8b1a4	accebf8a-bacc-41fa-9601-ed39cb320a52	Waldo sebastian	133446877@gardops.cl	927173264	f	2025-07-30 19:19:36.916681	\N	2025-08-02 17:04:22.567803	-33.44890000	-70.66930000	Santiago	Lo Barnechea	\N	13344687-7	Olguin	Navarro	CHILENA	Hombre	San marcos 535	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	13344687	contratado
adaaf9c3-c376-4c3c-b448-2a5209ea95bf	accebf8a-bacc-41fa-9601-ed39cb320a52	Eduardo Antonio	eturra4@gmail.com	932779567	t	2025-07-28 01:28:06.249	\N	2025-08-02 17:04:23.885439	-33.89994000	-70.24992000	Diguillín	Chillán	\N	13948150-K	Turra	Waltemath	CHILENA	Hombre	Pasaje cerro del cobre 687	\N	f	fe761cd0-320f-404a-aa26-2e81093ee12e	36cb4f56-61ad-4d0a-9f27-fcd4643e23bd	CTA	111113948150	contratado
1a4defba-8a81-4c96-b5e9-7015116b5b5f	accebf8a-bacc-41fa-9601-ed39cb320a52	Ivan Andres	ivan.vi.milla@gmail.com	927436104	t	2025-07-28 01:28:07.381	\N	2025-08-02 17:04:27.654927	-33.47185470	-70.67035000	Chacabuco	Colina	\N	16288236-8	Vinet	Millaquipay	CHILENA	Hombre	Rector Eugenio Gonzales	\N	f	e575e81e-f7b0-4891-8853-dfa64af6c963	36cb4f56-61ad-4d0a-9f27-fcd4643e23bd	CTA	111116288236	contratado
932a97ae-b944-4403-8b6f-2e41215cdc38	accebf8a-bacc-41fa-9601-ed39cb320a52	Elvis Andrés	LONCONELVIS@GMAIL.COM	981911912	t	2025-07-28 01:28:05.397	\N	2025-08-02 17:04:39.406971	-33.43227791	-70.66635500	Maipo	San Bernardo	\N	20402204-6	Torrejon	Loncon	CHILENA	Hombre	Baquedano 1401	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	20402204	contratado
7e74fc75-b0ee-4877-b985-1dcb8da9c71c	accebf8a-bacc-41fa-9601-ed39cb320a52	Test	test5@test.com	123456789	t	2025-08-07 21:55:41.298637	\N	2025-08-07 21:55:41.298637	-33.44890000	-70.66930000	Santiago	Providencia	\N	12345678-5	Guardia		\N	\N	Test Address	\N	f	\N	\N	\N	\N	contratado
bb10a442-a049-4611-af1d-54f71c57bf9b	accebf8a-bacc-41fa-9601-ed39cb320a52	Hipolito Enrique	hipolito.owensh@gmail.com	977577140	t	2025-07-28 01:27:57.458	\N	2025-08-02 17:03:53.981694	-33.44641850	-70.65857423	Santiago	Santiago	\N	6529424-9	Owens	Hernandez	CHILENA	Hombre	Dieciocho 25 dpto 55	2026-06-07	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	6529424	contratado
06f94463-00ca-474e-ba06-aa50e17791eb	accebf8a-bacc-41fa-9601-ed39cb320a52	Fabián Alberto	FabiMarin1961@Gmail.com	957093899	t	2025-07-28 01:27:52.761	\N	2025-08-02 17:03:55.477391	-33.57425000	-70.63129000	Diguillín	Yungay	\N	9025970-9	Marin	Castillo	CHILENA	Hombre	Parcela el Rosal S/N	2026-07-31	f	fe761cd0-320f-404a-aa26-2e81093ee12e	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	9025970	contratado
d968fff8-0669-4744-8064-e69096761012	accebf8a-bacc-41fa-9601-ed39cb320a52	ledy yuli	ledyyuli01@gmail.com	991932143	t	2025-07-28 01:28:07.098	\N	2025-08-02 17:04:26.496833	-33.47103880	-70.53340187	Antofagasta	Antofagasta	\N	15769420-0	vicentelo	alfaro	CHILENA	Mujer	flor de la peña 1306	\N	f	f86c238c-145e-48c8-a528-c6897ba8134d	756a508e-948c-40d4-b675-ce4e1a16daf1	CTE	157694200	contratado
48e8781d-b742-45d9-abf1-560624496aa3	accebf8a-bacc-41fa-9601-ed39cb320a52	Fernando Ignacio	fernando.vasquez.abarza@gmail.com	982944408	t	2025-07-28 01:28:09.223	\N	2025-08-02 17:04:32.126903	-33.45819697	-70.59103594	Santiago	Ñuñoa	\N	17603058-5	Vásquez	Abarza	CHILENA	Hombre	Los Talaveras 300 Depto. B304	\N	f	d3715abb-191d-4456-8f36-970fd355c399	d8f390a2-2466-4bc8-9032-903a0e84e85b	CTE	61329321	contratado
701b7646-57b0-4916-92e7-29e827b0e444	accebf8a-bacc-41fa-9601-ed39cb320a52	Norambuena, Troncoso	juanbautista.nt@gmail.com	991645584	t	2025-07-28 01:27:51.06	\N	2025-08-02 17:03:58.700112	-33.52577697	-70.77394530	Diguillín	Chillán Viejo	\N	12184577-6	Norambuena	Troncoso	CHILENA	Hombre	Gratitud 1195	2026-11-20	f	fe761cd0-320f-404a-aa26-2e81093ee12e	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	12184577	contratado
3c30a5ed-d9c2-4684-92ee-f4328288bdc1	accebf8a-bacc-41fa-9601-ed39cb320a52	Lidia Susana	lidiazamorano2009@gmail.com	955151704	t	2025-07-28 01:27:38.966	\N	2025-08-02 17:03:59.253124	-33.45532299	-70.53385898	Chañaral	Chañaral	\N	12405700-0	Zamorano	Cerda	CHILENA	Mujer	Calamar 308	2025-12-30	f	ff6689ad-88f5-4089-b007-f4a88b73549a	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	12405700	contratado
778c756b-313f-4511-bb4d-558cc417575e	accebf8a-bacc-41fa-9601-ed39cb320a52	RUBEN ANTONIO	rubenantonio2088@gmail.com	981704524	t	2025-07-28 01:28:03.561	\N	2025-08-02 17:03:59.734052	-33.47378781	-70.71924831	Santiago	Estación Central	\N	12492369-7	SANHUEZA	CORTES	CHILENA	Hombre	Los Valles 4698	2028-06-03	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	12492369	contratado
4916ddc5-fe5b-4e2c-9b13-a3a1d821c943	accebf8a-bacc-41fa-9601-ed39cb320a52	Jacqueline	jacqueolavep22@gmail.com	932163183	t	2025-07-28 01:27:52.902	\N	2025-08-02 17:03:59.973445	-33.63288865	-70.61647647	Antofagasta	Mejillones	\N	12707849-1	Olave	Peso	CHILENA	Mujer	Calle internacional  número 56	2026-03-20	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	12707849	contratado
f0b0a7c3-bc88-4ab8-b18f-852eceff2570	accebf8a-bacc-41fa-9601-ed39cb320a52	Patricio Andrés	pvillagra10@gmail.com	991281300	t	2025-07-28 01:28:07.241	\N	2025-08-02 17:04:00.190757	-33.49670821	-70.58772812	Santiago	Macul	\N	12870962-2	Villagra	Rojas	CHILENA	Hombre	Pasaje Cuatro 5151	\N	f	7e05a55d-8db6-4c20-b51c-509f09d69f74	9aaa69ff-8981-4534-b8cf-bb3888cfc3f1	CTA	197921190	contratado
09098dbe-2d94-464b-9e89-4f50d57723e4	accebf8a-bacc-41fa-9601-ed39cb320a52	German Alex	germanalexmarquardt3@gmail.com	964649383	t	2025-07-28 01:27:48.656	\N	2025-08-02 17:04:00.796892	-33.38050048	-70.72884432	Diguillín	Chillán	\N	13133181-9	Marquardt	Olivares	CHILENA	Hombre	Av. circunvalacion oriente 471	2028-01-23	f	fe761cd0-320f-404a-aa26-2e81093ee12e	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	13133181	contratado
62169e11-4a5e-4c7f-99ae-216b61b8fcc7	accebf8a-bacc-41fa-9601-ed39cb320a52	Evelyn del Carmen	evelyn_377@hotmail.com	950319920	t	2025-07-28 01:27:42.531	\N	2025-08-02 17:04:01.974786	-33.54429511	-70.65551567	Chañaral	Chañaral	\N	15975987-3	Cayo	Jaña	CHILENA	Mujer	Vicuña mackenna #0918	2028-01-08	f	ff6689ad-88f5-4089-b007-f4a88b73549a	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	15975987	contratado
53b3e217-23d9-46a6-88f5-396656fe3493	accebf8a-bacc-41fa-9601-ed39cb320a52	Renato Alfonso	renatoalfonso.herrerahill@gmail.com	996163376	t	2025-07-28 01:27:49.361	\N	2025-08-02 17:04:02.221481	-33.52749322	-70.57722576	Santiago	La Florida	\N	16358522-7	Herrera	Hill	CHILENA	Hombre	Curimon 8042	2025-12-27	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16358522	contratado
f100ace3-dc5b-4caa-bc8a-58264e4bd5dd	accebf8a-bacc-41fa-9601-ed39cb320a52	César Arnaldo	ce.gutierrezlu@gmail.com	948595721	t	2025-07-28 01:27:48.938	\N	2025-08-02 17:04:03.234209	-33.47251422	-70.56610248	Santiago	Peñalolén	\N	17102666-0	Gutiérrez	Lucero	CHILENA	Hombre	Los cheyenes 1827	2027-08-07	f	254b6b4a-6d74-4f1a-a1ca-d3e23960998c	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	17102666	contratado
2d622684-01e9-4105-82ca-66d75f582293	accebf8a-bacc-41fa-9601-ed39cb320a52	VALENZUELA, PARRA	lvalenzuelaucsc@gmail.com	923607817	t	2025-07-28 01:27:52.62	\N	2025-08-02 17:04:03.56484	-33.61292785	-70.71006810	Concepción	Coronel	\N	17224017-8	VALENZUELA	PARRA	CHILENA	Hombre	francisco coloane 308 villa los jardines	2027-08-30	f	01574763-b65c-4b67-b638-1d19de13f28b	06ec2d0a-7a22-44b7-9131-ae4089a96543	CTA	1031659137	contratado
6c7b8ddc-666f-4d31-b54f-6f0e273530b3	accebf8a-bacc-41fa-9601-ed39cb320a52	Jonathan Fabián	orosteguijonathan@gmail.com	978459065	t	2025-07-28 01:27:57.174	\N	2025-08-02 17:04:05.367117	-33.57662609	-70.67572821	Santiago	El Bosque	\N	18743509-9	Orostegui	Sanhueza	CHILENA	Hombre	Mallorca 961	2024-10-19	f	d17cd2f0-850c-4af2-845e-bce5ce80a269	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	187435099	contratado
f926122b-a986-4346-978a-64256fe59f73	accebf8a-bacc-41fa-9601-ed39cb320a52	MARIBEL SCARLETTE	ROMEROMARIBEL729@GMAIL.COM	958112966	t	2025-07-28 01:27:38.398	\N	2025-08-02 17:04:06.337825	-33.46402180	-70.62908208	Santiago	Santiago	\N	19118087-9	ASKEN	ROMERO	CHILENA	Mujer	PASAJE NICANOR PLAZA 151	2028-03-18	f	e575e81e-f7b0-4891-8853-dfa64af6c963	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	19118087	contratado
9efca631-651d-46f2-a51a-4d78fd24590d	accebf8a-bacc-41fa-9601-ed39cb320a52	Adonnis Alejandro	adonnisalejandrogonzalezvargas@gmail.com	959374489	t	2025-07-28 01:27:48.229	\N	2025-08-02 17:04:07.560953	-33.62745542	-70.61705573	Cordillera	Puente Alto	\N	19562649-9	Gonzalez	Vargas	CHILENA	Hombre	Estacion el melocoton 0885	2026-02-15	f	d17cd2f0-850c-4af2-845e-bce5ce80a269	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	19562649	contratado
b351b44c-46ad-4b41-9a0b-96824c21b46b	accebf8a-bacc-41fa-9601-ed39cb320a52	Valenzuela, Quiroz	sebags.1997@gmail.com	971060577	t	2025-07-28 01:28:04.128	\N	2025-08-02 17:04:08.086967	-33.36756761	-70.63958229	Concepción	Concepción	\N	19812032-4	Valenzuela	Quiroz	CHILENA	Hombre	Lastarria 1188	2028-04-16	f	01574763-b65c-4b67-b638-1d19de13f28b	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	19812032	contratado
0d704355-445c-44f5-b739-7af144151b51	accebf8a-bacc-41fa-9601-ed39cb320a52	Hans eduardo	hans.eduardo.comceballo.sandoval@gmail.com	945932588	t	2025-07-28 01:27:42.813	\N	2025-08-02 17:04:08.349332	-33.54410000	-70.63330000	Santiago	La Granja	\N	20132531-5	Ceballo	Sandoval	CHILENA	Hombre	Rio choapa 9384, la granja santiago de chile	2027-09-04	f	254b6b4a-6d74-4f1a-a1ca-d3e23960998c	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	15602081	contratado
4211f7da-6da4-4935-9fe8-84ed78565fb1	accebf8a-bacc-41fa-9601-ed39cb320a52	Javiera Constanza	jgalindootarola8@gmail.com	973740446	t	2025-07-28 01:27:46.938	\N	2025-08-02 17:04:10.234858	-33.43535582	-70.70401219	Santiago	Quinta Normal	\N	21038131-7	Galindo	Otarola	CHILENA	Mujer	Colo colo 1340	2027-11-25	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	21038131	contratado
a100f552-bf8d-4df4-a8b6-d19a85f39381	accebf8a-bacc-41fa-9601-ed39cb320a52	Matías Alexander	privsouk@gmail.com	945147757	t	2025-07-28 01:28:01.856	\N	2025-08-02 17:04:10.504343	-33.44517761	-70.66112459	Cachapoal	Requínoa	\N	21163589-4	Rojas	GomeZ	CHILENA	Hombre	Avenida Manuel Rodríguez 22	2026-08-22	f	971aff54-cdea-4e7b-b2b7-6e3eb6b4436a	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	21163589	contratado
cdfac93e-4f30-4bab-8158-013bc1c7a5c9	accebf8a-bacc-41fa-9601-ed39cb320a52	Génesis Belen	genesisbmr.18@gmail.com	976912084	t	2025-07-28 01:27:53.329	\N	2025-08-02 17:04:11.215461	-33.40100200	-70.65013131	Santiago	Recoleta	\N	22130772-0	Martínez	Rojas	CHILENA	Mujer	Alfredo Lobos 2766	2027-10-16	f	e575e81e-f7b0-4891-8853-dfa64af6c963	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	22130772	contratado
a3076bf8-a939-43b4-a1be-05e05caecb9d	accebf8a-bacc-41fa-9601-ed39cb320a52	Linda Lizeth	lindamolina158@gmail.com	953546912	t	2025-07-28 01:27:55.041	\N	2025-08-02 17:04:11.718452	-33.43861671	-70.64478994	Santiago	Santiago	\N	23076913-3	Molina	Santana	CHILENA	Mujer	Huérfanos 547	2026-09-04	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19996084125	contratado
1b1be1a0-88ce-4547-8ac3-82b5ac06fd16	accebf8a-bacc-41fa-9601-ed39cb320a52	Danika	danikadelva98@gmail.com	930142272	t	2025-07-28 01:27:39.823	\N	2025-08-02 17:04:13.126957	-33.36127040	-70.73443733	Santiago	Quilicura	\N	25816112-2	Delva	Delva	HAITIANA	Mujer	Psj liszt 158	2028-05-27	f	e575e81e-f7b0-4891-8853-dfa64af6c963	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	25816112	contratado
003bfefb-e8b3-440c-9949-79ac9c2e6041	accebf8a-bacc-41fa-9601-ed39cb320a52	Josue Guillermo	josuepress@gmail.com	985845733	t	2025-07-28 01:27:50.638	\N	2025-08-02 17:04:13.582812	-33.43791490	-70.67882189	Santiago	Quinta Normal	\N	26069170-8	Jiménez	Herrera	VENEZOLANA	Hombre	Santo Domingo 3251	2028-06-02	f	fbe9a174-aa3d-490c-8522-a42b8fe296e2	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	15870128979	contratado
30942e55-905a-45be-b5f9-e7f4ee68b0bf	accebf8a-bacc-41fa-9601-ed39cb320a52	Liz Cristina	Lizloayza3@gmail.com		t	2025-07-28 01:27:52.194	\N	2025-08-02 17:04:14.724879	-33.43052253	-70.66669296	Antofagasta	Mejillones	\N	27633568-5	Loayza	Loayza	BOLIVIANA	Mujer	Almirante castillo 725	2027-08-12	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	27633568	contratado
f6617581-9400-4792-a69a-ea3b7b5581fa	accebf8a-bacc-41fa-9601-ed39cb320a52	Nelson Esteban	nm498037@gmail.com	982581493	t	2025-07-28 01:27:53.188	\N	2025-08-02 17:04:19.092561	-33.55639641	-70.57482913	Santiago	La Florida	\N	11240042-7	Martinez	Ramírez	CHILENA	Hombre	San Pedro 941	\N	f	d3715abb-191d-4456-8f36-970fd355c399	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	11240042	contratado
e6c1668a-7934-49e3-8f91-13a39f829928	accebf8a-bacc-41fa-9601-ed39cb320a52	Claudia Lorena	fangoriasol@gmail.com	932966158	t	2025-07-28 01:27:58.871	\N	2025-08-02 17:04:19.646655	-33.39722671	-70.68093799	Santiago	Conchalí	\N	11860886-0	Pavez	Barra	CHILENA	Mujer	Mar de behring 2470	\N	f	e575e81e-f7b0-4891-8853-dfa64af6c963	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	11860886	contratado
61b590f3-890e-48e9-94f6-e43b4d6db536	accebf8a-bacc-41fa-9601-ed39cb320a52	Test	test2@test.com	123456789	t	2025-08-07 21:58:50.830273	\N	2025-08-07 21:58:50.830273	\N	\N	Santiago	Santiago	\N	11111111-1	Usuario	Prueba	\N	\N	Test 123	\N	f	\N	\N	\N	\N	contratado
0c7ec175-9700-4f2d-b9a3-94e209f418b0	accebf8a-bacc-41fa-9601-ed39cb320a52	Eduardo Enrique	eduardoenrique47@hotmail.com	930767930	t	2025-07-28 01:27:56.319	\N	2025-08-02 17:03:58.454647	-33.35350031	-70.71982223	Chañaral	Chañaral	\N	11933208-7	Olave	Aranda	CHILENA	Hombre	Julio montt 537	2028-06-25	f	ff6689ad-88f5-4089-b007-f4a88b73549a	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	11933208	contratado
29564603-0a56-45f6-9e53-132713212d32	accebf8a-bacc-41fa-9601-ed39cb320a52	Reinaldo Germán	gajardoreinaldo01@gmail.com	982483776	t	2025-07-28 01:27:46.795	\N	2025-08-02 17:04:04.893361	-33.50309488	-70.77548493	Santiago	Maipú	\N	18082508-8	Gajardo	Fuentes	CHILENA	Hombre	El olimpo 2731	2026-08-31	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	18082508	contratado
b604ed84-4ddc-487f-9bf9-8ee5e4e19ded	accebf8a-bacc-41fa-9601-ed39cb320a52	Marcelo Rodrigo	mjorquera1967@gmail.com	928951037	t	2025-07-28 01:27:50.918	\N	2025-08-02 17:03:57.766543	-33.43984232	-70.64059237	Talagante	Talagante	\N	11169675-6	Jorquera	Gutierrez	CHILENA	Hombre	Bernardo OHiggins 315	2025-11-29	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	11169675	contratado
6ed65c59-e727-4136-93ee-adfd606ca9e0	accebf8a-bacc-41fa-9601-ed39cb320a52	ROBERTO UPDATED	roberto.updated@test.com	978003854	t	2025-07-28 01:28:02.71	\N	2025-08-02 17:04:26.104115	\N	\N			\N	15437985-1	TEST	LEAL	CHILENA	Hombre		\N	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	15437985	contratado
7490d538-8549-45b2-a67b-a8cdd694c810	accebf8a-bacc-41fa-9601-ed39cb320a52	Carlos Cristobal	carlos.irigoyen@gard.cl	982307771	t	2025-07-28 01:27:50.214	\N	2025-08-02 17:04:01.108808	-33.35230260	-70.47864766	Santiago	Lo Barnechea	\N	13255838-8	Irigoyen	Garces	CHILENA	Hombre	Camino Refugios del Arrayan 16982	\N	f	7e05a55d-8db6-4c20-b51c-509f09d69f74	d8f390a2-2466-4bc8-9032-903a0e84e85b	CTE	777913255838	contratado
fbb34d17-4860-410d-88ba-2137525c1a66	accebf8a-bacc-41fa-9601-ed39cb320a52	Luis Antonio	luisuribemarin69@gmail.com	950115568	t	2025-07-28 01:28:07.947	\N	2025-08-02 17:04:20.924968	-33.58400409	-70.66132718	Santiago	La Pintana	\N	12490696-2	Uribe	Marin	CHILENA	Hombre	Domingo Santa Cruz NO 0634	\N	f	e575e81e-f7b0-4891-8853-dfa64af6c963	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	12490696	contratado
2e2f1f6c-193d-4bb5-ba46-0d1d8a71d76c	accebf8a-bacc-41fa-9601-ed39cb320a52	Héctor Daniel	hector.parada.2004@gmail.com	935384240	t	2025-07-28 01:27:58.167	\N	2025-08-02 17:04:20.166579	-33.62163871	-70.60734697	Cordillera	Puente Alto	\N	11885938-3	Parada	González	CHILENA	Hombre	Estrella polar 0361 depto 106	\N	f	d19cf3cc-ca4c-458f-b6cb-30b81f9810ea	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	11885938	contratado
bcc9ef7c-8eea-4be7-b961-440c2d8d87b0	accebf8a-bacc-41fa-9601-ed39cb320a52	Guillermo	GUILLEIRON_1976@HOTMAIL.COM	986421192	t	2025-07-28 01:27:56.745	\N	2025-08-02 17:04:21.484917	-33.49441420	-70.64796458	Santiago	San Miguel	\N	13045560-3	Olguin	Rojas	CHILENA	Hombre	Berlín 843	\N	f	88b0407a-01bb-43b9-87cd-d06da531aa08	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	13045560	contratado
2ea2dd46-10a8-4cd6-9d13-ce1c8dc27a5e	accebf8a-bacc-41fa-9601-ed39cb320a52	Susana del Carmen	escaratesusana72@gmail.com	973733167	t	2025-07-28 01:27:44.954	\N	2025-08-02 17:04:24.734703	-33.51140788	-70.72990041	Talagante	Peñaflor	\N	14301937-3	Escarate	Fabio	CHILENA	Mujer	calle ulkantun block 411 dtpo 21 alto los rosales	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	14301937	contratado
75c71a4b-858e-4bb7-9570-afa196eb0728	accebf8a-bacc-41fa-9601-ed39cb320a52	Jocelyne soledad	jocelynsoledad613@gmail.com	945426263	t	2025-07-28 01:27:47.078	\N	2025-08-02 17:04:25.67235	-33.68333000	-70.95000000	Talagante	Talagante	\N	15402261-9	Gatica	González	CHILENA	Mujer	Trebulco 2800	\N	f	387f0af5-751d-465e-aff3-0768c3fb55c1	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	15402261	contratado
7759e7d5-3ff9-46f5-92c3-bd592b35ddb5	accebf8a-bacc-41fa-9601-ed39cb320a52	Angelo Rodeigo	Angelovaldes318@gmail.com	935900259	t	2025-07-28 01:28:08.23	\N	2025-08-02 17:04:27.275475	-33.56841649	-70.79138929	Antofagasta	Antofagasta	\N	16135621-2	Valdes	Rojas	CHILENA	Hombre	Rapel 531	\N	f	f86c238c-145e-48c8-a528-c6897ba8134d	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	161356212	contratado
1a9e94a5-8cb3-4048-b741-eab618aa90fb	accebf8a-bacc-41fa-9601-ed39cb320a52	Miguel Angel	miguelangeldelgadocaa@gmail.com	964047392	t	2025-07-28 01:27:39.683	\N	2025-08-02 17:04:29.168932	-33.36326739	-70.74357201	Santiago	Quilicura	\N	16782117-0	Delgado	Caamaño	CHILENA	Hombre	San enrique block 115 dpto 11	\N	f	fbe9a174-aa3d-490c-8522-a42b8fe296e2	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16782117	contratado
d6dd20d2-9f9c-4b50-b01a-d85c75daf490	accebf8a-bacc-41fa-9601-ed39cb320a52	Max Ariel	maxvalencia77@gmail.com	935958046	t	2025-07-28 01:28:08.371	\N	2025-08-02 17:04:29.36926	-33.55276880	-70.79641337	Santiago	Maipú	\N	16789594-8	Valencia	Guzman	CHILENA	Hombre	Pasaje filipo 4338	\N	f	387f0af5-751d-465e-aff3-0768c3fb55c1	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16789594	contratado
9e21c090-b28e-4fc9-b362-9b9c546b92d2	accebf8a-bacc-41fa-9601-ed39cb320a52	Paul whilliam	gladiadoruczeus@gmail.com	944901771	t	2025-07-28 01:28:04.412	\N	2025-08-02 17:04:29.934094	-33.45858060	-70.53796024	Santiago	La Reina	\N	16922149-9	Serey	Parra	CHILENA	Hombre	Talinay 9074	\N	f	d19cf3cc-ca4c-458f-b6cb-30b81f9810ea	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16922149	contratado
35d5b742-44dc-4b94-a879-31ee21cc30b0	accebf8a-bacc-41fa-9601-ed39cb320a52	Ignacio Felipe	ifesanrod2023@gmail.com	982577042	t	2025-07-28 01:28:03.706	\N	2025-08-02 17:04:32.893364	-33.45765600	-70.66919326	Santiago	Santiago	\N	17700245-3	Sanhueza	Rodriguez	CHILENA	Hombre	Blanco encalada 2467	\N	f	d3715abb-191d-4456-8f36-970fd355c399	dfc676af-0c8d-4475-a831-b313e513c21b	CTA	7015568440	contratado
8a0e6053-ae00-4b52-a173-9a143a75befd	accebf8a-bacc-41fa-9601-ed39cb320a52	Ricardo Andres	inostrozalopezricardo.a@gmail.com	958141429	t	2025-07-28 01:27:49.928	\N	2025-08-02 17:04:33.648603	-33.45468981	-70.63344260	Santiago	Santiago	\N	18065361-9	Inostroza	López	CHILENA	Hombre	Portugal 990 Dpto 1810	\N	f	7e05a55d-8db6-4c20-b51c-509f09d69f74	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	18065361	contratado
f4d01d2d-d738-4ed8-ac64-28031f7b4350	accebf8a-bacc-41fa-9601-ed39cb320a52	Miguel Angel Segundo	torresmaxi345@gmail.com	930647090	t	2025-07-28 01:28:05.68	\N	2025-08-02 17:04:34.765572	-33.44172386	-70.75742029	Talagante	Peñaflor	\N	18675698-3	Torres	Mora	CHILENA	Hombre	San Javier 857 Malloco	\N	f	387f0af5-751d-465e-aff3-0768c3fb55c1	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	18675698	contratado
d927ea60-c4f0-4cb3-9570-9f116b14b742	accebf8a-bacc-41fa-9601-ed39cb320a52	Erick Christopher harol	cosmofunk1404@gmail.com	926338167	t	2025-07-28 01:27:40.535	\N	2025-08-02 17:04:33.452347	-33.53981478	-70.61690419	Santiago	La Granja	\N	17925440-9	Arteaga	Gonzalez	CHILENA	Hombre	4 oriente 8420	\N	f	254b6b4a-6d74-4f1a-a1ca-d3e23960998c	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	17925440	contratado
f2261adc-771f-4c0c-a34e-d19525dd87e0	accebf8a-bacc-41fa-9601-ed39cb320a52	Nahomy Mellisa	nahomyesquivelhuilcaleo@gmail.com	951871496	t	2025-07-28 01:27:45.238	\N	2025-08-02 17:04:36.653044	-33.58010190	-70.82913288	Talagante	Padre Hurtado	\N	19505954-3	Esquivel	Huilcaleo	CHILENA	Mujer	Villa las hortensias pasaje huepil 84	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	19505954	contratado
ac742736-4586-44f5-9eaf-89df12c0df7c	accebf8a-bacc-41fa-9601-ed39cb320a52	Sebastián Enrique	spoblete702@gmail.com	979643873	t	2025-07-28 01:27:59.867	\N	2025-08-02 17:04:36.85736	-33.59335127	-70.54210468	Talagante	Peñaflor	\N	19561645-0	Poblete	Mendez	CHILENA	Hombre	cordillera de la costa #2909	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	19561645	contratado
e2f52da9-fee0-4da7-8ba6-052abea3aa84	accebf8a-bacc-41fa-9601-ed39cb320a52	Cristopher Alejandro	figueroacristopher154@gmail.com	997575999	t	2025-07-28 01:27:45.802	\N	2025-08-02 17:46:30.529206	-33.40656641	-70.72847920	Talagante	Peñaflor	\N	19847554-8	Figueroa	Vera	CHILENA	Hombre	Calbuco 1297	\N	f	c6ded533-6227-45ad-bb64-e1f029a6f0b2	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	19847554	contratado
f6632ca5-4c9f-4350-927d-33dc7f02932b	accebf8a-bacc-41fa-9601-ed39cb320a52	Diego Alexander	diegollzzmm@gmail.com	946490930	t	2025-07-28 01:27:52.054	\N	2025-08-02 17:04:38.094568	-33.40701652	-70.74052158	Talagante	Peñaflor	\N	19848284-6	Lizama	Acevedo	CHILENA	Mujer	Zeus 1177	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	19848284	contratado
917a74e6-9551-4525-a775-1aff4b5f82bb	accebf8a-bacc-41fa-9601-ed39cb320a52	Anahí Alejandra	Anahi.troncoso21@gmail.com	986936462	t	2025-07-28 01:28:06.108	\N	2025-08-02 17:46:30.191667	-33.58401694	-70.80901702	Talagante	Padre Hurtado	\N	20503254-1	Troncoso	Palma	CHILENA	Mujer	Av san Ignacio 1589	\N	f	20c20c3f-1225-4abf-857d-e63cc89434fd	9aaa69ff-8981-4534-b8cf-bb3888cfc3f1	CTA	00-026-96213-43	contratado
1e467e2b-672f-46cb-91d0-fa2440e67e22	accebf8a-bacc-41fa-9601-ed39cb320a52	Johan Marcelo	johanormazabal9@gmail.com	948590525	t	2025-07-28 01:27:57.03	\N	2025-08-02 17:04:41.175156	-33.45297448	-70.70037666	Santiago	Estación Central	\N	21138510-3	Ormazabal	Larre	CHILENA	Hombre	Abtao 24	\N	f	b28aecde-b43d-4d98-9cff-93640ca14aed	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	10013866077	contratado
9bd8eafc-5ed7-491b-834e-71d9a63df713	accebf8a-bacc-41fa-9601-ed39cb320a52	Shirley alejandra	sherlyn-66@hotmail.com	926206799	t	2025-07-28 01:27:59.581	\N	2025-08-02 17:04:41.975595	-33.43052253	-70.66669296	Antofagasta	Mejillones	\N	24496776-0	Perez	Mamani	BOLIVIANA	Mujer	Almirante castillo 725	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	24496776	contratado
ae94061d-60f3-419f-a803-c73746590ea0	accebf8a-bacc-41fa-9601-ed39cb320a52	Eugenia Maria	davidcollado1512@gmail.com	946338147	t	2025-07-28 01:28:02.284	\N	2025-08-02 17:04:42.933467	-33.43180000	-70.64670000	Santiago	Santiago	\N	26872596-2	Rosario	Duarte	DOMINICANA	Mujer	Santa Elena 1486	\N	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	26872596	contratado
c8ce985c-b682-4913-814c-3aa9dca3d73c	accebf8a-bacc-41fa-9601-ed39cb320a52	Miguel Mauricio	mig.molano.cl@gmail.com	949520437	t	2025-07-28 01:27:54.472	\N	2025-08-02 17:04:43.38305	-33.52841762	-70.77093498	Santiago	Maipú	\N	27960378-8	Molano	Marcano	VENEZOLANA	Hombre	Enzo castro 1041	\N	f	fa95f165-9796-4823-9eca-5acf3a1e92c1	06ec2d0a-7a22-44b7-9131-ae4089a96543	CTA	1046271092	contratado
91e32b34-7cd0-452f-941c-872a4e20eb07	accebf8a-bacc-41fa-9601-ed39cb320a52	Julio Alberto	JMILLALLANCAAVILEZ@GMAIL.COM	922088090	t	2025-07-28 01:27:54.188	\N	2025-08-02 17:03:56.589365	-33.43063770	-70.72747880	Valparaíso	Quilpué	\N	10086729-K	Millallanca	Avilez	CHILENA	Hombre	LAGO LANALHUE 2316 DEPTO. 54 VILLA PORVENIR	2028-03-18	f	fa5cd831-eac9-419b-b0fa-6fb2c86e4e26	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	10086729	contratado
34df05fb-d5a9-4fc8-99ab-d55472189561	accebf8a-bacc-41fa-9601-ed39cb320a52	Prueba	a3@a.com	912345678	t	2025-08-07 22:08:57.045933	\N	2025-08-07 22:08:57.045933	-33.41000000	-70.61000000	Santiago	Santiago	\N	33333333-3	Apellido		\N	\N	Av Test 123	\N	f	\N	343c27ef-2988-4a86-919e-cf306e5c123d	CTE	123	contratado
e10bdac4-feed-48b8-a672-5ff975b1917e	accebf8a-bacc-41fa-9601-ed39cb320a52	Alberto	betostein89@gmail.com	975279788	t	2025-08-07 22:13:35.619986	\N	2025-08-07 22:13:35.619986	-33.42000000	-70.61000000	RM	Santiago	\N	17596441-k	Stein		\N	\N	dir	\N	f	\N	9aaa69ff-8981-4534-b8cf-bb3888cfc3f1	CTE	177120269	contratado
1d3bf5be-12d2-4b73-af78-b70071d50b50	accebf8a-bacc-41fa-9601-ed39cb320a52	Biviana Paola	quinonesbiviana1978@gmail.com	929549516	t	2025-07-28 01:28:00.431	\N	2025-08-02 17:04:12.205875	-33.43343577	-70.65754793	Santiago	Santiago	\N	24565284-4	Quiñones	Valencia	COLOMBIANA	Mujer	Hermanos amunategui 890	2026-12-06	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19996188160	contratado
1b024f63-c615-4db2-ba7b-00471f0ce570	accebf8a-bacc-41fa-9601-ed39cb320a52	Roberto Manuel	rborrero265@gmail.com	973170892	t	2025-07-30 19:19:32.550897	\N	2025-08-02 17:04:12.664147	-36.82690000	-73.04980000	Concepción	Coronel	\N	25629118-5	Borrero	Barrera	VENEZOLANA	Hombre	Villa quiñenco Melin 4820	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTE	53900166873	contratado
80e4a617-ac3e-4b62-9699-5655012d2dd7	accebf8a-bacc-41fa-9601-ed39cb320a52	Mitzi Angélica	99912723@gardops.cl	930649364	f	2025-07-30 19:19:34.086602	\N	2025-08-02 17:04:16.886717	-33.44890000	-70.66930000	Santiago	Quilicura	\N	9991272-3	Márquez	Pizarro	CHILENA	Hombre	Ayacucho 461	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	9991272	contratado
0246955d-b0f5-4148-9ff8-700451cac5f7	accebf8a-bacc-41fa-9601-ed39cb320a52	NELSON	nelsonvenegascruz@gmail.com	973434280	t	2025-07-28 01:28:06.816	\N	2025-08-02 17:04:19.812898	-33.51274199	-70.56756973	Santiago	La Florida	\N	11874567-1	VENEGAS	CRUZ	CHILENA	Hombre	Volcan Calbuco 5831	\N	f	254b6b4a-6d74-4f1a-a1ca-d3e23960998c	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	11874567	contratado
05ecf7e2-26d6-4e80-b052-931d6b39633a	accebf8a-bacc-41fa-9601-ed39cb320a52	MARTA ANA	SANTAMARIAREYESANA@GMAIL.COM	957255328	t	2025-07-28 01:28:01.147	\N	2025-08-02 17:04:20.737537	-33.39407140	-70.65820938	Santiago	Conchalí	\N	12253506-1	REYES	SANTAMARIA	CHILENA	Mujer	FUERTE BULNES 3455	\N	f	d8d5d60b-f2da-4e65-b934-0b267d33dcfb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	12253506	contratado
6d168090-cd06-406b-962e-c1dc30ec2502	accebf8a-bacc-41fa-9601-ed39cb320a52	Alamiro frenando	135969117@gardops.cl	941357872	f	2025-07-30 19:19:37.75674	\N	2025-08-02 17:04:23.40733	-33.44890000	-70.66930000	Chañaral	Chañaral	\N	13596911-7	Muñoz	Cabello	CHILENA	Hombre	Atacama alto # 235	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	13596911	contratado
f3b21597-d76c-4207-a8e1-7be41354623d	accebf8a-bacc-41fa-9601-ed39cb320a52	Jorge Andrés	13980816@gardops.cl	946904587	f	2025-07-30 19:19:38.134958	\N	2025-08-02 17:04:24.345101	-32.75070000	-70.72560000	San Felipe de Aconcagua	San Felipe	\N	13980816	Ahumada	Herrera	CHILENA	Hombre	Villa el Carmen 1641	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	22363045328	contratado
fa178c27-180a-4c81-83cc-8e6e09baedda	accebf8a-bacc-41fa-9601-ed39cb320a52	Juan Alberto	150716217@gardops.cl	928763693	f	2025-07-30 19:19:38.316479	\N	2025-08-02 17:04:24.959092	-33.44890000	-70.66930000	Santiago	La Florida	\N	15071621-7	Toledo	Gonzalez	CHILENA	Hombre	Paulina 2148	\N	f	\N	d8f390a2-2466-4bc8-9032-903a0e84e85b	CTE	96802812	contratado
0b7a881a-acd7-438d-b6a1-b67a6f909fa2	accebf8a-bacc-41fa-9601-ed39cb320a52	Cristian rodrigo	151840558@gardops.cl	991069348	f	2025-07-30 19:19:38.499336	\N	2025-08-02 17:04:25.126633	-33.44890000	-70.66930000	Santiago	Santiago	\N	15184055-8	Vergara	Acevedo	CHILENA	Hombre	San ignacio 824	\N	f	\N	d8f390a2-2466-4bc8-9032-903a0e84e85b	CTE	777915184055	contratado
27eadeb7-8d4c-43c5-9275-e3d1fad5bc46	accebf8a-bacc-41fa-9601-ed39cb320a52	Francisco andres	159760545@gardops.cl	979633151	f	2025-07-30 19:19:38.793184	\N	2025-08-02 17:04:26.657129	-23.65090000	-70.39550000	Antofagasta	Antofagasta	\N	15976054-5	Lemus	Contreras	CHILENA	Hombre	Alfonso Meléndez 3850	\N	f	\N	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTA	19800827282	contratado
f54e29f6-7471-416e-a644-dada71e23168	accebf8a-bacc-41fa-9601-ed39cb320a52	Rodolfo antonio	16032595K@gardops.cl	948555115	f	2025-07-30 19:19:38.999636	\N	2025-08-02 17:04:26.848429	-33.44890000	-70.66930000	Santiago	La Pintana	\N	16032595-K	Ulloa	Munoz	CHILENA	Hombre	Pasaje el olivo 13955	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	16032595	contratado
01dae523-1b62-4c4c-b93b-0718bb815f95	accebf8a-bacc-41fa-9601-ed39cb320a52	Jorge Wonllovani	16147407k@gardops.cl	933478249	f	2025-07-30 19:19:39.28615	\N	2025-08-02 17:04:27.460544	-33.44890000	-70.66930000	Santiago	La Pintana	\N	16147407-k	Rojas	Labrin	CHILENA	Hombre	Pasaje Gala 10859	\N	f	\N	bda92040-ac11-4e2c-b8c9-dd017f48be09	CTE	777916147407	contratado
cd0946db-ef69-49d8-a257-dd6d53547842	accebf8a-bacc-41fa-9601-ed39cb320a52	Javier Ignacio	164121038@gardops.cl	940395168	f	2025-07-30 19:19:39.682865	\N	2025-08-02 17:04:28.054629	-33.44890000	-70.66930000	Santiago	Pudahuel	\N	16412103-8	Calfucura	Garces	CHILENA	Hombre	Trovador 9041f	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16412103	contratado
f913f819-673d-4ac8-89f0-37048948b963	accebf8a-bacc-41fa-9601-ed39cb320a52	Manuel Andrés	164414612@gardops.cl	966868271	f	2025-07-30 19:19:39.869666	\N	2025-08-02 17:04:28.248354	-33.44890000	-70.66930000	Santiago	Lo Espejo	\N	16441461-2	Parra	Guevara	CHILENA	Hombre	Maria Luisa bombal	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16441461	contratado
7edd2d59-33b7-49ac-9b4b-cda844681607	accebf8a-bacc-41fa-9601-ed39cb320a52	José gonzalo	165197291@gardops.cl	957015263	f	2025-07-30 19:19:40.053384	\N	2025-08-02 17:04:28.407232	-33.44890000	-70.66930000	Santiago	Renca	\N	16519729-1	Orellana	López	CHILENA	Hombre	Los guindos 1971	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16519729	contratado
0f8b9b19-a0a8-484e-aac5-a7823ca500c9	accebf8a-bacc-41fa-9601-ed39cb320a52	José Francisco	166964121@gardops.cl	997977706	f	2025-07-30 19:19:40.247454	\N	2025-08-02 17:04:28.574618	-33.61670000	-70.58330000	Cordillera	Puente Alto	\N	16696412-1	Alarcón	Manque	CHILENA	Hombre	Luis matte Larraín 871	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	16696412	contratado
ea072216-01ce-44b9-9d9a-ce26569af27a	accebf8a-bacc-41fa-9601-ed39cb320a52	Walter	167440673@gardops.cl	962772874	f	2025-07-30 19:19:40.432045	\N	2025-08-02 17:04:28.766959	-33.44890000	-70.66930000	Santiago	El Bosque	\N	16744067-3	Mendoza	Duran	CHILENA	Hombre	Lo Martinez 44	\N	f	\N	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	15680131930	contratado
04a1e2d3-7f11-433f-855b-8209d8fef9d9	accebf8a-bacc-41fa-9601-ed39cb320a52	Yerko Adolfo	167550150@gardops.cl	998798647	f	2025-07-30 19:19:40.618798	\N	2025-08-02 17:04:28.965276	-33.04720000	-71.61270000	Valparaíso	Valparaíso	\N	16755015-0	Varas	Andrade	CHILENA	Hombre	Zenteno 257	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16755015	contratado
4ba506ed-93c8-4a04-8802-becef8cd35cc	accebf8a-bacc-41fa-9601-ed39cb320a52	Antonio David	168663463@gardops.cl		f	2025-07-30 19:19:40.902076	\N	2025-08-02 17:04:29.530331	-33.44890000	-70.66930000	Chañaral	Chañaral	\N	16866346-3	Vargas	Plaza	CHILENA	Hombre	Osorno 367	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	16866346	contratado
cb82c6a4-0ac9-4d66-b47b-963c2d91cd46	accebf8a-bacc-41fa-9601-ed39cb320a52	Vicente Javier	169242186@gardops.cl	920926709	f	2025-07-30 19:19:41.090062	\N	2025-08-02 17:04:30.137351	-33.44890000	-70.66930000	Santiago	Lo Barnechea	\N	16924218-6	Acuña	Fuentes	CHILENA	Hombre	Monseñor escriba de balaguer 12840	\N	f	\N	9aaa69ff-8981-4534-b8cf-bb3888cfc3f1	CTA	138022138	contratado
51a9b9fd-705b-47cd-8e56-7c20b6b8c4ba	accebf8a-bacc-41fa-9601-ed39cb320a52	Yerco Orlando	169533598@gardops.cl	987153065	f	2025-07-30 19:19:41.277789	\N	2025-08-02 17:04:30.375075	-32.75070000	-70.72560000	San Felipe de Aconcagua	San Felipe	\N	16953359-8	Olavarría	Muñoz	CHILENA	Hombre	Manuel caballero 2205 villa el señorial	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	16953359	contratado
ab5e13a7-461e-4e75-9f04-8a12fb737718	accebf8a-bacc-41fa-9601-ed39cb320a52	Oscar	171222478@gardops.cl	971289830	f	2025-07-30 19:19:41.46156	\N	2025-08-02 17:04:30.61319	-33.44890000	-70.66930000	Santiago	Santiago	\N	17122247-8	López	Pardo	CHILENA	Hombre	Chacabuco 1120 dpto 2002	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTE	32200019465	contratado
b051480f-3ebe-44e5-8299-63a4d1ecc42d	accebf8a-bacc-41fa-9601-ed39cb320a52	Cesar Felipe	174148007@gardops.cl	926088119	f	2025-07-30 19:19:41.643331	\N	2025-08-02 17:04:31.250314	-33.44890000	-70.66930000	Santiago	Recoleta	\N	17414800-7	Astorga	Barraza	CHILENA	Hombre	Erasmo carrasco  3505	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	174148007	contratado
b00b7abc-b248-4124-8073-ae5d53b4d367	accebf8a-bacc-41fa-9601-ed39cb320a52	Sebastián	138717542@gardops.cl	983045110	f	2025-07-30 19:19:37.950677	\N	2025-07-30 19:19:37.950677	-23.65090000	-70.39550000	Antofagasta	Antofagasta	\N	13871754-2	Celis	Iriarte	CHILENA	Hombre	Chao 5972	\N	f	\N	\N	\N	\N	contratado
20fa97e5-3c8d-4673-9984-1e3efb56cfd0	accebf8a-bacc-41fa-9601-ed39cb320a52	Darwin Esteban	darwin.esteban.dela@gmail.com	956807055	t	2025-07-28 01:27:51.626	\N	2025-08-02 17:04:34.373891	-33.35826650	-70.73183532	Itata	Portezuelo	\N	18499974-9	Leal	Andana	CHILENA	Hombre	Sector la cancha s/n	\N	f	fe761cd0-320f-404a-aa26-2e81093ee12e	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19811322994	contratado
4f1aca0f-a793-4889-b48a-0e1ee4612868	accebf8a-bacc-41fa-9601-ed39cb320a52	Aaron Fernando	aaron.f.aguilera.toro@gmail.com	935243947	t	2025-07-28 01:28:02.851	\N	2025-08-02 17:04:03.778208	-33.54825000	-70.61598477	Santiago	Santiago	\N	17385726-8	Aguilera	Toro	CHILENA	Hombre	Calle socos 9224	2026-10-23	f	254b6b4a-6d74-4f1a-a1ca-d3e23960998c	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	17385726	contratado
04602f4e-6f1e-4f30-8b4c-120215c16125	accebf8a-bacc-41fa-9601-ed39cb320a52	Alejandro Osvaldo	janitomolina2083@gmail.com	966836854	t	2025-07-28 01:27:54.616	\N	2025-08-02 17:04:26.297491	-33.42731489	-70.76165370	Santiago	Cerro Navia	\N	15635276-4	Molina	Camaño	CHILENA	Hombre	Pasaje las quilas 9059	\N	f	e92fbd13-f7b7-47ba-8f0f-a14808bfe1eb	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	15635276	contratado
54509d60-4943-4ad5-97f4-bac2d7395c44	accebf8a-bacc-41fa-9601-ed39cb320a52	Carlos Patricio	163047187@gardops.cl	942662778	f	2025-07-30 19:19:39.501187	\N	2025-08-02 17:04:27.847269	-36.82690000	-73.04980000	Concepción	Concepción	\N	16304718-7	Parada	Cid	CHILENA	Hombre	Buena Vista 2270	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16304718	contratado
03f90158-7edd-420a-97a8-a99909ab2383	accebf8a-bacc-41fa-9601-ed39cb320a52	Víctor Hugo Cortés Farías	13173493k@gardops.cl	975686552	f	2025-07-30 19:19:36.36895	\N	2025-08-02 17:04:21.654125	-33.44890000	-70.66930000	Chañaral	Chañaral	\N	13173493-k	Cortés	Farías	CHILENA	Hombre	Calle Camilo Henríquez 0510	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	13173493	contratado
5b95b296-4c87-45ef-83a1-5dfbb58037ba	accebf8a-bacc-41fa-9601-ed39cb320a52	ANDRÉS ALEJANDRO	132814783@gardops.cl	936242940	f	2025-07-30 19:19:36.552748	\N	2025-08-02 17:04:22.215206	-33.44890000	-70.66930000	Santiago	Independencia	\N	13281478-3	HUELQUEDIL	OPORTO	CHILENA	Hombre	INGLATERRA 1140	\N	f	\N	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	15410236062	contratado
55fc532c-b608-46cb-84be-e97627a2b52d	accebf8a-bacc-41fa-9601-ed39cb320a52	Daniel alexis	17462903K@gardops.cl	940571627	f	2025-07-30 19:19:41.947791	\N	2025-08-02 17:04:31.506826	-33.61670000	-70.58330000	Cordillera	Puente Alto	\N	17462903-K	Parra	Garcia	CHILENA	Hombre	Estacion malalcahuello	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	17462903	contratado
86c31d50-e4fb-4fdb-a2cd-a9b010bdac74	accebf8a-bacc-41fa-9601-ed39cb320a52	Cristian	175485783@gardops.cl	933823311	f	2025-07-30 19:19:42.137183	\N	2025-08-02 17:04:31.70417	-33.59270000	-70.69950000	Maipo	San Bernardo	\N	17548578-3	Paz	Amestica	CHILENA	Hombre	Lenka franulic	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	17548578	contratado
961c22d6-f661-41c5-a1ee-240f8e0a40f2	accebf8a-bacc-41fa-9601-ed39cb320a52	David Antonio	17564802K@gardops.cl	988219301	f	2025-07-30 19:19:42.324747	\N	2025-08-02 17:04:31.94068	-33.44890000	-70.66930000	Santiago	Peñalolén	\N	17564802-K	Varas	Sandoval	CHILENA	Hombre	Pasaje el trauco 2116	\N	f	\N	dfc676af-0c8d-4475-a831-b313e513c21b	CTE	81498784	contratado
665d7c01-9e30-42c7-901d-73ccb5f22134	accebf8a-bacc-41fa-9601-ed39cb320a52	Daniel Antonio	17614310K@gardops.cl	999368633	f	2025-07-30 19:19:42.507002	\N	2025-08-02 17:04:32.301333	-36.82690000	-73.04980000	Concepción	Chiguayante	\N	17614310-K	Valdebenito	Montoya	CHILENA	Hombre	22-02-1991	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	17614310	contratado
247269dd-e656-478b-a80f-c3fbafb40987	accebf8a-bacc-41fa-9601-ed39cb320a52	Marcelo ernesto	176899646@gardops.cl	976505470	f	2025-07-30 19:19:42.992999	\N	2025-08-02 17:04:32.686927	-33.44890000	-70.66930000	Santiago	San Miguel	\N	17689964-6	Abarzua	Elgueta	CHILENA	Hombre	Cuarta transaversal 6295	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	17689964	contratado
97e52e5d-adf7-4f09-8fcf-6c1f124792c6	accebf8a-bacc-41fa-9601-ed39cb320a52	Karla andrea	179024012@gardops.cl	944075571	f	2025-07-30 19:19:43.187266	\N	2025-08-02 17:04:33.086673	-23.65090000	-70.39550000	Antofagasta	Mejillones	\N	17902401-2	Guevara	Flores	CHILENA	Hombre	Florentino novoa 1100 departamento h_31	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	17902401	contratado
86c97da0-dc36-4978-8b04-abee1f49e4d8	accebf8a-bacc-41fa-9601-ed39cb320a52	Diego Alejandro	185636127@gardops.cl	996313201	f	2025-07-30 19:12:34.629107	\N	2025-08-02 17:04:34.56725	-33.47247327	-70.65821487	San Felipe de Aconcagua	Putaendo	\N	18563612-7	Cáceres	Aravena	CHILENA	Hombre	Calle los álamos sin número	\N	t	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	18563612	contratado
ded55c0f-1b05-4c48-a3d3-083808e9f8c3	accebf8a-bacc-41fa-9601-ed39cb320a52	Emilio Jesús	18830186K@gardops.cl	928863253	f	2025-07-30 19:19:43.374988	\N	2025-08-02 17:04:34.966011	-33.44890000	-70.66930000	Santiago	Macul	\N	18830186-K	Riveros	Contreras	CHILENA	Hombre	ezequiel fernandez 3759	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	18830186	contratado
9faf58a5-a100-4720-b2b8-f57866b80669	accebf8a-bacc-41fa-9601-ed39cb320a52	Gloria Edith	18883244K@gardops.cl	948597265	f	2025-07-30 19:19:43.558837	\N	2025-08-02 17:04:35.166306	-33.44890000	-70.66930000	Santiago	Estación Central	\N	18883244-K	Quijada	Zuñiga	CHILENA	Mujer	Francisco Zelada 086	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	18883244	contratado
c5a52c60-de12-47fd-8210-aedcd4e35fd2	accebf8a-bacc-41fa-9601-ed39cb320a52	Raul Felipe	191040635@gardops.cl	927902057	f	2025-07-30 19:19:43.748759	\N	2025-08-02 17:04:35.527077	-23.65090000	-70.39550000	Antofagasta	Antofagasta	\N	19104063-5	Rodriguez	Coronel	CHILENA	Hombre	Pocuro 6233	\N	f	\N	36cb4f56-61ad-4d0a-9f27-fcd4643e23bd	CTA	111119104063	contratado
29e97150-6116-4f54-ac80-3034726fa965	accebf8a-bacc-41fa-9601-ed39cb320a52	NAYARETH VALERIA	192849756@gardops.cl	941801616	t	2025-07-30 19:19:44.237684	\N	2025-08-02 17:04:36.293372	-33.44890000	-70.66930000	Santiago	Renca	\N	19284975-6	ALFARO	FERNANDEZ	CHILENA	Mujer	PASAJE LIKO CASA 129	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	19284975	contratado
ee9f01e4-2523-469a-91bb-25734cf5dca5	accebf8a-bacc-41fa-9601-ed39cb320a52	Daniel Alejandro	194487983@gardops.cl	976456025	f	2025-07-30 19:19:44.422082	\N	2025-08-02 17:04:36.4617	-32.75070000	-70.72560000	San Felipe de Aconcagua	San Felipe	\N	19448798-3	Geve	Espínola	CHILENA	Hombre	Cirujano videla N°7	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTE	22370591656	contratado
b393b793-b4f9-4990-97d9-92ae42ca22c0	accebf8a-bacc-41fa-9601-ed39cb320a52	Nicolas Guillermo	196830464@gardops.cl	998528617	f	2025-07-30 19:19:44.604728	\N	2025-08-02 17:04:37.059961	-23.65090000	-70.39550000	Antofagasta	Antofagasta	\N	19683046-4	Gonzalez	Vidal	CHILENA	Hombre	Campamento Juanita cruchaga 5010 5010	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	19683046	contratado
6bd656c8-4040-4a17-a9f1-1c3beeae397d	accebf8a-bacc-41fa-9601-ed39cb320a52	Danitza  Mirelly	19707020k@gardops.cl	971837092	f	2025-07-30 19:19:44.78942	\N	2025-08-02 17:04:37.446445	-33.44890000	-70.66930000	Santiago	La Granja	\N	19707020-k	Torrejon	Rojas	CHILENA	Mujer	Socos #9221	\N	f	\N	d8f390a2-2466-4bc8-9032-903a0e84e85b	CTE	777919707020	contratado
26144e72-111b-46b2-80b0-53d58c7111c4	accebf8a-bacc-41fa-9601-ed39cb320a52	Bastian alejandro	198871621@gardops.cl	972864818	f	2025-07-30 19:19:45.283988	\N	2025-08-02 17:04:38.287988	-33.44890000	-70.66930000	Santiago	Santiago	\N	19887162-1	Cereceda	Pizarro	CHILENA	Hombre	Cien fuegos 162	\N	f	\N	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	18800193687	contratado
b0f51c74-886f-4cb0-9f92-69429b33982b	accebf8a-bacc-41fa-9601-ed39cb320a52	Bastian Ignacio	201226759@gardops.cl	945613739	f	2025-07-30 19:19:45.46966	\N	2025-08-02 17:04:38.453325	-33.44890000	-70.66930000	Santiago	La Florida	\N	20122675-9	Rivera	Tureuna	CHILENA	Hombre	Paulina 2148	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	20122675	contratado
fdcc8683-692a-477e-9743-ed20cc0fe0d0	accebf8a-bacc-41fa-9601-ed39cb320a52	Matias Aaron	201313465@gardops.cl	977591042	f	2025-07-30 19:19:45.65521	\N	2025-08-02 17:04:38.645532	-33.44890000	-70.66930000	Santiago	Conchalí	\N	20131346-5	Castro	Ramos	CHILENA	Hombre	Av. Principal #1425	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	20131346-5	contratado
c89d1d9f-d777-472e-a025-d6dad5172096	accebf8a-bacc-41fa-9601-ed39cb320a52	Gabriela Francisca María	202162274@gardops.cl	927545893	f	2025-07-30 19:19:45.83986	\N	2025-08-02 17:04:38.814866	-33.44890000	-70.66930000	Santiago	Macul	\N	20216227-4	Chia	Fredes	CHILENA	Hombre	Exequiel Fernández 4195	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	20216227	contratado
b736b740-a13f-4aba-aea2-ea1946e9b43f	accebf8a-bacc-41fa-9601-ed39cb320a52	keith escot	202287751@gardops.cl	941000427	f	2025-07-30 19:19:46.132574	\N	2025-08-02 17:04:39.014256	-33.44890000	-70.66930000	Chañaral	Chañaral	\N	20228775-1	Alvarez	Carrizo	CHILENA	Hombre	el tepual 865	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	20228775	contratado
316acd80-6d1c-468e-85e5-c62dac0e80f4	accebf8a-bacc-41fa-9601-ed39cb320a52	Constanza Valentina Pacheco Matamala	204539367@gardops.cl	965449400	f	2025-07-30 19:19:46.52061	\N	2025-08-02 17:04:39.81463	-33.44890000	-70.66930000	Santiago	Maipú	\N	20453936-7	Pacheco	Matamala	CHILENA	Hombre	El conquistador 1729	\N	f	\N	bda92040-ac11-4e2c-b8c9-dd017f48be09	CTE	777920453936	contratado
a83432ed-95b9-4ae5-abdc-546f41a11a9f	accebf8a-bacc-41fa-9601-ed39cb320a52	Bryan	211124601@gardops.cl	935202175	f	2025-07-30 19:19:47.189632	\N	2025-08-02 17:04:40.965706	-33.44890000	-70.66930000	Santiago	Lo Prado	\N	21112460-1	Guzman	Quinteros	CHILENA	Hombre	Av cinco de abril 604	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	21112460	contratado
c38399a7-a4ce-4d13-a360-5ea5d2a69e15	accebf8a-bacc-41fa-9601-ed39cb320a52	BORIS MARCEL	243784204@gardops.cl	948807732	f	2025-07-30 19:19:47.564024	\N	2025-08-02 17:04:41.565752	-33.44890000	-70.66930000	Santiago	Santiago	\N	24378420-4	ESTRELLA	BAQUERIZO	ECUATORIANA	Hombre	GENERAL GHANA 9	\N	f	\N	9aaa69ff-8981-4534-b8cf-bb3888cfc3f1	CTA	156521124	contratado
ac3997f2-29e4-4090-98c8-6a53586b1164	accebf8a-bacc-41fa-9601-ed39cb320a52	Moisés Leandro	259784301@gardops.cl	976262808	f	2025-07-30 19:19:47.748456	\N	2025-08-02 17:04:42.525539	-33.44890000	-70.66930000	Santiago	Cerrillos	\N	25978430-1	Pedrozo	Vivas	CHILENA	Hombre	Salomón Sack 998	\N	f	\N	9aaa69ff-8981-4534-b8cf-bb3888cfc3f1	CTA	325021046	contratado
7271614d-0c02-4693-b73d-dc6cc25c6957	accebf8a-bacc-41fa-9601-ed39cb320a52	Jhon	269523557@gardops.cl		f	2025-07-30 19:19:47.932065	\N	2025-08-02 17:04:43.181752	-23.65090000	-70.39550000	Antofagasta	Antofagasta	\N	26952355-7	Casillo	Gutiérrez	BOLIVIANA	Hombre	Molibdeno 39	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	26952355	contratado
b5c4b13f-268c-4049-aa32-082f500661f2	accebf8a-bacc-41fa-9601-ed39cb320a52	Danae soledad	128647619@gardops.cl	931996435	f	2025-07-30 19:19:36.174074	\N	2025-08-02 17:04:21.298539	-33.44890000	-70.66930000	Santiago	Conchalí	\N	12864761-9	Riveros	Rojas	CHILENA	Mujer	Juncal 1752	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	12864761	contratado
3a5e42b3-7beb-4349-9310-9ae1c7df3b83	accebf8a-bacc-41fa-9601-ed39cb320a52	Michelle Stefany	192228204@gardops.cl	965046398	f	2025-07-30 19:19:44.03118	\N	2025-08-02 17:04:35.880596	-33.44890000	-70.66930000	Santiago	La Pintana	\N	19222820-4	Hernández	Acuña	CHILENA	Mujer	Los gorriones 1660	\N	f	\N	d8f390a2-2466-4bc8-9032-903a0e84e85b	CTA	47923962	contratado
5ee301e3-7e51-46ff-b5ff-6b9c37c1d6f1	accebf8a-bacc-41fa-9601-ed39cb320a52	Geraldyne Danae	209048051@gardops.cl	964337738	f	2025-07-30 19:19:46.890345	\N	2025-08-02 17:04:40.805406	-33.59270000	-70.69950000	Maipo	San Bernardo	\N	20904805-1	Becerra	Fajardo	CHILENA	Mujer	Cerró a antillana 14995	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	20904805	contratado
4fb4c797-b193-4f22-b6a8-d8da48266b98	accebf8a-bacc-41fa-9601-ed39cb320a52	Jose antonio	120035835@gardops.cl	979234721	f	2025-07-30 19:19:35.880767	\N	2025-08-02 17:04:20.367016	-33.44890000	-70.66930000	Santiago	Macul	\N	12003583-5	Diaz	Espinoza	CHILENA	Hombre	Camilo henriquez 4030	\N	f	\N	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19840144887	contratado
68dd6808-bb24-4cae-b0e5-16e143466099	accebf8a-bacc-41fa-9601-ed39cb320a52	Román Alexis	197872683@gardops.cl	933972420	f	2025-07-30 19:19:45.092936	\N	2025-08-02 17:04:37.646876	-32.75070000	-70.72560000	San Felipe de Aconcagua	San Felipe	\N	19787268-3	Arriola	Osorio	CHILENA	Hombre	Av chile 986	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	19787268	contratado
13aeb1a1-6054-421a-b5fc-d7e9e5e0674a	accebf8a-bacc-41fa-9601-ed39cb320a52	Manuel Alejandro	211944048@gardops.cl	937657719	f	2025-07-30 19:19:47.381303	\N	2025-08-02 17:04:41.336464	-33.44890000	-70.66930000	Santiago	Quilicura	\N	21194404-8	Cea	Ríos	CHILENA	Hombre	Buenos Aires 511	\N	f	\N	eaf03a6a-c53a-43b5-8eda-80f0c44cef40	CTE	19801219100	contratado
60e5231e-8b26-4d6c-bd49-a6e0ee740a17	accebf8a-bacc-41fa-9601-ed39cb320a52	Carlos	90611445@gardops.cl	997836987	f	2025-07-30 19:19:33.222909	\N	2025-08-02 17:04:15.398966	-33.04720000	-71.61270000	Valparaíso	Valparaíso	\N	9061144-5	Fredes	Lorca	CHILENA	Hombre	Magdalena Mira 489	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	9061144	contratado
3b6d7b7f-ca02-4dbd-8c1a-0f7f7c2b6327	accebf8a-bacc-41fa-9601-ed39cb320a52	Cristian Eduardo	101221512@gardops.cl	958914917	f	2025-07-30 19:19:34.273322	\N	2025-08-02 17:04:17.285485	-33.04720000	-71.61270000	Valparaíso	Quintero	\N	10122151-2	López	Cárter	CHILENA	Hombre	Entre rios#1721	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	10122151	contratado
ee94b319-c127-4186-951f-b3b1f174715d	accebf8a-bacc-41fa-9601-ed39cb320a52	Pamela Andrea	pomelobecar@gmail.com	950290277	t	2025-07-30 19:19:31.987917	\N	2025-08-02 17:04:02.693279	-33.61670000	-70.58330000	Cordillera	Puente Alto	\N	16563350-4	Becar	Cañoles	CHILENA	Mujer	Las frambuesas 0841	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	16563350	contratado
91fead7e-a1f1-43e6-b296-5a701a9d5e03	accebf8a-bacc-41fa-9601-ed39cb320a52	ATILA ESTEBAN	83323299@gardops.cl	964718831	f	2025-07-30 19:19:33.023645	\N	2025-08-02 17:04:14.974254	-33.44890000	-70.66930000	Santiago	Conchalí	\N	8332329-9	KOTEK	ROSALES	CHILENA	Hombre	HUECHURABA 1254	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	8332329	contratado
d3ee950a-7fbe-4215-a2c8-43796544a8e3	accebf8a-bacc-41fa-9601-ed39cb320a52	Carlos Alberto	101509273@gardops.cl	959125499	f	2025-07-30 19:19:34.457116	\N	2025-08-02 17:04:17.615021	-33.44890000	-70.66930000	Santiago	Quilicura	\N	10150927-3	Ramirez	Tapia	CHILENA	Hombre	Las violetas 515 dep-12-A	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	10150927	contratado
e821f69d-0eec-42c5-b781-3fcaa602c796	accebf8a-bacc-41fa-9601-ed39cb320a52	Jose Luis	101656632@gardops.cl	997915621	f	2025-07-30 19:19:34.641822	\N	2025-08-02 17:04:17.886494	-33.44890000	-70.66930000	Santiago	Santiago	\N	10165663-2	Milano	Cabrera	CHILENA	Hombre	Padre Alonso Ovalle 840 depto 105	\N	f	\N	d8f390a2-2466-4bc8-9032-903a0e84e85b	CTE	49622234	contratado
5cfda559-2790-426c-8cf6-12394064b1a4	accebf8a-bacc-41fa-9601-ed39cb320a52	Rolando Alfredo	101981258@gardops.cl	973710922	f	2025-07-30 19:19:34.825617	\N	2025-08-02 17:04:18.113872	-23.65090000	-70.39550000	Antofagasta	Antofagasta	\N	10198125-8	Castillo	Lara	CHILENA	Hombre	Calle riquelme 1074	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	10198125	contratado
588e9839-0475-4928-b789-ae0ef99bacb5	accebf8a-bacc-41fa-9601-ed39cb320a52	Nelson Dagoberto	134011033@gardops.cl	940593187	f	2025-07-30 19:19:37.097483	\N	2025-08-02 17:04:22.72514	-33.44890000	-70.66930000	Santiago	La Florida	\N	13401103-3	Silva	Cáceres	CHILENA	Hombre	Calle el acero 10560	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	13401103	contratado
c9eeddcb-747e-4bce-8c36-98ff4ad21bbd	accebf8a-bacc-41fa-9601-ed39cb320a52	Iván	134794186@gardops.cl	989523728	f	2025-07-30 19:19:37.282246	\N	2025-08-02 17:04:22.934527	-33.44890000	-70.66930000	Santiago	Lo Prado	\N	13479418-6	Gonzalez	Barria	CHILENA	Hombre	Avenida general Óscar Bonilla 5877	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	CTA	13479418	contratado
ea2df496-77c0-49bf-944d-bec4db2104db	accebf8a-bacc-41fa-9601-ed39cb320a52	Maximilian Enrique	135665258@gardops.cl	982260546	f	2025-07-30 19:19:37.468674	\N	2025-08-02 17:04:23.192987	-33.44890000	-70.66930000	Santiago	Quilicura	\N	13566525-8	Benois	Araya	CHILENA	Hombre	Los álamos 646 depto 401	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	13566525	contratado
0cfc2c51-611e-4a10-b4ab-e3deff2bd83b	accebf8a-bacc-41fa-9601-ed39cb320a52	Sebastián Andrés	176892234@gardops.cl	956989646	f	2025-07-30 19:19:42.691274	\N	2025-08-02 17:04:32.499621	-33.44890000	-70.66930000	Santiago	La Cisterna	\N	17689223-4	Muñoz	García	CHILENA	Hombre	José Joaquín Prieto vial 8340 dep 234	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	17689223-4	contratado
6d8eff68-f72f-47f2-879a-bd7c89672db8	accebf8a-bacc-41fa-9601-ed39cb320a52	KRISHNA ALEJANDRA	204324158@gardops.cl	974039252	f	2025-07-30 19:19:46.33186	\N	2025-08-02 17:04:39.613369	-33.44890000	-70.66930000	Santiago	Cerro Navia	\N	20432415-8	REYES	ALVEAR	CHILENA	Mujer	Los Aymaras 7251	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	20432415	contratado
27004c36-3e04-4eea-8bd2-6c3fecbe0fd7	accebf8a-bacc-41fa-9601-ed39cb320a52	Jibsam Patricio	207210617@gardops.cl	988142152	f	2025-07-30 19:19:46.703501	\N	2025-08-02 17:04:40.414663	-23.65090000	-70.39550000	Antofagasta	Antofagasta	\N	20721061-7	Medina	Novoa	CHILENA	Hombre	Meseta norte casa 36 puerto coloso	\N	f	\N	756a508e-948c-40d4-b675-ce4e1a16daf1	RUT	20721061-7	contratado
0b8d30b4-ad1d-41af-bc16-565498ec6230	accebf8a-bacc-41fa-9601-ed39cb320a52	Test	nuevo@email.com	123456789	t	2025-08-07 22:25:25.18593	\N	2025-08-07 22:25:25.18593	-33.40000000	-70.60000000	Región Metropolitana	Providencia	\N	24706330-7	Usuario		\N	\N	Carlos Antúnez 1831, Providencia, Región Metropolitana, Chile	\N	f	\N	\N	\N	\N	contratado
357f0f00-ffcb-46af-8aea-ec1fc62fa69d	accebf8a-bacc-41fa-9601-ed39cb320a52	Test2	test2@email.com	123456789	t	2025-08-07 22:25:29.791112	\N	2025-08-07 22:25:29.791112	-33.40000000	-70.60000000	Región Metropolitana	Las Condes	\N	24706331-5	Usuario		\N	\N	Av. Apoquindo 4501, Las Condes, Región Metropolitana, Chile	\N	f	\N	\N	\N	\N	contratado
4d969e50-67fc-42ea-92f8-4b0ec6e263eb	accebf8a-bacc-41fa-9601-ed39cb320a52	A Test 3	pl@cl.cl	993456789	t	2025-08-07 22:32:42.721082	\N	2025-08-07 22:32:42.721082	-33.36327920	-70.51481440	Santiago	Lo Barnechea	\N	24706328-5	Test		\N	\N	Av. La Dehesa 333, 7690491 Lo Barnechea, Región Metropolitana, Chile	\N	f	\N	413ca99e-71dc-4d2b-9d8d-f1417747ffaf	CTE	345335434	contratado
\.


--
-- Data for Name: instalaciones; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.instalaciones (id, cliente_id, nombre, direccion, latitud, longitud, valor_turno_extra, estado, created_at, updated_at, tenant_id, ciudad, comuna) FROM stdin;
fe761cd0-320f-404a-aa26-2e81093ee12e	\N	Pine	\N	\N	\N	\N	Activo	2025-07-30 16:50:14.581395	2025-08-01 16:14:25.233757	\N	\N	\N
3c1586b5-136a-4ee1-88a9-410284f49807	\N	Tattersall Antofagasta	\N	\N	\N	0.00	Inactivo	2025-07-30 16:50:14.965354	2025-08-01 17:02:28.400114	\N	\N	\N
02ba6ead-016e-4956-8512-e15689c42768	\N	Zerando	\N	\N	\N	0.00	Inactivo	2025-07-30 16:50:15.150044	2025-08-01 17:03:06.673862	\N	\N	\N
15631bd6-03a9-459d-ae60-fc480f7f3e84	8d24d353-375c-41e1-b54c-f07437a98c3e	A Test 1	Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile	-33.36332430	-70.51511800	0.00	Activo	2025-08-02 01:36:29.440427	2025-08-02 01:36:29.440427	\N	Santiago	Lo Barnechea
7e05a55d-8db6-4c20-b51c-509f09d69f74	8d24d353-375c-41e1-b54c-f07437a98c3e	A Test	Av. La Dehesa 111, 7690333 Lo Barnechea, Región Metropolitana, Chile	-33.36410080	-70.51437510	30000.00	Activo	2025-07-30 16:50:14.780566	2025-08-05 18:41:14.319846	\N	Santiago	Lo Barnechea
0e8ba906-e64b-4d4d-a104-ba29f21f48a9	8d24d353-375c-41e1-b54c-f07437a98c3e	A TEST 3	Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile	-33.36405540	-70.51478340	35000.00	Activo	2025-08-07 20:21:27.951558	2025-08-07 16:21:46.525501	\N	Santiago	Lo Barnechea
f86c238c-145e-48c8-a528-c6897ba8134d	97ae8d15-1ecb-401f-b189-3252c76354a0	Transmat la Negra	Avenida Héctor Gómez Cobos, Antofagasta, Chile	-23.74262640	-70.30252090	\N	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:16:48.426	\N	\N	\N
01574763-b65c-4b67-b638-1d19de13f28b	d825a799-16e7-451f-96cc-50180393b400	Coronel	Av. Golfo De Arauco 3561, 4190042 Concepción, Coronel, Bío Bío, Chile	-36.97909300	-73.17273700	\N	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:16:57.259	\N	\N	\N
20c20c3f-1225-4abf-857d-e63cc89434fd	\N	Distrito los Trapenses	Cam. Los Trapenses 3061, 7700369 Lo Barnechea, Región Metropolitana, Chile	-33.34729630	-70.54249950	40000.00	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:17:23.29	\N	\N	\N
0d3c9a36-3357-40a5-85db-d94086f22b32	\N	Obra Lo Barnechea	Cam. Los Trapenses 3276, Lo Barnechea, Región Metropolitana, Chile	-33.34553380	-70.54391610	32500.00	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:17:57.158	\N	\N	\N
fa5cd831-eac9-419b-b0fa-6fb2c86e4e26	39e543bc-55e5-4cc4-a444-cdf135cc2b89	Emecar	3 Nte. 857, 2520770 Viña del Mar, Valparaíso, Chile	-33.02056650	-71.54922470	40000.00	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:18:11.504	\N	\N	\N
e92fbd13-f7b7-47ba-8f0f-a14808bfe1eb	6a55967d-981c-4825-8f6f-5be3fee1d132	Caicoma	La Capilla 8550, 9090075 Renca, Cerro Navia, Región Metropolitana, Chile	-33.41465390	-70.76169010	\N	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:06:27.293	\N	\N	\N
ff6689ad-88f5-4089-b007-f4a88b73549a	e70f4f8e-9454-4743-ab76-6ebdc6e1b873	Chañaral	Zuleta 462, Chañaral, Atacama, Chile	-26.34504850	-70.61528670	40000.00	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:07:20.006	\N	\N	\N
971aff54-cdea-4e7b-b2b7-6e3eb6b4436a	9fa21016-257e-4730-a832-fcdaff1a646f	FMT	Madrid 344, 2851986 Rancagua, O'Higgins, Chile	-34.16328510	-70.73619880	35000.00	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:08:34.703	\N	\N	\N
d3715abb-191d-4456-8f36-970fd355c399	13c1239a-2c1c-4570-9e6e-42a9f571520c	Metropolitan	Costanera Sur S.J.E. de Balaguer 5600, 7630000 Vitacura, Región Metropolitana, Chile	-33.38328140	-70.58818060	37500.00	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:08:44.633	\N	\N	\N
fbe9a174-aa3d-490c-8522-a42b8fe296e2	d825a799-16e7-451f-96cc-50180393b400	Quilicura	Av. Pdte. Eduardo Frei Montalva 5690, 8700548 Quilicura, Renca, Región Metropolitana, Chile	-33.37931740	-70.69517100	\N	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:08:55.773	\N	\N	\N
d17cd2f0-850c-4af2-845e-bce5ce80a269	d825a799-16e7-451f-96cc-50180393b400	El Bosque	Av. Ochagavia 11750, 8010000 El Bosque, Región Metropolitana, Chile	-33.55792680	-70.69553880	\N	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:11:32.722	\N	\N	\N
254b6b4a-6d74-4f1a-a1ca-d3e23960998c	\N	Condominio La Florida	Sánchez Fontecilla 7816, La Florida, Región Metropolitana, Chile	-33.52530620	-70.55558320	35000.00	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:11:45.47	\N	\N	\N
88b0407a-01bb-43b9-87cd-d06da531aa08	\N	Moova	Av. Américo Vespucio 1367, Huechuraba, Región Metropolitana, Chile	-33.37147490	-70.66908400	\N	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:14:33.953	\N	\N	\N
b28aecde-b43d-4d98-9cff-93640ca14aed	\N	JugaBet	San Pascual 187, 7580112 Las Condes, Región Metropolitana, Chile	-33.41443260	-70.58051760	35000.00	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:14:59.847	\N	\N	\N
c6ded533-6227-45ad-bb64-e1f029a6f0b2	d825a799-16e7-451f-96cc-50180393b400	Mejillones	la dehesa 226	\N	\N	35000.00	Activo	2025-07-23 21:36:52.246689	2025-07-27 12:59:42.005	\N	\N	\N
d8d5d60b-f2da-4e65-b934-0b267d33dcfb	\N	Embajada Brasil	Av. Alameda Libertador Bernardo O'Higgins 1656, Santiago, Región Metropolitana, Chile	-33.44643300	-70.65967050	\N	Activo	2025-07-23 21:36:52.246689	2025-07-26 10:15:18.021	\N	\N	\N
8cdf54bf-7959-4487-a7e7-45d49e139413	c6425c57-e57f-4028-8241-77d675a9e500	Pedemonte	Camino Chiu Chiu, Calama, Antofagasta, Chile	-22.43974870	-68.88176830	\N	Activo	2025-07-23 21:36:52.246689	2025-07-27 14:21:01.76	\N	\N	\N
4bfe800b-06d0-4633-be95-23fae0ac1401	55c8aa2c-7542-42e9-9d9e-05a2b6a3e49a	Newtree	Av. Los Carrera 301, Concepción, Bío Bío, Chile	-36.83129460	-73.06385210	\N	Activo	2025-07-23 21:36:52.246689	2025-07-27 14:35:29.617	\N	\N	\N
e575e81e-f7b0-4891-8853-dfa64af6c963	14a7e1de-9a50-4f92-b694-35c063f64343	Santa Amalia	Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile	-33.36332430	-70.51511800	37500.00	Activo	2025-07-23 21:36:52.246689	2025-07-27 14:47:44.724	\N	\N	\N
84d7f899-ed5f-4541-a2b1-3ba3751349a7	6a55967d-981c-4825-8f6f-5be3fee1d132	Escuela Sargento Candelaria	\N	\N	\N	\N	Inactivo	2025-07-23 21:36:52.246689	2025-07-23 21:36:52.246689	\N	\N	\N
fb0d4f19-75f3-457e-8181-df032266441c	\N	Aerodromo Victor Lafón F	\N	\N	\N	35000.00	Inactivo	2025-07-30 02:52:42.618836	2025-08-01 17:02:10.05272	\N	\N	\N
fa95f165-9796-4823-9eca-5acf3a1e92c1	d10d64d1-7bc7-42a2-b783-2fefe25e97c5	Condominio Alta Vista 2	\N	\N	\N	35000.00	Inactivo	2025-07-23 21:36:52.246689	2025-07-23 21:36:52.246689	\N	\N	\N
d19cf3cc-ca4c-458f-b6cb-30b81f9810ea	d10d64d1-7bc7-42a2-b783-2fefe25e97c5	Condominio Crusoe	\N	\N	\N	\N	Inactivo	2025-07-23 21:36:52.246689	2025-07-23 21:36:52.246689	\N	\N	\N
09920483-463e-403e-8481-48badb235c76	\N	Llancay	\N	\N	\N	\N	Inactivo	2025-07-23 21:36:52.246689	2025-07-23 21:36:52.246689	\N	\N	\N
610088cd-968d-41ae-a4a8-698a860ceda1	\N	Pikala	\N	\N	\N	\N	Inactivo	2025-07-23 21:36:52.246689	2025-07-23 21:36:52.246689	\N	\N	\N
c2e14f4d-b1ee-4574-bb11-ad6e14e5ccd2	\N	Placilla	Av. Ojos del Salado 3225, Placilla, Valparaíso	\N	\N	\N	Inactivo	2025-07-23 21:36:52.246689	2025-07-23 21:36:52.246689	\N	\N	\N
132cb449-1c19-4265-82f3-6506acaf017b	f85549cf-60b3-4d08-b4cc-08d01a95b5f2	Pocuro	Av. Pajarito SN	\N	\N	\N	Inactivo	2025-07-23 21:36:52.246689	2025-07-23 21:36:52.246689	\N	\N	\N
a22e59a7-c2e3-481e-97d4-9859f88c6c00	f85549cf-60b3-4d08-b4cc-08d01a95b5f2	Sotillo	Calle Sotillo SN	\N	\N	\N	Inactivo	2025-07-23 21:36:52.246689	2025-07-23 21:36:52.246689	\N	\N	\N
4593a13a-cdd5-4e2e-8ce4-13e1341a1faf	f85549cf-60b3-4d08-b4cc-08d01a95b5f2	TyC	Av Pajaritos SN	\N	\N	\N	Inactivo	2025-07-23 21:36:52.246689	2025-07-23 21:36:52.246689	\N	\N	\N
9b65f5c3-d9ad-4acd-ad39-c5517e790f0d	\N	Pemuco	\N	\N	\N	\N	Inactivo	2025-07-23 21:36:52.246689	2025-07-26 10:19:23.257	\N	\N	\N
387f0af5-751d-465e-aff3-0768c3fb55c1	f85549cf-60b3-4d08-b4cc-08d01a95b5f2	Centro de Gestion	Juan Luis Sanfuentes 65, Futrono, Los Ríos, Chile	-40.13099590	-72.38667560	0.00	Inactivo	2025-07-23 21:36:52.246689	2025-07-30 03:33:08.15348	\N	Ranco	Futrono
1146f245-7ce5-4a11-89d6-48369473c3a8	b6c521f9-edb3-41bd-9b01-f70fa46acc51	Asfalcura	Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile	-33.36332430	-70.51511800	0.00	Inactivo	2025-07-29 23:45:53.796806	2025-07-29 23:45:53.796806	\N	Santiago	Lo Barnechea
\.


--
-- Data for Name: isapres; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.isapres (id, nombre, created_at, updated_at) FROM stdin;
08cc21e1-2d29-4977-8589-0dda3c237df3	FONASA	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
f0fd6757-8885-4fe1-a5d9-6ed37bbdf635	Colmena	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
27677b57-199d-4c0b-8933-b85fced2acc1	Cruz Blanca	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
b8718161-1514-44f4-9967-16491c8e1fde	Banmédica	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
52691c64-7601-412d-a7a9-cb3fb914f511	Nueva Masvida	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
60bffc6a-af8c-4d1d-a133-4a1a0df32667	Consalud	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
4db0e6fc-ade8-4cbe-8657-baa0becfb10f	Vida Tres	2025-07-26 16:10:11.940602	2025-07-28 13:09:56.966891
\.


--
-- Data for Name: logs_clientes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.logs_clientes (id, cliente_id, accion, usuario, tipo, contexto, fecha) FROM stdin;
ce2a9872-ee21-4af1-8b42-efcbc97b8ba1	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba del sistema de logs	Sistema	sistema	Verificación de funcionamiento	2025-07-28 17:44:18.579539
44cbabe7-704b-4118-b98a-3ee4dc757328	8d24d353-375c-41e1-b54c-f07437a98c3e	Eliminó documento: Captura de pantalla 2025-07-27 a la(s) 08.35.48.png	Admin	manual	Gestión de documentos	2025-07-28 18:09:16.114017
7d34f40a-e351-44cc-bfcd-38005f4f2b3d	8d24d353-375c-41e1-b54c-f07437a98c3e	Estado cambiado a Activo	Admin	manual	Cambio desde panel de administración	2025-07-28 18:09:28.890376
ed06f2da-b774-4f32-9f59-75dde1706e0a	8d24d353-375c-41e1-b54c-f07437a98c3e	Subió documento: Captura de pantalla Jul 27 2025.png	Admin	manual	Gestión de documentos	2025-07-28 18:23:48.908932
64c81f5f-107d-4ca5-8be9-2b8c19acbef2	8d24d353-375c-41e1-b54c-f07437a98c3e	Eliminó documento: Captura de pantalla Jul 27 2025.png	Admin	manual	Gestión de documentos	2025-07-28 18:24:35.674894
d52c4474-c6d2-44bd-8539-876fbc740c0b	8d24d353-375c-41e1-b54c-f07437a98c3e	Subió documento: Captura de pantalla 2025-07-27 a la(s) 08.35.48.png	Admin	manual	Gestión de documentos	2025-07-28 18:35:43.043609
499c1ac2-2e34-48d6-9fa8-f3aabe134986	8d24d353-375c-41e1-b54c-f07437a98c3e	Estado cambiado a Inactivo	Admin	manual	Cambio desde panel de administración	2025-07-28 20:50:12.516367
d98b8a3d-80eb-41e6-87a5-26e3bfefb1a4	8d24d353-375c-41e1-b54c-f07437a98c3e	Subió documento: Anexo_C_Completado_GARD.pdf	Admin	manual	Gestión de documentos	2025-07-28 20:54:47.986795
7159cb7d-47cd-4cc4-8f2a-2b2d66fed211	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 03:44:49.864865
67373b69-672f-445d-934a-846b6dee5b40	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 03:46:05.096879
e4202b51-3358-41b0-a9f6-9d963c3f1830	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 05:41:24.531991
68c4b75d-b99a-49e5-a9cd-aaccab77d5ce	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 05:57:04.137981
af069caf-01ab-47c6-af7e-39c157b05b48	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 06:00:04.166313
7276b1f2-b040-40f6-a267-4c5eecfbb3c5	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 06:16:21.418534
49339691-e1dc-484c-982b-2c21147ea181	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 06:20:52.172354
d83658ec-d31d-45e7-8201-3f27ec268f6f	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 06:26:47.946434
c4381716-eba0-446e-ae1c-cb732947127f	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 06:34:46.748594
6d603d7f-2fc6-47a2-8d5e-bc69b1a729f1	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 14:51:33.633489
e9214e5d-60be-49fc-b9b7-f08179631a02	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 16:44:15.385573
18dafbc5-2cf3-464c-ae3b-a62dbd124908	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 16:54:25.536494
441af5df-854f-4c98-94b9-7ee82a257593	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:07:14.70931
e6fcf53c-6ee1-4123-a94b-331346a2a72c	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:14:57.114442
84cc7054-6145-4ad9-8f7e-497937599d8b	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:23:55.119722
8b86d739-284c-43d3-a17d-f84b76236bbd	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:27:07.555047
fecf5ee7-da23-4743-b932-51d0f35f43ef	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:30:40.729188
6f0452f4-72ac-42ce-b465-67f9304f9582	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:34:09.754787
9e8f53ba-af37-4071-bd98-5bb8be0ddcc7	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:50:03.039195
bd376e24-b428-4135-96e8-2be05d6b4890	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 21:01:50.324179
1c23575b-9eaa-4a11-adee-16583183dc9c	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 22:00:32.951746
47ea7f45-d0c5-457d-8c54-c70849f95717	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 22:37:34.646904
03908b52-5025-433e-a010-8d7c66b754de	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 01:59:59.914554
10b00516-b15a-42f3-8dcd-9344c74d9ee7	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 02:04:19.872786
61a191a8-d6c2-4071-a4b7-9959b3c02742	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 02:20:04.424251
a0a817a8-a75c-4cc8-8e93-374c4efb7ff9	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 02:27:40.78577
25847f98-9a24-4e8e-b854-1edee633d6c7	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 02:32:54.40866
e71c14e5-dabe-4d38-a36d-00339d7aa704	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 02:37:18.850673
45403002-f4e3-47dc-ac0d-ecb48bd26919	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 02:41:29.63947
2c9fa286-2bd9-43aa-aa5f-70dd9dbdc7a2	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 05:06:16.55633
744c544d-07fd-434e-a0c6-8d6a3cdaf1ab	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 05:40:36.722883
52d9e064-df0e-4665-a0a2-48fa12d29380	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 06:00:15.35803
32ad9c4b-4c40-44da-a6d3-7ec855ad1626	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 07:35:03.988791
58cc171a-e1e8-44da-98c8-2a950983e242	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 07:44:02.952893
3b598a47-b209-4c50-a041-283108a79f9d	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 07:51:22.433052
340923ea-dd84-4c5d-a671-a40afb3408b6	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 07:54:25.164744
171c7265-de2e-4df2-8a57-cfbcef27c852	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 08:00:28.076803
c7a4fcd5-bf1c-4fb1-9c82-4223f05583ee	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 08:02:11.028834
f17430c5-2b02-41ab-a544-ff570a545564	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 08:03:30.523479
82539608-941a-4bea-b4d7-f1376af260ea	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 08:11:49.936859
8cd858ff-8d67-4eba-b239-5050b662979e	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 13:47:07.256539
65441473-7a8c-4644-ab63-39a88d413b16	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 18:07:09.364798
bbac12e3-27cc-412b-9e4d-ca0897e83328	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 04:41:15.515997
e4073eec-5e1f-4b7b-b341-c96376520a87	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 04:51:05.80963
43dceb10-261e-43ae-b007-c2c8c70dba4e	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 04:56:10.188668
d9845059-d858-4582-9d92-e14b98ccaeb0	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 15:40:10.554723
a4ad61bd-ccf8-4927-bb23-a6ec55776574	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 15:48:25.715964
d8427498-8cfb-4b4a-8465-8d187ab006de	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 15:49:49.548726
8921c59e-32e9-4dea-bdcc-234a33439264	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 17:36:28.371716
3937a59f-cfd0-46e7-b1e7-60163664f7bc	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 22:42:42.135669
45a7b486-b9f7-4420-9d99-89ff9ce431ea	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 23:14:18.92288
285ec0ea-ff4c-44ae-9526-3999ab9386b5	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-08 03:36:32.166946
0aa8f66c-56b5-4fd0-b3fd-f92ad77d97ac	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-08 04:16:08.785944
91a4f821-f49f-4576-876c-d9827e3904c7	8d24d353-375c-41e1-b54c-f07437a98c3e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-08 11:54:15.842547
\.


--
-- Data for Name: logs_documentos; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.logs_documentos (id, documento_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id) FROM stdin;
\.


--
-- Data for Name: logs_guardias; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.logs_guardias (id, guardia_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id) FROM stdin;
46a2ee5a-ddb2-4e34-8922-88d9ac7ce059	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	UPDATE guardias	admin@test.com	api	{"operacion":"UPDATE","datos_anteriores":{"banco":"123","tipo_cuenta":"CCT"},"datos_nuevos":{"banco":"456","tipo_cuenta":"CTE"},"timestamp":"2025-08-04T21:46:18.306Z","contexto":"Prueba de logging","test":true}	{"banco": "123", "tipo_cuenta": "CCT"}	{"banco": "456", "tipo_cuenta": "CTE"}	2025-08-04 21:46:19.888389	accebf8a-bacc-41fa-9601-ed39cb320a52
cfd59d0e-ce9b-494c-9214-44ac81ec418d	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	UPDATE guardias	admin@test.com	api	{"operacion":"UPDATE","datos_anteriores":{"banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CTE","numero_cuenta":"3333333"},"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444"},"timestamp":"2025-08-04T21:46:29.610Z","contexto":"Actualización de datos bancarios","campos_modificados":{"banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444"}}	{"banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "tipo_cuenta": "CTE", "numero_cuenta": "3333333"}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "tipo_cuenta": "CCT", "numero_cuenta": "4444444"}	2025-08-04 21:46:29.745607	accebf8a-bacc-41fa-9601-ed39cb320a52
16eababe-dbed-4501-8569-3621f47a82ac	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	TEST	admin@test.com	manual	Prueba de logging	\N	\N	2025-08-04 21:52:31.985527	accebf8a-bacc-41fa-9601-ed39cb320a52
d5d8d0fa-f4d4-447c-89ed-2f787cb06e6b	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:46:29.611Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-9","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-04T21:57:06.680Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-9", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:46:29.611Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-04 21:57:06.831871	accebf8a-bacc-41fa-9601-ed39cb320a52
cc60e1d9-9f4f-4a99-ba75-f7db2708a8b4	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:46:29.611Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-9","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-04T21:57:06.967Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-9", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:46:29.611Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-04 21:57:07.118863	accebf8a-bacc-41fa-9601-ed39cb320a52
9e0af6a8-fad5-44ce-8058-914a1f9ec4e4	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:46:29.611Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-9","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-04T21:57:31.470Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-9", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:46:29.611Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-04 21:57:31.623515	accebf8a-bacc-41fa-9601-ed39cb320a52
fc426889-a640-4944-85ac-9a41fdfb083a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:46:29.611Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-9","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-04T21:57:31.806Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-9", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:46:29.611Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-04 21:57:31.959955	accebf8a-bacc-41fa-9601-ed39cb320a52
8264b0ce-95a3-42ff-a39e-5a587d241264	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	UPDATE guardias	admin@test.com	api	{"operacion":"UPDATE","datos_anteriores":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:46:29.611Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-9","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444"},"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444"},"timestamp":"2025-08-04T21:57:37.792Z"}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-9", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:46:29.611Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	2025-08-04 21:57:38.116062	accebf8a-bacc-41fa-9601-ed39cb320a52
8999754a-b9cb-42bc-8d66-431006b111a3	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-04T21:57:38.325Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-04 21:57:38.47767	accebf8a-bacc-41fa-9601-ed39cb320a52
5c45a5f2-778b-44dd-96f2-aca748119c2b	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-04T21:57:38.597Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-04 21:57:38.748834	accebf8a-bacc-41fa-9601-ed39cb320a52
c7112ccb-f75b-4b29-aa5e-690ae20d9601	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 03:44:47.734083	\N
1f2da17b-7903-42c5-b6e6-0ac42001ec4a	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 03:46:05.046004	\N
812961f4-4eea-452f-9562-a71c58eb8738	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 05:41:22.228015	\N
3eedb23e-481b-4226-968a-f9cf24b8f827	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 05:57:04.085459	\N
86b13a5b-c1c0-483e-a1c3-2cc9c2448f18	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:00:04.12626	\N
58d6dff8-8aef-42b0-87c4-5328a75d14b8	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:16:21.360672	\N
8e4cf168-62b3-4f53-a8a4-b1656b6b4286	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:20:52.135945	\N
12d878df-5f70-44bc-b419-48187c5ec275	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:26:47.877109	\N
3e942849-8930-4ed4-8bf3-4c0101dfe555	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:34:46.681347	\N
a817d207-d175-4bd2-b282-456015fafbe0	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 14:51:33.548106	\N
56c0dcd3-db7f-40e2-88f9-f758839e2f63	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 16:44:15.296992	\N
f5ea020d-a45a-44f2-a180-4d83b4ab4e4f	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 16:54:25.472239	\N
3548ac3a-4549-47b9-97aa-45079d1c3c8a	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:07:14.617417	\N
155cb73f-7f25-4c05-aff4-ea8b0cbd2bb4	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:14:57.052818	\N
70de53a4-71f0-4b24-9ae3-e1ba821988c0	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:23:55.023693	\N
e976f224-fe7b-4c5e-89ef-9c7a7304c091	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:27:07.502309	\N
cde8ef02-c22a-4fde-9d1a-828755ca3740	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:30:40.653446	\N
cd0accef-dd37-4471-9ddd-215a7d298a94	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:34:09.694492	\N
23f61858-d0ba-4bcb-bac5-2cb3653214bb	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:50:02.988465	\N
67622449-f715-4fb1-8306-0f871fc20996	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 21:01:50.240777	\N
04c8e216-8788-458e-847e-2a2ce1d09abf	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-05T21:27:10.960Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-05 21:27:11.263026	accebf8a-bacc-41fa-9601-ed39cb320a52
930b6fa6-25f4-4189-b33d-2c01e3508a52	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-05T21:27:11.279Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-05 21:27:11.594946	accebf8a-bacc-41fa-9601-ed39cb320a52
93cc25ae-9af9-4b6d-abdd-1a5b42fc7733	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 22:37:32.387379	\N
6750c061-ca8a-40dc-9dc7-e68838b2fdad	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 01:59:59.828186	\N
4583a2ea-8dac-4e20-aa2f-b254d6eb64ac	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:04:19.786534	\N
7b079bd5-8a64-423c-84d3-e6dd3caa87c7	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:20:04.359344	\N
c4c1619b-8446-4103-a6d4-b5cea7b93176	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-05T21:41:23.240Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-05 21:41:23.593428	accebf8a-bacc-41fa-9601-ed39cb320a52
471e2cd3-aa1b-4cab-bf02-84c5ebb25486	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-05T21:41:23.609Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-05 21:41:23.949661	accebf8a-bacc-41fa-9601-ed39cb320a52
256910d6-4d98-4d91-8194-f7180c1f4cdd	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-05T21:42:53.607Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-05 21:42:53.928386	accebf8a-bacc-41fa-9601-ed39cb320a52
5a83087e-a25e-4558-bf42-216d0c4abd1d	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-05T21:42:53.912Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-05 21:42:54.238081	accebf8a-bacc-41fa-9601-ed39cb320a52
c6b0c074-b249-490f-acb8-13d5199fc2fd	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 22:00:30.441608	\N
7bc32b3d-b414-4566-862a-57d6593a2200	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:27:40.734302	\N
dcdb7a84-26d1-49bb-a359-3a236ab487c8	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:32:54.376732	\N
703644cf-c6bc-45df-af17-38c6660cd97a	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:37:18.815151	\N
caa86b7e-a479-4bed-a203-b6118a56b482	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:41:29.605976	\N
793f375c-66de-4bc0-b2a4-f10a5b8ca803	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 05:06:14.253149	\N
cef51e16-eac0-4d69-9b9f-8eb5637d5e8b	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 05:40:36.681143	\N
223de4b1-4c1e-4678-9f34-5aab35a20d8b	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 06:00:15.270065	\N
52afca0e-3489-4a47-b8ce-13fff49a82cb	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 07:35:03.914903	\N
c8a3f47f-66d6-49e9-8ad2-684fc20d5ecc	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 07:44:02.882433	\N
789db45e-380f-4c3e-ab19-bbd7729f9c21	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 07:51:22.385638	\N
aec28afb-1131-43df-9d41-76239f3b10df	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 07:54:25.121103	\N
1c5fa899-a2dd-487c-891f-e28e7e850f27	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 08:00:28.024953	\N
6edfda65-6d3d-4b91-91c8-e98500142345	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 08:02:10.972172	\N
7d9c797a-0f26-4376-bac9-8da6a4f7eb3a	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 08:03:30.483719	\N
602acd6b-3a76-4005-922a-20d412dfd137	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 08:11:49.890405	\N
21352e4a-fa11-4087-9b8f-7ff8fd6e72c2	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T13:45:11.913Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 13:45:12.032523	accebf8a-bacc-41fa-9601-ed39cb320a52
61d1c26a-a582-4d1c-a278-e9c595b34a67	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T13:45:12.615Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 13:45:12.7328	accebf8a-bacc-41fa-9601-ed39cb320a52
6a10dfbe-5aa4-4b8c-8fd9-a70deeb06314	7e74fc75-b0ee-4877-b985-1dcb8da9c71c	CREATE guardias	admin@test.com	api	{"operacion":"CREATE","datos_anteriores":null,"datos_nuevos":{"id":"7e74fc75-b0ee-4877-b985-1dcb8da9c71c","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"Test","email":"test5@test.com","telefono":"123456789","activo":true,"created_at":"2025-08-08T01:55:41.298Z","usuario_id":null,"updated_at":"2025-08-08T01:55:41.298Z","latitud":"-33.44890000","longitud":"-70.66930000","ciudad":"Santiago","comuna":"Providencia","region":null,"rut":"12345678-5","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Test Address","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null},"timestamp":"2025-08-07T21:55:41.269Z"}	\N	{"id": "7e74fc75-b0ee-4877-b985-1dcb8da9c71c", "rut": "12345678-5", "sexo": null, "banco": null, "email": "test5@test.com", "activo": true, "ciudad": "Santiago", "comuna": "Providencia", "nombre": "Test", "region": null, "latitud": "-33.44890000", "longitud": "-70.66930000", "telefono": "123456789", "direccion": "Test Address", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-08-08T01:55:41.298Z", "fecha_os10": null, "updated_at": "2025-08-08T01:55:41.298Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	2025-08-07 21:55:41.43955	accebf8a-bacc-41fa-9601-ed39cb320a52
d5660878-7fb0-4afa-857f-8b4fd49801ae	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-06T13:45:24.305Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-06 13:45:24.429323	accebf8a-bacc-41fa-9601-ed39cb320a52
f0871e5b-4e8c-48f9-934d-1ac94802a0be	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-06T13:45:24.613Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-06 13:45:24.73807	accebf8a-bacc-41fa-9601-ed39cb320a52
9489a16f-244f-48dc-9e0a-f3f612530380	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 13:47:07.1739	\N
750547bc-ba0b-4247-9273-72f7447e7464	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 18:07:09.300293	\N
df348fbf-2341-4dff-a3ff-697188c7ec64	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T18:46:07.440Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 18:46:07.634903	accebf8a-bacc-41fa-9601-ed39cb320a52
1af5c2ec-de8b-40d7-ac15-130b4faee039	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T18:46:07.802Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 18:46:07.99023	accebf8a-bacc-41fa-9601-ed39cb320a52
c116c9a2-55f3-4acd-8927-16e86f5631ff	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T18:46:12.500Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 18:46:12.662809	accebf8a-bacc-41fa-9601-ed39cb320a52
97401783-79e8-4931-8d41-a9208233400f	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T18:46:13.857Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 18:46:14.024429	accebf8a-bacc-41fa-9601-ed39cb320a52
fa93c6d0-c504-4404-9fa1-a993a51c00ec	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T18:46:17.926Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 18:46:18.09135	accebf8a-bacc-41fa-9601-ed39cb320a52
85f4cd1b-c924-4f05-b7d1-d2ec1f571431	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T18:46:18.219Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 18:46:18.379255	accebf8a-bacc-41fa-9601-ed39cb320a52
024b8fa9-15db-4519-a55d-a8d3e0109efb	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:27:36.581Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:27:36.78361	accebf8a-bacc-41fa-9601-ed39cb320a52
ec29f771-97c1-4ad8-9279-5a2a756c7661	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:27:36.914Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:27:37.108165	accebf8a-bacc-41fa-9601-ed39cb320a52
b7055fd3-9ed2-457b-b2db-6212416da2da	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	UPDATE guardias	admin@test.com	api	{"operacion":"UPDATE","datos_anteriores":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-05T01:57:37.813Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444"},"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:27:52.983Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444"},"timestamp":"2025-08-06T19:27:52.935Z"}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": null, "updated_at": "2025-08-05T01:57:37.813Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:27:52.983Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	2025-08-06 19:27:53.140796	accebf8a-bacc-41fa-9601-ed39cb320a52
427e0030-69e6-40c3-b71e-0f6d1fd78371	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	UPDATE guardias	admin@test.com	api	{"operacion":"UPDATE","datos_anteriores":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:27:52.983Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444"},"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:28:00.353Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444"},"timestamp":"2025-08-06T19:28:00.308Z"}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:27:52.983Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:28:00.353Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	2025-08-06 19:28:00.512502	accebf8a-bacc-41fa-9601-ed39cb320a52
60fdb8c7-7bd0-4c66-bf3e-c490f2ff108f	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:28:00.353Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:28:38.591Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:28:00.353Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:28:38.786626	accebf8a-bacc-41fa-9601-ed39cb320a52
75184231-b1c0-43d5-aa46-2ca0a9e2cab1	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:28:00.353Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:28:38.917Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:28:00.353Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:28:39.108372	accebf8a-bacc-41fa-9601-ed39cb320a52
9d1379ec-a1fd-48aa-88f7-562732df45f6	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:28:00.353Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:29:10.672Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:28:00.353Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:29:10.865447	accebf8a-bacc-41fa-9601-ed39cb320a52
85889274-2ade-44ad-ba82-3a690cf419f1	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:28:00.353Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:29:10.973Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:28:00.353Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:29:11.165473	accebf8a-bacc-41fa-9601-ed39cb320a52
dee31892-a704-4bde-9f10-43cd956ae1cf	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:28:00.353Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444","instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:34:22.486Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:28:00.353Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:34:22.683198	accebf8a-bacc-41fa-9601-ed39cb320a52
89db6190-e145-49fd-9cdb-62b6febd9082	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	UPDATE guardias	admin@test.com	api	{"operacion":"UPDATE","datos_anteriores":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:28:00.353Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CCT","numero_cuenta":"4444444"},"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:34:27.893Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-09-08T03:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null},"timestamp":"2025-08-06T19:34:27.857Z"}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "test@test.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:28:00.353Z", "usuario_id": null, "tipo_cuenta": "CCT", "nacionalidad": null, "numero_cuenta": "4444444", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-09-08T03:00:00.000Z", "updated_at": "2025-08-06T23:34:27.893Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	2025-08-06 19:34:28.046109	accebf8a-bacc-41fa-9601-ed39cb320a52
391ccd7c-08c1-4188-88f2-d98f2b4f910d	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:34:27.893Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-09-08T03:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:46:09.177Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-09-08T03:00:00.000Z", "updated_at": "2025-08-06T23:34:27.893Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:46:09.384496	accebf8a-bacc-41fa-9601-ed39cb320a52
0d025903-86ab-4c82-b4bf-efe7e496e8e4	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:34:27.893Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-09-08T03:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:46:09.535Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-09-08T03:00:00.000Z", "updated_at": "2025-08-06T23:34:27.893Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:46:09.736459	accebf8a-bacc-41fa-9601-ed39cb320a52
98791cae-5b71-481e-ac9c-1fffa2aaade0	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:34:27.893Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-09-08T03:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:46:27.633Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-09-08T03:00:00.000Z", "updated_at": "2025-08-06T23:34:27.893Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:46:27.833784	accebf8a-bacc-41fa-9601-ed39cb320a52
71adb165-c489-4b98-8076-778fe6cb56e4	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:34:27.893Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-09-08T03:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:46:27.991Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-09-08T03:00:00.000Z", "updated_at": "2025-08-06T23:34:27.893Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:46:28.196689	accebf8a-bacc-41fa-9601-ed39cb320a52
4fb315fa-b5c7-4576-8805-b7d88587b121	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:34:27.893Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-09-08T03:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:46:31.782Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-09-08T03:00:00.000Z", "updated_at": "2025-08-06T23:34:27.893Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:46:31.965441	accebf8a-bacc-41fa-9601-ed39cb320a52
fe941c81-1c67-4c3e-8934-2f4ce01ecd09	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:34:27.893Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-09-08T03:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:46:32.098Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-09-08T03:00:00.000Z", "updated_at": "2025-08-06T23:34:27.893Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:46:32.287441	accebf8a-bacc-41fa-9601-ed39cb320a52
f67bd515-03c9-4c2b-bc35-200f13e59835	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:34:27.893Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-09-08T03:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:46:35.430Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-09-08T03:00:00.000Z", "updated_at": "2025-08-06T23:34:27.893Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:46:35.617315	accebf8a-bacc-41fa-9601-ed39cb320a52
b7c0eaf6-30de-438b-bee4-f17cd6461d19	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:34:27.893Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-09-08T03:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:46:36.709Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-09-08T03:00:00.000Z", "updated_at": "2025-08-06T23:34:27.893Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:46:36.917057	accebf8a-bacc-41fa-9601-ed39cb320a52
dc38d756-723a-4d5e-ac99-09ca10abc249	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	UPDATE guardias	admin@test.com	api	{"operacion":"UPDATE","datos_anteriores":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:34:27.893Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-09-08T03:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null},"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:46:49.268Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null},"timestamp":"2025-08-06T19:46:49.230Z"}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-09-08T03:00:00.000Z", "updated_at": "2025-08-06T23:34:27.893Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:46:49.268Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	2025-08-06 19:46:49.44664	accebf8a-bacc-41fa-9601-ed39cb320a52
a9f8f6d6-5af8-4b66-b419-5912798f356f	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:46:49.268Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:46:49.646Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:46:49.268Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:46:49.85676	accebf8a-bacc-41fa-9601-ed39cb320a52
133c845c-f444-4273-9857-e6f54996b2ec	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:46:49.268Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:46:50.002Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:46:49.268Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:46:50.211332	accebf8a-bacc-41fa-9601-ed39cb320a52
f978ed3b-aedd-4192-8f15-1a3b07455f34	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:46:49.268Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:47:26.714Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:46:49.268Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:47:26.92436	accebf8a-bacc-41fa-9601-ed39cb320a52
d1cdbf21-dc64-4416-9d41-99dffcedc063	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:46:49.268Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:47:27.089Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:46:49.268Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:47:27.294359	accebf8a-bacc-41fa-9601-ed39cb320a52
851a3377-cd16-4676-b0cc-9b8cacf216d2	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:46:49.268Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:59:38.489Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:46:49.268Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:59:38.70386	accebf8a-bacc-41fa-9601-ed39cb320a52
9e8416ab-2594-40a7-9fe2-7a0c3f4eb2f4	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:46:49.268Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T19:59:38.871Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:46:49.268Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 19:59:39.081584	accebf8a-bacc-41fa-9601-ed39cb320a52
232a42a2-c753-4304-b72f-eab640319ad0	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:46:49.268Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T20:02:48.377Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:46:49.268Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 20:02:48.563099	accebf8a-bacc-41fa-9601-ed39cb320a52
816479c1-06e2-4c06-9f78-a3f66286da18	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:46:49.268Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T20:02:48.692Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:46:49.268Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 20:02:48.87408	accebf8a-bacc-41fa-9601-ed39cb320a52
5db4d828-dcb0-4182-b5bd-85b357f60182	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	UPDATE guardias	admin@test.com	api	{"operacion":"UPDATE","datos_anteriores":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-06T23:46:49.268Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-08T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null},"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null},"timestamp":"2025-08-06T20:03:18.975Z"}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-08T04:00:00.000Z", "updated_at": "2025-08-06T23:46:49.268Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false}	2025-08-06 20:03:19.163082	accebf8a-bacc-41fa-9601-ed39cb320a52
ebfa3982-5b96-4412-9810-9b578367ba9c	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T22:25:18.072Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 22:25:18.260191	accebf8a-bacc-41fa-9601-ed39cb320a52
f473213e-e10f-472f-97d9-541d185dca74	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T22:25:18.462Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 22:25:18.640375	accebf8a-bacc-41fa-9601-ed39cb320a52
d47b2b6b-6220-4082-8eed-5f470487a75a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T22:34:01.425Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 22:34:01.589141	accebf8a-bacc-41fa-9601-ed39cb320a52
632e4e2d-604b-4fff-a299-6875137eabf3	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T22:34:01.752Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 22:34:01.911725	accebf8a-bacc-41fa-9601-ed39cb320a52
89f1a4c6-da56-4c46-ad1f-502d20d4ae34	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T22:34:29.120Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 22:34:29.284613	accebf8a-bacc-41fa-9601-ed39cb320a52
feac64e7-d4eb-42f8-a0dc-2af5f71acef8	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T22:34:29.419Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 22:34:29.582965	accebf8a-bacc-41fa-9601-ed39cb320a52
5e7dc4de-e133-49d1-a5ac-e3378ee9fff0	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T22:58:40.491Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 22:58:40.707887	accebf8a-bacc-41fa-9601-ed39cb320a52
5119395d-a7ce-439d-b11f-a87c203f8b77	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T22:58:40.861Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 22:58:41.094097	accebf8a-bacc-41fa-9601-ed39cb320a52
868825d0-6cd3-4bc9-8bc3-9a6262787914	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T22:59:00.382Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 22:59:00.579223	accebf8a-bacc-41fa-9601-ed39cb320a52
09d62d2a-119a-46b1-ada0-51345e6f9832	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-06T22:59:00.721Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-06 22:59:00.920268	accebf8a-bacc-41fa-9601-ed39cb320a52
eddf955b-f03e-4010-a76b-635da665ffbf	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T03:01:08.907Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 03:01:09.091253	accebf8a-bacc-41fa-9601-ed39cb320a52
1f099e88-35e7-4ea0-bc5e-61dbfa23e58c	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T03:01:09.284Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 03:01:09.467878	accebf8a-bacc-41fa-9601-ed39cb320a52
969731dd-c437-427f-b8f9-f29c9a10ff5f	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T03:01:24.821Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 03:01:25.007364	accebf8a-bacc-41fa-9601-ed39cb320a52
b2cf66ed-ca4b-4ab7-9d98-cd2af629c957	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T03:01:25.176Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 03:01:25.362731	accebf8a-bacc-41fa-9601-ed39cb320a52
68570645-f159-4e89-8c76-f549472c9dea	d8083f2a-d246-4ec1-9c77-d92d8bde496b	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"d8083f2a-d246-4ec1-9c77-d92d8bde496b","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"ADRIAN GABRIEL","email":"colina02caldera@gmail.com","telefono":"940651347","activo":true,"created_at":"2025-07-28T05:27:43.811Z","usuario_id":null,"updated_at":"2025-08-02T21:04:14.058Z","latitud":"-33.40637232","longitud":"-70.73104611","ciudad":"Santiago","comuna":"Santiago","region":null,"rut":"26313985-2","apellido_paterno":"COLINA","apellido_materno":"CALDERA","nacionalidad":"VENEZOLANA","sexo":"Hombre","direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2027-11-14T03:00:00.000Z","created_from_excel":false,"instalacion_id":"b28aecde-b43d-4d98-9cff-93640ca14aed","banco":"eaf03a6a-c53a-43b5-8eda-80f0c44cef40","tipo_cuenta":"CTE","numero_cuenta":"15200175047","instalacion_nombre":"JugaBet","cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:02:50.992Z"}	\N	{"id": "d8083f2a-d246-4ec1-9c77-d92d8bde496b", "rut": "26313985-2", "sexo": "Hombre", "banco": "eaf03a6a-c53a-43b5-8eda-80f0c44cef40", "email": "colina02caldera@gmail.com", "activo": true, "ciudad": "Santiago", "comuna": "Santiago", "nombre": "ADRIAN GABRIEL", "region": null, "latitud": "-33.40637232", "longitud": "-70.73104611", "telefono": "940651347", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-28T05:27:43.811Z", "fecha_os10": "2027-11-14T03:00:00.000Z", "updated_at": "2025-08-02T21:04:14.058Z", "usuario_id": null, "tipo_cuenta": "CTE", "nacionalidad": "VENEZOLANA", "numero_cuenta": "15200175047", "cliente_nombre": "Cliente no encontrado", "instalacion_id": "b28aecde-b43d-4d98-9cff-93640ca14aed", "apellido_materno": "CALDERA", "apellido_paterno": "COLINA", "created_from_excel": false, "instalacion_nombre": "JugaBet"}	2025-08-07 03:02:51.15314	accebf8a-bacc-41fa-9601-ed39cb320a52
362e5fab-4ed6-4f3e-b34c-60afe8c9ef82	d8083f2a-d246-4ec1-9c77-d92d8bde496b	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"d8083f2a-d246-4ec1-9c77-d92d8bde496b","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"ADRIAN GABRIEL","email":"colina02caldera@gmail.com","telefono":"940651347","activo":true,"created_at":"2025-07-28T05:27:43.811Z","usuario_id":null,"updated_at":"2025-08-02T21:04:14.058Z","latitud":"-33.40637232","longitud":"-70.73104611","ciudad":"Santiago","comuna":"Santiago","region":null,"rut":"26313985-2","apellido_paterno":"COLINA","apellido_materno":"CALDERA","nacionalidad":"VENEZOLANA","sexo":"Hombre","direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2027-11-14T03:00:00.000Z","created_from_excel":false,"instalacion_id":"b28aecde-b43d-4d98-9cff-93640ca14aed","banco":"eaf03a6a-c53a-43b5-8eda-80f0c44cef40","tipo_cuenta":"CTE","numero_cuenta":"15200175047","instalacion_nombre":"JugaBet","cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:02:51.309Z"}	\N	{"id": "d8083f2a-d246-4ec1-9c77-d92d8bde496b", "rut": "26313985-2", "sexo": "Hombre", "banco": "eaf03a6a-c53a-43b5-8eda-80f0c44cef40", "email": "colina02caldera@gmail.com", "activo": true, "ciudad": "Santiago", "comuna": "Santiago", "nombre": "ADRIAN GABRIEL", "region": null, "latitud": "-33.40637232", "longitud": "-70.73104611", "telefono": "940651347", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-28T05:27:43.811Z", "fecha_os10": "2027-11-14T03:00:00.000Z", "updated_at": "2025-08-02T21:04:14.058Z", "usuario_id": null, "tipo_cuenta": "CTE", "nacionalidad": "VENEZOLANA", "numero_cuenta": "15200175047", "cliente_nombre": "Cliente no encontrado", "instalacion_id": "b28aecde-b43d-4d98-9cff-93640ca14aed", "apellido_materno": "CALDERA", "apellido_paterno": "COLINA", "created_from_excel": false, "instalacion_nombre": "JugaBet"}	2025-08-07 03:02:51.463527	accebf8a-bacc-41fa-9601-ed39cb320a52
5394c03a-4a0d-4faf-ab96-d62a8b9b2a18	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:02:56.657Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:02:56.815124	accebf8a-bacc-41fa-9601-ed39cb320a52
7b7c4047-47bd-49d5-b462-66c39ec710ad	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:02:56.959Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:02:57.114264	accebf8a-bacc-41fa-9601-ed39cb320a52
2fbd9b33-6f3a-4965-ac06-7b3b8c7cbc03	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T03:14:46.943Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 03:14:47.135263	accebf8a-bacc-41fa-9601-ed39cb320a52
f388b0ff-e141-47ba-a2df-d324764bb4d0	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T03:14:47.326Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 03:14:47.510217	accebf8a-bacc-41fa-9601-ed39cb320a52
5942aab3-717e-48df-a94d-c83608e88461	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:14:58.396Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:14:58.580835	accebf8a-bacc-41fa-9601-ed39cb320a52
87e872e1-5c7a-44b7-97f5-daaf6c2ded59	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:14:58.688Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:14:58.877467	accebf8a-bacc-41fa-9601-ed39cb320a52
3f58386c-5d77-4c1e-8826-1143e4bd7710	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:19:23.096Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:19:23.281533	accebf8a-bacc-41fa-9601-ed39cb320a52
e12a6ba4-b525-413e-a27b-8a028ccf9ed6	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:19:23.438Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:19:23.626156	accebf8a-bacc-41fa-9601-ed39cb320a52
5e7208bf-adb0-4781-8b50-5066bc081699	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:20:58.063Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:20:58.280586	accebf8a-bacc-41fa-9601-ed39cb320a52
47c17500-7400-4b3d-b079-324f61847e15	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:20:58.463Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:20:58.680468	accebf8a-bacc-41fa-9601-ed39cb320a52
3cf10482-27e5-4591-ac47-d15ae43737fb	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:21:22.841Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:21:23.027242	accebf8a-bacc-41fa-9601-ed39cb320a52
ec7e1af1-cf70-499b-ace9-c8a6647750c9	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:21:23.168Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:21:23.360336	accebf8a-bacc-41fa-9601-ed39cb320a52
549cb8e4-2fda-4800-a579-de76824ddd0d	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:22:39.765Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:22:39.92345	accebf8a-bacc-41fa-9601-ed39cb320a52
9947eb88-18cc-499a-a04d-72a7244ed6a3	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:22:40.095Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:22:40.256452	accebf8a-bacc-41fa-9601-ed39cb320a52
f4a5da53-887e-46d9-97ab-bc354067704c	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:27:38.372Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:27:38.559086	accebf8a-bacc-41fa-9601-ed39cb320a52
253cea24-55ff-4ff0-be17-b05b83bdff82	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:27:38.747Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:27:38.928926	accebf8a-bacc-41fa-9601-ed39cb320a52
06b48cc0-28c9-4880-8235-d72c6e7e59ca	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:38:28.137Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:38:28.297177	accebf8a-bacc-41fa-9601-ed39cb320a52
576c60cc-754a-4c05-b159-46ea27867a4b	55e48627-6dc6-4052-876e-d52f27601e2a	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"55e48627-6dc6-4052-876e-d52f27601e2a","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 2","email":"cl@cl.cl","telefono":"982307771","activo":true,"created_at":"2025-07-31T08:46:11.503Z","usuario_id":null,"updated_at":"2025-08-02T04:42:33.956Z","latitud":"-33.36332430","longitud":"-70.51511800","ciudad":"Región Metropolitana","comuna":"Chile","region":null,"rut":"13255838-8","apellido_paterno":"test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T03:38:28.482Z"}	\N	{"id": "55e48627-6dc6-4052-876e-d52f27601e2a", "rut": "13255838-8", "sexo": null, "banco": null, "email": "cl@cl.cl", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Chile", "nombre": "A Test 2", "region": null, "latitud": "-33.36332430", "longitud": "-70.51511800", "telefono": "982307771", "direccion": "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:46:11.503Z", "fecha_os10": null, "updated_at": "2025-08-02T04:42:33.956Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 03:38:28.664055	accebf8a-bacc-41fa-9601-ed39cb320a52
f60305d0-20f8-4c58-b6ef-4a33da2df2d0	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T03:38:58.778Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 03:38:58.941081	accebf8a-bacc-41fa-9601-ed39cb320a52
ca39c94e-19f1-4ac0-a749-5830c1a83510	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T03:38:59.103Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 03:38:59.258096	accebf8a-bacc-41fa-9601-ed39cb320a52
7d373e11-c353-4956-a2e9-052c78fcfb6a	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T03:47:00.430Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 03:47:00.591259	accebf8a-bacc-41fa-9601-ed39cb320a52
3967a14d-f2be-4de0-a35d-108f7b5740e6	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T03:47:00.765Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 03:47:00.923175	accebf8a-bacc-41fa-9601-ed39cb320a52
e2e5d83f-bee6-42c6-9e98-c1b859355c53	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 04:41:15.447541	\N
3945f7b3-3819-4423-81cd-616e571f517a	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 04:51:05.767436	\N
1f5a7bd5-7792-42a9-a25a-99380f0ad66b	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 04:56:10.145843	\N
1f082737-675b-4e61-8974-403e097dea4d	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 15:40:10.457113	\N
3822ce45-dea1-4867-a69f-272498109b2d	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 15:48:25.680137	\N
6f233d04-3f94-423c-ad02-bc4f4329b7e7	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 15:49:49.494565	\N
c90cbb06-c686-4931-978b-e26718a4fdf1	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 17:36:28.292638	\N
4749809d-ae28-4621-9408-cde8d8357d13	817d21b0-d5ef-4438-8adf-6258585b23a3	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"817d21b0-d5ef-4438-8adf-6258585b23a3","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"Test Modal","email":"test.modal@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:42:09.165Z","usuario_id":null,"updated_at":"2025-08-06T23:44:50.584Z","latitud":null,"longitud":null,"ciudad":null,"comuna":null,"region":null,"rut":"11222333-4","apellido_paterno":"Guardia Test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":null,"fecha_os10":"2025-08-21T04:00:00.000Z","created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T21:53:28.613Z"}	\N	{"id": "817d21b0-d5ef-4438-8adf-6258585b23a3", "rut": "11222333-4", "sexo": null, "banco": null, "email": "test.modal@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "Test Modal", "region": null, "latitud": null, "longitud": null, "telefono": "+56912345678", "direccion": null, "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:42:09.165Z", "fecha_os10": "2025-08-21T04:00:00.000Z", "updated_at": "2025-08-06T23:44:50.584Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "Guardia Test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 21:53:28.782646	accebf8a-bacc-41fa-9601-ed39cb320a52
4f0742dd-de66-4501-b045-8f41b64b5c99	817d21b0-d5ef-4438-8adf-6258585b23a3	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"817d21b0-d5ef-4438-8adf-6258585b23a3","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"Test Modal","email":"test.modal@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:42:09.165Z","usuario_id":null,"updated_at":"2025-08-06T23:44:50.584Z","latitud":null,"longitud":null,"ciudad":null,"comuna":null,"region":null,"rut":"11222333-4","apellido_paterno":"Guardia Test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":null,"fecha_os10":"2025-08-21T04:00:00.000Z","created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T21:53:28.916Z"}	\N	{"id": "817d21b0-d5ef-4438-8adf-6258585b23a3", "rut": "11222333-4", "sexo": null, "banco": null, "email": "test.modal@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "Test Modal", "region": null, "latitud": null, "longitud": null, "telefono": "+56912345678", "direccion": null, "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:42:09.165Z", "fecha_os10": "2025-08-21T04:00:00.000Z", "updated_at": "2025-08-06T23:44:50.584Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "Guardia Test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 21:53:29.084907	accebf8a-bacc-41fa-9601-ed39cb320a52
16dc23a7-c3b9-45d0-9ffa-3a39757848ae	61b590f3-890e-48e9-94f6-e43b4d6db536	CREATE guardias	admin@test.com	api	{"operacion":"CREATE","datos_anteriores":null,"datos_nuevos":{"id":"61b590f3-890e-48e9-94f6-e43b4d6db536","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"Test","email":"test2@test.com","telefono":"123456789","activo":true,"created_at":"2025-08-08T01:58:50.830Z","usuario_id":null,"updated_at":"2025-08-08T01:58:50.830Z","latitud":null,"longitud":null,"ciudad":"Santiago","comuna":"Santiago","region":null,"rut":"11111111-1","apellido_paterno":"Usuario","apellido_materno":"Prueba","nacionalidad":null,"sexo":null,"direccion":"Test 123","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null},"timestamp":"2025-08-07T21:58:50.803Z"}	\N	{"id": "61b590f3-890e-48e9-94f6-e43b4d6db536", "rut": "11111111-1", "sexo": null, "banco": null, "email": "test2@test.com", "activo": true, "ciudad": "Santiago", "comuna": "Santiago", "nombre": "Test", "region": null, "latitud": null, "longitud": null, "telefono": "123456789", "direccion": "Test 123", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-08-08T01:58:50.830Z", "fecha_os10": null, "updated_at": "2025-08-08T01:58:50.830Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "instalacion_id": null, "apellido_materno": "Prueba", "apellido_paterno": "Usuario", "created_from_excel": false}	2025-08-07 21:58:50.968125	accebf8a-bacc-41fa-9601-ed39cb320a52
8fbf2ddb-24c2-4695-80c2-17a0637c6373	34df05fb-d5a9-4fc8-99ab-d55472189561	CREATE guardias	admin@test.com	api	{"operacion":"CREATE","datos_anteriores":null,"datos_nuevos":{"id":"34df05fb-d5a9-4fc8-99ab-d55472189561","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"Prueba","email":"a3@a.com","telefono":"912345678","activo":true,"created_at":"2025-08-08T02:08:57.045Z","usuario_id":null,"updated_at":"2025-08-08T02:08:57.045Z","latitud":"-33.41000000","longitud":"-70.61000000","ciudad":"Santiago","comuna":"Santiago","region":null,"rut":"33333333-3","apellido_paterno":"Apellido","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av Test 123","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":"343c27ef-2988-4a86-919e-cf306e5c123d","tipo_cuenta":"CTE","numero_cuenta":"123"},"timestamp":"2025-08-07T22:08:56.980Z"}	\N	{"id": "34df05fb-d5a9-4fc8-99ab-d55472189561", "rut": "33333333-3", "sexo": null, "banco": "343c27ef-2988-4a86-919e-cf306e5c123d", "email": "a3@a.com", "activo": true, "ciudad": "Santiago", "comuna": "Santiago", "nombre": "Prueba", "region": null, "latitud": "-33.41000000", "longitud": "-70.61000000", "telefono": "912345678", "direccion": "Av Test 123", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-08-08T02:08:57.045Z", "fecha_os10": null, "updated_at": "2025-08-08T02:08:57.045Z", "usuario_id": null, "tipo_cuenta": "CTE", "nacionalidad": null, "numero_cuenta": "123", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "Apellido", "created_from_excel": false}	2025-08-07 22:08:57.180048	accebf8a-bacc-41fa-9601-ed39cb320a52
73f590b8-63d0-4df1-89cb-6266a7f16d4a	e10bdac4-feed-48b8-a672-5ff975b1917e	CREATE guardias	admin@test.com	api	{"operacion":"CREATE","datos_anteriores":null,"datos_nuevos":{"id":"e10bdac4-feed-48b8-a672-5ff975b1917e","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"Alberto","email":"betostein89@gmail.com","telefono":"975279788","activo":true,"created_at":"2025-08-08T02:13:35.619Z","usuario_id":null,"updated_at":"2025-08-08T02:13:35.619Z","latitud":"-33.42000000","longitud":"-70.61000000","ciudad":"RM","comuna":"Santiago","region":null,"rut":"17596441-k","apellido_paterno":"Stein","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"dir","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":"9aaa69ff-8981-4534-b8cf-bb3888cfc3f1","tipo_cuenta":"CTE","numero_cuenta":"177120269"},"timestamp":"2025-08-07T22:13:35.552Z"}	\N	{"id": "e10bdac4-feed-48b8-a672-5ff975b1917e", "rut": "17596441-k", "sexo": null, "banco": "9aaa69ff-8981-4534-b8cf-bb3888cfc3f1", "email": "betostein89@gmail.com", "activo": true, "ciudad": "RM", "comuna": "Santiago", "nombre": "Alberto", "region": null, "latitud": "-33.42000000", "longitud": "-70.61000000", "telefono": "975279788", "direccion": "dir", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-08-08T02:13:35.619Z", "fecha_os10": null, "updated_at": "2025-08-08T02:13:35.619Z", "usuario_id": null, "tipo_cuenta": "CTE", "nacionalidad": null, "numero_cuenta": "177120269", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "Stein", "created_from_excel": false}	2025-08-07 22:13:35.753493	accebf8a-bacc-41fa-9601-ed39cb320a52
16e94ef8-8e2b-4402-82d0-27af0ba23e75	0b8d30b4-ad1d-41af-bc16-565498ec6230	CREATE guardias	admin@test.com	api	{"operacion":"CREATE","datos_anteriores":null,"datos_nuevos":{"id":"0b8d30b4-ad1d-41af-bc16-565498ec6230","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"Test","email":"nuevo@email.com","telefono":"123456789","activo":true,"created_at":"2025-08-08T02:25:25.185Z","usuario_id":null,"updated_at":"2025-08-08T02:25:25.185Z","latitud":"-33.40000000","longitud":"-70.60000000","ciudad":"Región Metropolitana","comuna":"Providencia","region":null,"rut":"24706330-7","apellido_paterno":"Usuario","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Carlos Antúnez 1831, Providencia, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null},"timestamp":"2025-08-07T22:25:25.140Z"}	\N	{"id": "0b8d30b4-ad1d-41af-bc16-565498ec6230", "rut": "24706330-7", "sexo": null, "banco": null, "email": "nuevo@email.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Providencia", "nombre": "Test", "region": null, "latitud": "-33.40000000", "longitud": "-70.60000000", "telefono": "123456789", "direccion": "Carlos Antúnez 1831, Providencia, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-08-08T02:25:25.185Z", "fecha_os10": null, "updated_at": "2025-08-08T02:25:25.185Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "Usuario", "created_from_excel": false}	2025-08-07 22:25:25.324541	accebf8a-bacc-41fa-9601-ed39cb320a52
c26075b0-c6a4-40ae-bdd3-bf89a15b03d9	357f0f00-ffcb-46af-8aea-ec1fc62fa69d	CREATE guardias	admin@test.com	api	{"operacion":"CREATE","datos_anteriores":null,"datos_nuevos":{"id":"357f0f00-ffcb-46af-8aea-ec1fc62fa69d","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"Test2","email":"test2@email.com","telefono":"123456789","activo":true,"created_at":"2025-08-08T02:25:29.791Z","usuario_id":null,"updated_at":"2025-08-08T02:25:29.791Z","latitud":"-33.40000000","longitud":"-70.60000000","ciudad":"Región Metropolitana","comuna":"Las Condes","region":null,"rut":"24706331-5","apellido_paterno":"Usuario","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. Apoquindo 4501, Las Condes, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":null,"tipo_cuenta":null,"numero_cuenta":null},"timestamp":"2025-08-07T22:25:29.741Z"}	\N	{"id": "357f0f00-ffcb-46af-8aea-ec1fc62fa69d", "rut": "24706331-5", "sexo": null, "banco": null, "email": "test2@email.com", "activo": true, "ciudad": "Región Metropolitana", "comuna": "Las Condes", "nombre": "Test2", "region": null, "latitud": "-33.40000000", "longitud": "-70.60000000", "telefono": "123456789", "direccion": "Av. Apoquindo 4501, Las Condes, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-08-08T02:25:29.791Z", "fecha_os10": null, "updated_at": "2025-08-08T02:25:29.791Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "Usuario", "created_from_excel": false}	2025-08-07 22:25:29.925816	accebf8a-bacc-41fa-9601-ed39cb320a52
52539231-39f5-4c1e-83e4-d7d5c3be35a9	4d969e50-67fc-42ea-92f8-4b0ec6e263eb	CREATE guardias	admin@test.com	api	{"operacion":"CREATE","datos_anteriores":null,"datos_nuevos":{"id":"4d969e50-67fc-42ea-92f8-4b0ec6e263eb","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 3","email":"pl@cl.cl","telefono":"993456789","activo":true,"created_at":"2025-08-08T02:32:42.721Z","usuario_id":null,"updated_at":"2025-08-08T02:32:42.721Z","latitud":"-33.36327920","longitud":"-70.51481440","ciudad":"Santiago","comuna":"Lo Barnechea","region":null,"rut":"24706328-5","apellido_paterno":"Test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 333, 7690491 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":"413ca99e-71dc-4d2b-9d8d-f1417747ffaf","tipo_cuenta":"CTE","numero_cuenta":"345335434"},"timestamp":"2025-08-07T22:32:42.671Z"}	\N	{"id": "4d969e50-67fc-42ea-92f8-4b0ec6e263eb", "rut": "24706328-5", "sexo": null, "banco": "413ca99e-71dc-4d2b-9d8d-f1417747ffaf", "email": "pl@cl.cl", "activo": true, "ciudad": "Santiago", "comuna": "Lo Barnechea", "nombre": "A Test 3", "region": null, "latitud": "-33.36327920", "longitud": "-70.51481440", "telefono": "993456789", "direccion": "Av. La Dehesa 333, 7690491 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-08-08T02:32:42.721Z", "fecha_os10": null, "updated_at": "2025-08-08T02:32:42.721Z", "usuario_id": null, "tipo_cuenta": "CTE", "nacionalidad": null, "numero_cuenta": "345335434", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "Test", "created_from_excel": false}	2025-08-07 22:32:42.859056	accebf8a-bacc-41fa-9601-ed39cb320a52
1639426e-0e78-484f-8dae-9f0adb1e0bd0	4d969e50-67fc-42ea-92f8-4b0ec6e263eb	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"4d969e50-67fc-42ea-92f8-4b0ec6e263eb","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 3","email":"pl@cl.cl","telefono":"993456789","activo":true,"created_at":"2025-08-08T02:32:42.721Z","usuario_id":null,"updated_at":"2025-08-08T02:32:42.721Z","latitud":"-33.36327920","longitud":"-70.51481440","ciudad":"Santiago","comuna":"Lo Barnechea","region":null,"rut":"24706328-5","apellido_paterno":"Test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 333, 7690491 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":"413ca99e-71dc-4d2b-9d8d-f1417747ffaf","tipo_cuenta":"CTE","numero_cuenta":"345335434","instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T22:35:57.152Z"}	\N	{"id": "4d969e50-67fc-42ea-92f8-4b0ec6e263eb", "rut": "24706328-5", "sexo": null, "banco": "413ca99e-71dc-4d2b-9d8d-f1417747ffaf", "email": "pl@cl.cl", "activo": true, "ciudad": "Santiago", "comuna": "Lo Barnechea", "nombre": "A Test 3", "region": null, "latitud": "-33.36327920", "longitud": "-70.51481440", "telefono": "993456789", "direccion": "Av. La Dehesa 333, 7690491 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-08-08T02:32:42.721Z", "fecha_os10": null, "updated_at": "2025-08-08T02:32:42.721Z", "usuario_id": null, "tipo_cuenta": "CTE", "nacionalidad": null, "numero_cuenta": "345335434", "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "Test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 22:35:57.337798	accebf8a-bacc-41fa-9601-ed39cb320a52
a169582e-9dbb-42bd-8c08-f69196259aff	4d969e50-67fc-42ea-92f8-4b0ec6e263eb	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"4d969e50-67fc-42ea-92f8-4b0ec6e263eb","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 3","email":"pl@cl.cl","telefono":"993456789","activo":true,"created_at":"2025-08-08T02:32:42.721Z","usuario_id":null,"updated_at":"2025-08-08T02:32:42.721Z","latitud":"-33.36327920","longitud":"-70.51481440","ciudad":"Santiago","comuna":"Lo Barnechea","region":null,"rut":"24706328-5","apellido_paterno":"Test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 333, 7690491 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":"413ca99e-71dc-4d2b-9d8d-f1417747ffaf","tipo_cuenta":"CTE","numero_cuenta":"345335434","instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T22:35:57.449Z"}	\N	{"id": "4d969e50-67fc-42ea-92f8-4b0ec6e263eb", "rut": "24706328-5", "sexo": null, "banco": "413ca99e-71dc-4d2b-9d8d-f1417747ffaf", "email": "pl@cl.cl", "activo": true, "ciudad": "Santiago", "comuna": "Lo Barnechea", "nombre": "A Test 3", "region": null, "latitud": "-33.36327920", "longitud": "-70.51481440", "telefono": "993456789", "direccion": "Av. La Dehesa 333, 7690491 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-08-08T02:32:42.721Z", "fecha_os10": null, "updated_at": "2025-08-08T02:32:42.721Z", "usuario_id": null, "tipo_cuenta": "CTE", "nacionalidad": null, "numero_cuenta": "345335434", "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "Test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 22:35:57.634809	accebf8a-bacc-41fa-9601-ed39cb320a52
0c64cfe5-4902-45e3-aef0-91b011aca53b	4d969e50-67fc-42ea-92f8-4b0ec6e263eb	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"4d969e50-67fc-42ea-92f8-4b0ec6e263eb","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 3","email":"pl@cl.cl","telefono":"993456789","activo":true,"created_at":"2025-08-08T02:32:42.721Z","usuario_id":null,"updated_at":"2025-08-08T02:32:42.721Z","latitud":"-33.36327920","longitud":"-70.51481440","ciudad":"Santiago","comuna":"Lo Barnechea","region":null,"rut":"24706328-5","apellido_paterno":"Test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 333, 7690491 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":"413ca99e-71dc-4d2b-9d8d-f1417747ffaf","tipo_cuenta":"CTE","numero_cuenta":"345335434","instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T22:36:07.781Z"}	\N	{"id": "4d969e50-67fc-42ea-92f8-4b0ec6e263eb", "rut": "24706328-5", "sexo": null, "banco": "413ca99e-71dc-4d2b-9d8d-f1417747ffaf", "email": "pl@cl.cl", "activo": true, "ciudad": "Santiago", "comuna": "Lo Barnechea", "nombre": "A Test 3", "region": null, "latitud": "-33.36327920", "longitud": "-70.51481440", "telefono": "993456789", "direccion": "Av. La Dehesa 333, 7690491 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-08-08T02:32:42.721Z", "fecha_os10": null, "updated_at": "2025-08-08T02:32:42.721Z", "usuario_id": null, "tipo_cuenta": "CTE", "nacionalidad": null, "numero_cuenta": "345335434", "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "Test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 22:36:07.959213	accebf8a-bacc-41fa-9601-ed39cb320a52
73746da5-5488-43ad-a144-73067cf01cc9	4d969e50-67fc-42ea-92f8-4b0ec6e263eb	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"4d969e50-67fc-42ea-92f8-4b0ec6e263eb","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test 3","email":"pl@cl.cl","telefono":"993456789","activo":true,"created_at":"2025-08-08T02:32:42.721Z","usuario_id":null,"updated_at":"2025-08-08T02:32:42.721Z","latitud":"-33.36327920","longitud":"-70.51481440","ciudad":"Santiago","comuna":"Lo Barnechea","region":null,"rut":"24706328-5","apellido_paterno":"Test","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 333, 7690491 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":null,"created_from_excel":false,"instalacion_id":null,"banco":"413ca99e-71dc-4d2b-9d8d-f1417747ffaf","tipo_cuenta":"CTE","numero_cuenta":"345335434","instalacion_nombre":null,"cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T22:36:08.064Z"}	\N	{"id": "4d969e50-67fc-42ea-92f8-4b0ec6e263eb", "rut": "24706328-5", "sexo": null, "banco": "413ca99e-71dc-4d2b-9d8d-f1417747ffaf", "email": "pl@cl.cl", "activo": true, "ciudad": "Santiago", "comuna": "Lo Barnechea", "nombre": "A Test 3", "region": null, "latitud": "-33.36327920", "longitud": "-70.51481440", "telefono": "993456789", "direccion": "Av. La Dehesa 333, 7690491 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-08-08T02:32:42.721Z", "fecha_os10": null, "updated_at": "2025-08-08T02:32:42.721Z", "usuario_id": null, "tipo_cuenta": "CTE", "nacionalidad": null, "numero_cuenta": "345335434", "cliente_nombre": "Cliente no encontrado", "instalacion_id": null, "apellido_materno": "", "apellido_paterno": "Test", "created_from_excel": false, "instalacion_nombre": null}	2025-08-07 22:36:08.242038	accebf8a-bacc-41fa-9601-ed39cb320a52
eea39a7a-c59c-49fb-9f60-be830c8f38d9	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T22:36:10.680Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 22:36:10.85645	accebf8a-bacc-41fa-9601-ed39cb320a52
66af8b38-07c5-442d-a3cd-ad7dfe6e5801	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T22:36:11.411Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 22:36:11.589416	accebf8a-bacc-41fa-9601-ed39cb320a52
ef62b219-a3e9-4bd7-8792-f3f6675d0b82	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T22:36:41.267Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 22:36:41.437396	accebf8a-bacc-41fa-9601-ed39cb320a52
b14d7c9c-251f-42fb-9766-b4af843e40e0	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T22:36:41.558Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 22:36:41.728591	accebf8a-bacc-41fa-9601-ed39cb320a52
62587d82-e65f-49a6-ae00-aaed84a7b3ce	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T22:37:44.950Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 22:37:45.123915	accebf8a-bacc-41fa-9601-ed39cb320a52
ca2ffd79-e907-4f81-b045-c495bbcfc783	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-07T22:37:45.694Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-07 22:37:45.864561	accebf8a-bacc-41fa-9601-ed39cb320a52
84ff4e34-20d5-4575-8e54-b14bbdbd9607	4f1aca0f-a793-4889-b48a-0e1ee4612868	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"4f1aca0f-a793-4889-b48a-0e1ee4612868","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"Aaron Fernando","email":"aaron.f.aguilera.toro@gmail.com","telefono":"935243947","activo":true,"created_at":"2025-07-28T05:28:02.851Z","usuario_id":null,"updated_at":"2025-08-02T21:04:03.778Z","latitud":"-33.54825000","longitud":"-70.61598477","ciudad":"Santiago","comuna":"Santiago","region":null,"rut":"17385726-8","apellido_paterno":"Aguilera","apellido_materno":"Toro","nacionalidad":"CHILENA","sexo":"Hombre","direccion":"Calle socos 9224","fecha_os10":"2026-10-23T03:00:00.000Z","created_from_excel":false,"instalacion_id":"254b6b4a-6d74-4f1a-a1ca-d3e23960998c","banco":"756a508e-948c-40d4-b675-ce4e1a16daf1","tipo_cuenta":"CTA","numero_cuenta":"17385726","instalacion_nombre":"Condominio La Florida","cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T22:40:41.101Z"}	\N	{"id": "4f1aca0f-a793-4889-b48a-0e1ee4612868", "rut": "17385726-8", "sexo": "Hombre", "banco": "756a508e-948c-40d4-b675-ce4e1a16daf1", "email": "aaron.f.aguilera.toro@gmail.com", "activo": true, "ciudad": "Santiago", "comuna": "Santiago", "nombre": "Aaron Fernando", "region": null, "latitud": "-33.54825000", "longitud": "-70.61598477", "telefono": "935243947", "direccion": "Calle socos 9224", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-28T05:28:02.851Z", "fecha_os10": "2026-10-23T03:00:00.000Z", "updated_at": "2025-08-02T21:04:03.778Z", "usuario_id": null, "tipo_cuenta": "CTA", "nacionalidad": "CHILENA", "numero_cuenta": "17385726", "cliente_nombre": "Cliente no encontrado", "instalacion_id": "254b6b4a-6d74-4f1a-a1ca-d3e23960998c", "apellido_materno": "Toro", "apellido_paterno": "Aguilera", "created_from_excel": false, "instalacion_nombre": "Condominio La Florida"}	2025-08-07 22:40:41.278372	accebf8a-bacc-41fa-9601-ed39cb320a52
a5e376e5-9f36-4943-a1eb-c4df8eb3ed51	4f1aca0f-a793-4889-b48a-0e1ee4612868	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"4f1aca0f-a793-4889-b48a-0e1ee4612868","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"Aaron Fernando","email":"aaron.f.aguilera.toro@gmail.com","telefono":"935243947","activo":true,"created_at":"2025-07-28T05:28:02.851Z","usuario_id":null,"updated_at":"2025-08-02T21:04:03.778Z","latitud":"-33.54825000","longitud":"-70.61598477","ciudad":"Santiago","comuna":"Santiago","region":null,"rut":"17385726-8","apellido_paterno":"Aguilera","apellido_materno":"Toro","nacionalidad":"CHILENA","sexo":"Hombre","direccion":"Calle socos 9224","fecha_os10":"2026-10-23T03:00:00.000Z","created_from_excel":false,"instalacion_id":"254b6b4a-6d74-4f1a-a1ca-d3e23960998c","banco":"756a508e-948c-40d4-b675-ce4e1a16daf1","tipo_cuenta":"CTA","numero_cuenta":"17385726","instalacion_nombre":"Condominio La Florida","cliente_nombre":"Cliente no encontrado"},"timestamp":"2025-08-07T22:40:41.100Z"}	\N	{"id": "4f1aca0f-a793-4889-b48a-0e1ee4612868", "rut": "17385726-8", "sexo": "Hombre", "banco": "756a508e-948c-40d4-b675-ce4e1a16daf1", "email": "aaron.f.aguilera.toro@gmail.com", "activo": true, "ciudad": "Santiago", "comuna": "Santiago", "nombre": "Aaron Fernando", "region": null, "latitud": "-33.54825000", "longitud": "-70.61598477", "telefono": "935243947", "direccion": "Calle socos 9224", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-28T05:28:02.851Z", "fecha_os10": "2026-10-23T03:00:00.000Z", "updated_at": "2025-08-02T21:04:03.778Z", "usuario_id": null, "tipo_cuenta": "CTA", "nacionalidad": "CHILENA", "numero_cuenta": "17385726", "cliente_nombre": "Cliente no encontrado", "instalacion_id": "254b6b4a-6d74-4f1a-a1ca-d3e23960998c", "apellido_materno": "Toro", "apellido_paterno": "Aguilera", "created_from_excel": false, "instalacion_nombre": "Condominio La Florida"}	2025-08-07 22:40:41.282032	accebf8a-bacc-41fa-9601-ed39cb320a52
1fb10cf6-2b6b-4d8e-90d6-aa7147b58b8e	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 22:42:39.593437	\N
d21f1d84-8c4d-4ab7-92d6-1354db448b1d	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 23:14:18.862767	\N
09b53573-fbff-4fdd-bb1a-08f9f1c6a441	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-08 03:36:32.091894	\N
a9a0a2b5-fe72-49d7-9aab-74ecea55026e	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-08 04:16:08.720202	\N
8de73c02-3399-475a-9876-9f46253c7b2e	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-08T04:59:12.470Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-08 04:59:12.574679	accebf8a-bacc-41fa-9601-ed39cb320a52
eeff2a6c-cc7e-4587-9600-2e6706887119	7c84d4ad-dcb2-40f9-9d03-b7d1bf673220	READ guardias	admin@test.com	api	{"operacion":"READ","datos_anteriores":null,"datos_nuevos":{"id":"7c84d4ad-dcb2-40f9-9d03-b7d1bf673220","tenant_id":"accebf8a-bacc-41fa-9601-ed39cb320a52","nombre":"A Test","email":"test@test.com","telefono":"+56912345678","activo":true,"created_at":"2025-07-31T08:33:14.445Z","usuario_id":null,"updated_at":"2025-08-07T00:03:19.019Z","latitud":"-33.36405540","longitud":"-70.51478340","ciudad":null,"comuna":null,"region":null,"rut":"12345678-0","apellido_paterno":"Guardia","apellido_materno":"","nacionalidad":null,"sexo":null,"direccion":"Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile","fecha_os10":"2025-08-15T04:00:00.000Z","created_from_excel":false,"instalacion_id":"15631bd6-03a9-459d-ae60-fc480f7f3e84","banco":null,"tipo_cuenta":null,"numero_cuenta":null,"instalacion_nombre":"A Test 1","cliente_nombre":"A Test Cliente"},"timestamp":"2025-08-08T04:59:12.818Z"}	\N	{"id": "7c84d4ad-dcb2-40f9-9d03-b7d1bf673220", "rut": "12345678-0", "sexo": null, "banco": null, "email": "test@test.com", "activo": true, "ciudad": null, "comuna": null, "nombre": "A Test", "region": null, "latitud": "-33.36405540", "longitud": "-70.51478340", "telefono": "+56912345678", "direccion": "Av. La Dehesa 222, 7710112 Lo Barnechea, Región Metropolitana, Chile", "tenant_id": "accebf8a-bacc-41fa-9601-ed39cb320a52", "created_at": "2025-07-31T08:33:14.445Z", "fecha_os10": "2025-08-15T04:00:00.000Z", "updated_at": "2025-08-07T00:03:19.019Z", "usuario_id": null, "tipo_cuenta": null, "nacionalidad": null, "numero_cuenta": null, "cliente_nombre": "A Test Cliente", "instalacion_id": "15631bd6-03a9-459d-ae60-fc480f7f3e84", "apellido_materno": "", "apellido_paterno": "Guardia", "created_from_excel": false, "instalacion_nombre": "A Test 1"}	2025-08-08 04:59:12.929696	accebf8a-bacc-41fa-9601-ed39cb320a52
7b51e6a8-8c8c-4780-aca0-c872c395d11c	c5823e4d-a58f-4854-be39-62ed89e6b7af	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-08 11:54:15.77668	\N
\.


--
-- Data for Name: logs_instalaciones; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.logs_instalaciones (id, instalacion_id, accion, usuario, tipo, contexto, fecha) FROM stdin;
708f216a-f514-40b4-8ef1-d6b3c7d92589	fb0d4f19-75f3-457e-8181-df032266441c	Instalación creada	Admin	sistema	Creación inicial de la instalación	2025-07-29 14:09:05.344989
93ebd16b-5ca3-4269-bee7-7819bf85c132	fb0d4f19-75f3-457e-8181-df032266441c	Datos actualizados	Admin	manual	Actualización de información básica	2025-07-30 14:09:05.344989
a2c8437c-51b9-4a84-91ff-241079022b95	fb0d4f19-75f3-457e-8181-df032266441c	Ubicación modificada	Admin	manual	Cambio de coordenadas GPS	2025-07-31 02:09:05.344989
90a2509d-aefa-43e0-98ab-be173d08a878	fb0d4f19-75f3-457e-8181-df032266441c	Estado cambiado a Activo	Admin	manual	Activación de la instalación	2025-07-31 08:09:05.344989
1a926160-2858-4104-991c-e35c06c99c1b	fb0d4f19-75f3-457e-8181-df032266441c	Prueba desde terminal	Sistema	sistema	Log de prueba creado desde terminal	2025-07-31 14:11:02.423816
ee257a9c-2bfd-4da7-bfa7-9d07f3f70bf1	fb0d4f19-75f3-457e-8181-df032266441c	Datos actualizados	Admin	manual	Actualización de: latitud, longitud, estado	2025-07-31 14:18:39.745736
60eac54e-0150-423b-9f92-017f9d37ea8f	fb0d4f19-75f3-457e-8181-df032266441c	Prueba directa	Admin	manual	Prueba de logging directo	2025-07-31 14:18:49.985657
5d81793b-a95d-47bd-9f04-7709a7e5c898	fb0d4f19-75f3-457e-8181-df032266441c	Datos actualizados	Admin	manual	Actualización de: latitud, longitud, estado	2025-07-31 14:19:06.967078
180dc5b4-e73a-4243-8f5d-12127c611a75	fb0d4f19-75f3-457e-8181-df032266441c	Estado cambiado a Activo	Admin	manual	Activación de la instalación	2025-07-31 14:19:27.526254
c4ca4236-a5c2-4043-9ddc-913bb96f1969	fb0d4f19-75f3-457e-8181-df032266441c	Estado cambiado a Inactivo	Admin	manual	Desactivación de la instalación	2025-07-31 14:19:35.806148
bf0d8643-18a9-4898-b37f-f17b252beb82	fb0d4f19-75f3-457e-8181-df032266441c	Datos actualizados	Admin	manual	Actualización de: nombre, cliente_id, direccion, ciudad, comuna, valor_turno_extra, estado	2025-07-31 14:22:49.633322
deac7f5f-0449-4bd5-9962-6bcdea19d52d	fb0d4f19-75f3-457e-8181-df032266441c	Datos actualizados	Admin	manual	Actualización de: 	2025-07-31 10:24:41.069527
b3e8e9ce-144e-4343-98d1-a84e3e6eed5c	fb0d4f19-75f3-457e-8181-df032266441c	Estado cambiado a Activo	Admin	manual	Activación de la instalación	2025-07-31 10:25:04.115683
d5c5db3d-435d-4f5c-b1a6-45b7f61b2a44	fb0d4f19-75f3-457e-8181-df032266441c	Estado cambiado a Inactivo	Admin	manual	Desactivación de la instalación	2025-07-31 10:25:30.66495
859a1e45-e6d7-4068-a8f3-8ad4e5bd6e1e	fb0d4f19-75f3-457e-8181-df032266441c	Estado cambiado a Activo	Admin	manual	Activación de la instalación	2025-07-31 10:26:00.441156
03ad13a0-8a34-4e60-b9de-4b94b33a44e1	fb0d4f19-75f3-457e-8181-df032266441c	Estado cambiado a Inactivo	Admin	manual	Desactivación de la instalación	2025-07-31 10:26:19.373244
bdce09b6-e081-4d2c-a635-97f06451052e	fb0d4f19-75f3-457e-8181-df032266441c	Estado cambiado a Activo	Admin	manual	Activación de la instalación	2025-07-31 10:27:09.641753
aedfcbc2-1cd0-4ee4-8085-a8a01e15bae1	fb0d4f19-75f3-457e-8181-df032266441c	Estado cambiado a Inactivo	Admin	manual	Desactivación de la instalación	2025-07-31 10:27:38.509155
eefc574b-058e-4714-8825-5e1114f58f11	fb0d4f19-75f3-457e-8181-df032266441c	Estado cambiado a Activo	Admin	manual	Activación de la instalación	2025-07-31 10:28:41.772708
41428e3f-69d5-43cf-944d-67324e67cbe5	fb0d4f19-75f3-457e-8181-df032266441c	Estado cambiado a Inactivo	Admin	manual	Desactivación de la instalación	2025-07-31 10:29:09.466828
bc97c4ac-c6fc-4e54-a59a-0cdfbcf75020	fb0d4f19-75f3-457e-8181-df032266441c	Prueba zona horaria	Admin	manual	Prueba de zona horaria	2025-07-31 14:29:30.000594
fbeda14c-b331-439c-93fc-76ace9597f53	fb0d4f19-75f3-457e-8181-df032266441c	Estado cambiado a Activo	Admin	manual	Activación de la instalación	2025-07-31 10:30:47.647237
d690423c-55ac-4359-a9d3-3d6160e0a623	fb0d4f19-75f3-457e-8181-df032266441c	Datos actualizados	Admin	manual	Actualización de: nombre	2025-07-31 10:32:24.079243
f4bbc949-a18d-4687-9bd9-2fc3dfdfb40b	fb0d4f19-75f3-457e-8181-df032266441c	Datos actualizados	Admin	manual	Actualización de: 	2025-07-31 10:32:48.602249
fda6e3d6-ad75-44f7-8f2c-90da6c2bc683	7e05a55d-8db6-4c20-b51c-509f09d69f74	Estado cambiado a Inactivo	Admin	manual	Desactivación de la instalación	2025-08-01 16:15:25.198367
ce75eaf3-0ec3-423d-9d66-8af9d64b51ec	7e05a55d-8db6-4c20-b51c-509f09d69f74	Estado cambiado a Inactivo	Admin	manual	Desactivación de la instalación	2025-08-01 16:15:46.164694
7ac32fe9-9b60-4602-bd3a-c4435b6f8c2a	3c1586b5-136a-4ee1-88a9-410284f49807	Datos actualizados	Admin	manual	Actualización de: nombre, valor turno extra, estado	2025-08-01 16:19:37.131315
07ef811b-cbe8-4d22-9b21-6b300b82140a	7e05a55d-8db6-4c20-b51c-509f09d69f74	Datos actualizados	Admin	manual	Actualización de: valor turno extra, estado	2025-08-01 16:23:10.898266
3605a8f4-66b2-4d0a-b852-7e0ff40ae5e4	7e05a55d-8db6-4c20-b51c-509f09d69f74	Datos actualizados	Admin	manual	Actualización de: nombre	2025-08-01 16:23:24.188097
4c83d0a0-82d7-4806-b2a2-b6cbe40c4a1b	fb0d4f19-75f3-457e-8181-df032266441c	Datos actualizados	Admin	manual	Actualización de: cliente, dirección, ciudad, comuna, estado	2025-08-01 17:02:10.222814
254f3f95-4a96-41fa-9f6c-2c486ab2816a	3c1586b5-136a-4ee1-88a9-410284f49807	Estado cambiado a Inactivo	Admin	manual	Desactivación de la instalación	2025-08-01 17:02:28.568263
7bbd96d2-db4b-440d-b55b-2607dfb7421d	02ba6ead-016e-4956-8512-e15689c42768	Datos actualizados	Admin	manual	Actualización de: valor turno extra, estado	2025-08-01 17:03:06.817142
60ee98de-b15a-42a8-ac55-ad8d6bc6baf3	7e05a55d-8db6-4c20-b51c-509f09d69f74	Datos actualizados	Admin	manual	Actualización de: dirección, latitud, longitud, ciudad, comuna	2025-08-01 19:23:00.87017
c1ec9f05-5262-4f78-8b99-a40e7d673453	7e05a55d-8db6-4c20-b51c-509f09d69f74	Datos actualizados	Admin	manual	Actualización de: dirección, latitud, longitud, valor turno extra	2025-08-01 20:17:44.884157
08bb729d-3109-45bf-9352-a052059e1dc6	7e05a55d-8db6-4c20-b51c-509f09d69f74	Datos actualizados	Admin	manual	Actualización de: cliente, latitud, longitud, valor turno extra	2025-08-03 13:18:10.738415
165fdd53-609f-4b81-a6b0-fe75f19f655e	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 03:44:49.468137
60fa9131-2d75-4c0a-8bac-8bd4ac3f1908	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 03:46:05.087872
b10b7ceb-879a-40e6-beb2-82c79a4f3176	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 05:41:24.101671
06f5e0d4-85ca-449d-91e5-008f468486fa	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 05:57:04.126482
31471256-5244-418f-8b5d-ab937b9427ef	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 06:00:04.157722
33018dc9-2c4d-4d0a-bd1b-5e19da516bfb	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 06:16:21.408382
301169a9-560f-4be5-abf9-a452ced8b290	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 06:20:52.165203
d9ca3c73-bcff-47b3-912f-2807b5495f3d	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 06:26:47.927081
ddabbe73-6183-46f2-9144-e5d4f4478a58	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 06:34:46.735671
3272c546-1d56-4679-b28a-1ec5ddb12b83	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 14:51:33.621392
e9da7920-76bc-40db-a794-e48c50d22d4f	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 16:44:15.373936
f89b6f89-109e-4895-b977-b1ee3af6670b	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 16:54:25.524626
9a6c225a-9967-4ad8-a66a-c3b8c549ca26	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:07:14.693496
d7e10b52-c174-401d-afac-509f264841ed	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:14:57.103961
44c74407-7b0a-4031-9854-ef5173af67e1	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:23:55.103953
76f71a8a-a284-4269-bde4-1846917af050	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:27:07.54465
564f5043-b00b-4e30-b5b2-10c083ba69cd	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:30:40.717053
9fece1f2-dd0d-4623-9991-7fd378f97dbb	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:34:09.745347
93c440d2-507a-48f4-90bb-44749f77db8b	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 17:50:03.031369
dc9c76ca-e7b6-407d-b756-ef55860ac192	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 21:01:50.312336
fcb5d6bd-9e33-4e87-b338-83d1a1c5d7fd	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 22:00:32.517206
1ab17105-0c5e-4383-8e81-51525b60993f	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-05 22:37:34.215051
046c69a5-a2e6-4a34-ba8a-e5dde8d847e5	7e05a55d-8db6-4c20-b51c-509f09d69f74	Datos actualizados	Admin	manual	Actualización de: latitud, longitud, valor turno extra	2025-08-05 18:41:14.457497
675f3249-e67e-4f7b-a572-de5468ee0b6c	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 01:59:59.900081
b0890225-bae2-434a-8495-d1b4f2c329ff	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 02:04:19.862045
77ff2bff-e741-4fa4-ac8d-489cdc0d56b1	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 02:20:04.414726
a533f6e3-0a2b-4b8e-9b05-f5c8aba7e823	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 02:27:40.778967
caae3c4e-90d8-464c-b8d3-f54c290770ed	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 02:32:54.40375
93f460ab-24f0-4446-89cf-b75a5c5395fa	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 02:37:18.844398
b5a73b61-9024-4042-b92e-a3426891b282	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 02:41:29.634412
9086b58e-7adc-4aae-8da1-caabe718279e	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 05:06:16.130054
76a00ccc-120d-4a5c-bcba-5415d0e503ba	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 05:40:36.71364
9d6e9115-1850-4ac7-a563-24a0ba80b37d	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 06:00:15.342857
28255b07-ed9a-488a-89e7-6a8ed6e38488	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 07:35:03.977277
3fd25cb2-0b42-4e70-9f5e-5e7481fdb931	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 07:44:02.938247
c2cc4158-63b3-4513-a751-c2ded11ec7e3	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 07:51:22.423742
7438588b-6416-4021-95d0-c6ac60b6862c	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 07:54:25.157297
891273dd-2ead-4adf-8130-2ed91c0e9df0	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 08:00:28.067274
2bae3ff4-3ce1-4de5-952b-028b363148ea	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 08:02:11.020342
c606a6c6-ec6e-4134-bfd8-4c977ec82b20	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 08:03:30.516849
b97ec1ee-5808-4c11-8502-ead008853d7b	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 08:11:49.927796
ac8d737c-3c1f-4766-bb23-a4914f7c166c	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 13:47:07.243143
dbe09d01-b779-44dc-8fe8-3a0797360473	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-06 18:07:09.351855
ffaebc85-9e2f-4c66-a959-a0db8851bd71	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 04:41:15.498807
3f4e8757-6a6b-46ed-89cf-96c82faa287c	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 04:51:05.801419
40d07e82-98fe-4102-bb91-a771d9b4174b	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 04:56:10.183524
84224f6f-125d-468e-a51a-0fd142de0010	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 15:40:10.541329
668199c3-6691-47dc-bbc0-05832c5e722a	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 15:48:25.708629
286eee84-05c6-4086-aa78-1888498e3d6e	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 15:49:49.539625
2940f4a9-b148-491c-a21d-b7d1bfcfd05c	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 17:36:28.357078
f3ec2434-3bf3-4e0e-a6f1-43e2a70b3a63	0e8ba906-e64b-4d4d-a104-ba29f21f48a9	Datos actualizados	Admin	manual	Actualización de: nombre, latitud, longitud, valor turno extra	2025-08-07 16:21:46.673176
c9bf5921-16b1-48e9-9fe4-5e0e8088dcb8	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 22:42:41.726218
438b0472-c18d-4a36-a02c-4c77c56dfc77	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-07 23:14:18.9116
cdd2b077-f016-432d-9183-90362e195e3c	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-08 03:36:32.154986
fcb2d65c-b952-4deb-be56-a6c7c936ca96	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-08 04:16:08.77265
5610a556-3be1-4a81-9ed8-ef096565a424	fe761cd0-320f-404a-aa26-2e81093ee12e	Prueba automática	auto@test.cl	sistema	Validación de logging	2025-08-08 11:54:15.830097
\.


--
-- Data for Name: logs_pauta_diaria; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.logs_pauta_diaria (id, pauta_diaria_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id) FROM stdin;
\.


--
-- Data for Name: logs_pauta_mensual; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.logs_pauta_mensual (id, pauta_mensual_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id) FROM stdin;
\.


--
-- Data for Name: logs_puestos_operativos; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.logs_puestos_operativos (id, puesto_operativo_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id) FROM stdin;
49269ac0-03d3-4ba7-9ac8-f41a00691f8d	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 03:44:48.535994	\N
93e23548-a146-4077-802a-93cd6e28272f	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 03:46:05.060311	\N
1a56ad97-6c5d-41bb-97e1-9d766264232d	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 05:41:23.084276	\N
7f562e68-85c7-457c-a43d-f9eb50dec0d3	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 05:57:04.101192	\N
882f08de-340b-47e4-b67b-7658f30cbc0a	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:00:04.140865	\N
cc11c88b-92b7-412c-b8fa-b9b0a4889918	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:16:21.380708	\N
8f0dc435-fbc8-41bf-b18a-3a8acd74ceb4	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:20:52.149256	\N
6ebc0453-2a2a-475d-bc42-f80c9920563e	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:26:47.900092	\N
b7e37162-5519-4fed-99a0-3c8b18189233	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:34:46.707027	\N
5ad23379-6607-465b-8e5f-99f3e565809a	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 14:51:33.583843	\N
8cab2171-af50-46d8-aab6-067d8a9aecee	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 16:44:15.339898	\N
5b09c1c4-e027-402d-b534-efc820f79427	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 16:54:25.50041	\N
0aee7252-08a9-4fd7-bee4-4b938e7b739b	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:07:14.663139	\N
3d73a5cb-21b0-4674-b514-0f68d8d36f66	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:14:57.080691	\N
1376b04f-7f93-404c-98be-b82745f480a0	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:23:55.066329	\N
744acb3a-b8ad-4763-8e3b-30293654a753	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:27:07.525751	\N
8b2bdbaa-cc62-4421-bb8f-314f091126f0	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:30:40.685432	\N
28804985-d1b2-4101-9aa5-387700b9eecb	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:34:09.721689	\N
33993e2e-a437-432a-8c9b-7a145aa1da1f	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:50:03.01385	\N
64734b99-d3b7-4f33-ac74-95af9e969466	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 21:01:50.277017	\N
f823141b-35ad-46f1-adf0-91456f05d26a	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 22:00:31.538152	\N
a694b232-a375-49c4-a00a-185d11cf8dd4	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 22:37:33.516735	\N
d7ff414d-bdb5-478f-a8b5-12749fa940d6	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 01:59:59.868145	\N
03095caa-8122-4db9-bae0-e8b8f3462a51	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:04:19.83116	\N
b41db225-e2b6-4249-8ca9-30d05140416d	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:20:04.386807	\N
2b737971-e2e6-4ca2-95f0-8057d6305ef4	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:27:40.75863	\N
7a12e9fe-1f7b-43cb-9318-a2a7abcf6e4a	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:32:54.388371	\N
2818929e-cdd9-4fbf-91da-d26eb8616bbd	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:37:18.829045	\N
fd3d1fed-897f-4d3e-98f4-f433c5ac0c53	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:41:29.618164	\N
6bbb8210-5bb5-461f-94ae-931cab738d28	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 05:06:15.13715	\N
e336b98b-5d42-4057-9c30-ef54684fe13b	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 05:40:36.695839	\N
9bf59d6b-66f4-41e5-8e8e-f98b1aa67019	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 06:00:15.297656	\N
1572d24d-a0e9-47f6-90dd-4905b67d386f	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 07:35:03.946465	\N
4ede357f-3f20-42d2-84a6-45e4b29991f4	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 07:44:02.907667	\N
f4344464-6dff-454f-ad58-48ffc8deef5d	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 07:51:22.399572	\N
fd1a0252-ab50-42cd-bba6-fb4c7b354d3a	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 07:54:25.136367	\N
25a51509-93fc-4f12-bfdf-733d3ef28297	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 08:00:28.04264	\N
a56c91ab-7f22-42cb-8fc5-6c195bab39a5	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 08:02:10.992759	\N
4e839927-0c76-437f-a585-a08f75614804	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 08:03:30.497275	\N
20ec2d5b-009b-45b4-b401-0e23d9c3918f	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 08:11:49.905366	\N
896fc8b9-f08f-4f1a-90e8-6bbbd437b886	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 13:47:07.214983	\N
b2ec0f30-b373-4cec-be58-5d92ea1cee76	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 18:07:09.321802	\N
1cb4f3c0-8cdb-4d05-af3e-c79a14c987ee	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 04:41:15.466889	\N
6a39f0bd-a712-4cfa-b3a5-509d6a8921ff	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 04:51:05.778865	\N
3d29e861-f91f-4919-ab50-40329d09602b	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 04:56:10.163969	\N
5a950863-3946-40d4-ad3d-00db87a2868a	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 15:40:10.498128	\N
276d1226-8f63-4eff-8bac-86282eb6aa7b	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 15:48:25.691741	\N
ff055615-5ea6-4bd3-b459-9eaead515f58	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 15:49:49.514882	\N
957fe157-8877-4bcb-ae75-2ba8bcae9273	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 17:36:28.317841	\N
71b09a3a-7549-4b48-a987-128adc15c5c0	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 22:42:40.752809	\N
97dd6419-299a-405e-a057-d9d24955046a	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 23:14:18.884154	\N
713c6e0e-70a8-4667-9942-176e6d8871b6	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-08 03:36:32.125862	\N
0bc1bd9a-e798-43c6-ad7d-b65c46d3ba98	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-08 04:16:08.742055	\N
fd47eedd-8695-47e2-bc8f-67c102b21a57	2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-08 11:54:15.798187	\N
\.


--
-- Data for Name: logs_turnos_extras; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.logs_turnos_extras (id, turno_extra_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id) FROM stdin;
53301fc3-03a9-48e3-aa46-e1b5f2409631	90f9c964-f21c-4a78-84fb-a20ce230b890	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:07:14.647547	\N
e130d2c0-e061-439b-8ca6-39aa816f8831	90f9c964-f21c-4a78-84fb-a20ce230b890	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:14:57.071338	\N
a9f3dcfe-2576-4694-8ed2-f8c6b5092b5b	90f9c964-f21c-4a78-84fb-a20ce230b890	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:23:55.049818	\N
a0eac99a-44b6-43ee-844f-3b6b12a8dc10	90f9c964-f21c-4a78-84fb-a20ce230b890	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:27:07.515439	\N
f0e393bb-6060-48c2-9721-97095d7e9c5b	90f9c964-f21c-4a78-84fb-a20ce230b890	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:30:40.671708	\N
e30608b4-aaf0-4e26-b818-71ef113d2ccc	90f9c964-f21c-4a78-84fb-a20ce230b890	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:34:09.711549	\N
66272d63-d3ea-4101-8641-1f3f58dec999	90f9c964-f21c-4a78-84fb-a20ce230b890	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:50:03.002568	\N
54e32b64-5f63-45b2-b03f-2fc91768a5b4	90f9c964-f21c-4a78-84fb-a20ce230b890	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 21:01:50.262431	\N
6885f343-a553-4893-ac38-12db30724ffe	90f9c964-f21c-4a78-84fb-a20ce230b890	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 22:00:31.127551	\N
5fbdf16a-e687-46c1-981c-f63d7adac58c	90f9c964-f21c-4a78-84fb-a20ce230b890	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 22:37:33.091292	\N
\.


--
-- Data for Name: logs_usuarios; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.logs_usuarios (id, usuario_id, accion, usuario, tipo, contexto, datos_anteriores, datos_nuevos, fecha, tenant_id) FROM stdin;
03c361b0-e579-4ef3-ba4f-78f82d9da0c8	b52c44c2-4960-4b6a-aa72-7686378f7d7a	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 03:44:49.067919	\N
d0785f04-458b-4952-844e-b5e60a1abe24	29045574-1176-48c2-9817-5e1c731228a2	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 03:46:05.073232	\N
e9c0c3d0-903c-4da5-9168-ad442413847f	0e355ae9-c535-4009-89af-2f9546b60419	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 05:41:23.665156	\N
fc4ac7cc-3295-4d0c-9d8d-3b15022a1851	f84fc2ad-ed11-4b13-aa9c-7cf521b112c2	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 05:57:04.117329	\N
2f9da0aa-ef56-48a2-92c6-645ab2c71dee	a1d635d4-9763-4694-860d-076f0025e38a	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:00:04.149916	\N
d4132a9b-8624-4f22-828d-07cde55f490c	f8379998-d49b-4d1f-ad1e-956c33123d62	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:16:21.397694	\N
e3fe82d8-2c0c-486d-87af-e3a26d7b31bb	852e25ab-292f-475e-8fbd-8ad4ef5b1443	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:20:52.158461	\N
5c7ecc1b-e26f-495a-8b41-11d0192eb557	6e364a7b-a2cd-4b3a-889a-6be5f9ce2e3a	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:26:47.91616	\N
7186ad1a-2d9d-4e59-b0c8-58b727f30bb8	3d97e6fb-4c2d-4135-a0d1-e7f158f3225d	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 06:34:46.722471	\N
60d916d6-3229-4b8c-8d7c-2ba006e2ad04	3eb085bd-f91a-4570-a296-e90ed139260e	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 14:51:33.608613	\N
c82cfa2d-e58a-4c9c-9b62-8351002da213	78a8ebbc-01f5-4774-bdc9-89f496208ba4	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 16:44:15.36147	\N
3af139ca-403f-4fc9-898b-3346b8b388fd	2d68f316-0a0f-4346-a28b-7ccfb057273b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 16:54:25.511576	\N
dde8e923-cd88-4261-9357-580924fb8b81	5a14f460-985d-45ec-a6d1-2b3a82780b29	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:07:14.680332	\N
63446c79-df44-4103-bc3c-46f4c8494044	64f8cd65-366a-4104-b582-00903e7573a8	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:14:57.092697	\N
053ec651-fc62-43fc-aafb-116e97891609	64e85a0b-dbb2-410d-9e60-69e740d0d92f	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:23:55.087445	\N
7d6cdd02-9659-42e1-b5b0-538bd485cac7	97d2abe3-c535-45c3-a92c-7e78c9230be0	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:27:07.536418	\N
2458220b-084d-444d-8f3a-f9a3b81e7461	73de8428-e0e8-4ebb-a68f-746cd719fe2e	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:30:40.704741	\N
9c42e5be-ab45-43a8-9c13-ac292985a818	6597f6c9-4e9d-45ad-95f8-c0254520f12f	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:34:09.735371	\N
24f8ccb4-17e1-48c1-95fe-df65fd2b9f88	cdbbd443-9b9f-42f7-9416-cd9cc54b928a	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 17:50:03.023778	\N
425857c3-80dd-4a36-9691-b259a7939cf3	57e8dd91-54a9-4b05-9bcb-0148977c9f82	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 21:01:50.293816	\N
9fbcda1c-1ac8-4334-8057-17e609b053ef	1a69b88f-ae8b-42f4-810a-8972af781b9c	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-05 22:00:32.086124	\N
a2990505-8af9-432e-88e3-ecbb65a5a510	aecaee88-8ad2-4081-bb51-865cf4ff7e72	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 01:59:59.886804	\N
b081f790-207b-470b-83eb-239cca91691d	3e65cf0a-5a41-4cb6-9b9b-11d09497c976	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:04:19.85022	\N
e781e631-4e50-42cd-953a-a5f583f05170	b90af5d0-73c3-4d0a-81cf-0b50cb4423a2	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:20:04.403067	\N
f8bc22bd-d333-4db6-87f3-966c77f4b0f2	568832cc-ef18-4014-a69e-524f763897de	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:27:40.771036	\N
51b3a665-a1bc-4b5d-bb40-c55c97502502	108ada35-9313-4feb-adfe-dc34aec3c89e	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:32:54.39791	\N
d24d0b38-108f-4218-9dfb-9444ae78b15e	1514bf0f-7326-4744-83b2-f0c0b3b53eee	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:37:18.838845	\N
111b3d14-54cf-4a87-85e5-4999b282d895	d99aa9e8-b9cc-4fd1-b892-d2d26fab47e6	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 02:41:29.62835	\N
a1f03333-9ccf-4ff4-8778-779d4d6ad55b	f172a226-11ca-4f3e-bfba-5a298005dff1	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 05:06:15.703812	\N
cf46caaa-120a-47b6-b1be-b35cceca6338	eecfe125-8ed8-4fa9-b08e-e9a3a0ca4132	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 05:40:36.70475	\N
1cf5dd21-5967-458f-bd3a-109ff2263809	689a6e04-1ceb-41c3-bd64-99a9819f291b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 06:00:15.324323	\N
51245cf9-3310-4312-9f6f-a4d082651133	c69b4f51-e52c-4384-b15b-d30ff94dc721	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 07:35:03.964924	\N
59a9d4aa-fbac-4f48-80bc-e17582867270	ab96f580-7da4-4222-ba0c-e50685c8501f	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 07:44:02.923764	\N
5ba93e5c-5814-49be-8238-76e61bd0722f	fecbe107-ab52-429a-b3c7-6eaab6fa39ab	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 07:51:22.410302	\N
03cc7942-888b-4aaf-91b2-e97c818f2bb2	147bf10a-7e04-47e2-958c-b948848f84a9	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 07:54:25.146802	\N
6cd1af81-2d61-4b27-859e-76628784ee67	bcca9d22-0c7d-4ebc-82ef-c10c5723d167	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 08:00:28.057329	\N
1062a698-9e90-415e-8e59-a595355038c7	390be0a9-b1a4-4a5d-8f39-06823d61095d	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 08:02:11.00293	\N
45387bda-56c8-476f-8a19-52f3e83760b5	3db657d0-a072-43ec-a27e-07867de88264	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 08:03:30.507387	\N
8db482a2-0487-4182-ade8-6501f0d10c39	910f8d3d-a2c8-42bf-bb1d-46c840ef0cb1	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 08:11:49.919237	\N
a1b18a2d-4b08-460e-a917-0038ef362929	9ce90feb-220f-4b97-a1cd-83b9e02c4292	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 13:47:07.230077	\N
50f231aa-1225-43ca-a69b-880f677cc7de	e2dc0a77-031f-43ce-8ec1-9908c284ea1c	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-06 18:07:09.335117	\N
8aee1e7c-147b-439a-9d8f-884f4dc58858	5b12458c-4354-4890-a4ac-81ff7a344d76	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 04:41:15.48416	\N
ef089200-36c7-40a2-85c3-78968e0b0794	b80aaa31-65ed-4492-9502-a24b4f2aa9c9	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 04:51:05.792281	\N
f5e6da02-9218-4ebf-a809-c2056c53b760	d98f03bb-fd97-4dbe-b734-4aac1e707b20	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 04:56:10.170974	\N
97e4f883-cdf3-498c-adcd-6d3ffdb10560	15740080-405d-4938-81ca-c2e9421339a5	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 15:40:10.52869	\N
2de9a52a-5044-44f2-a480-8ffc5ef235e2	5b35bf31-34bb-43c4-b2ec-7ecfa10bd3a9	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 15:48:25.703131	\N
cc52a524-bf97-4f44-aa6b-f9ef5b7538f5	7eccad29-35ed-4d35-b52a-acb6de847213	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 15:49:49.529247	\N
1ef67b71-0ff3-4b2b-8293-d5f04f01c589	6b044029-4c5a-4657-b2dd-f265dee42144	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 17:36:28.340565	\N
78a19bc4-b737-4e51-ac26-fa2006e8113a	2ca4fc61-71bb-4cc1-862d-db7b6cee92b5	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 22:42:41.321444	\N
6bcd018f-47bb-48e5-9f3c-30caa807719a	37cfde69-fd4e-4e75-8d1f-f70f6c417c2b	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-07 23:14:18.899809	\N
2954d5fa-877e-4b92-860d-18f254cf2e60	8fc8da22-bf82-4f99-b527-3d6a3262e9b1	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-08 03:36:32.142896	\N
350251c0-985f-4d4f-a678-695c829103f7	5d58bca8-c265-4814-bfba-94effb2cf307	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-08 04:16:08.758115	\N
f65c9450-f1c6-4579-bbc9-6301dbed4eff	ab69370d-5f36-419e-9a2e-e46d12a48ebc	Prueba automática	auto@test.cl	sistema	Validación de logging	{"before": null}	{"after": "log test OK"}	2025-08-08 11:54:15.815882	\N
\.


--
-- Data for Name: pagos_turnos_extras; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.pagos_turnos_extras (id, guardia_id, instalacion_id, puesto_id, pauta_id, fecha, estado, valor, created_at) FROM stdin;
\.


--
-- Data for Name: pautas_diarias; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.pautas_diarias (id, tenant_id, pauta_mensual_id, fecha, guardia_asignado_id, estado, cobertura_por_id, observacion, creado_en) FROM stdin;
\.


--
-- Data for Name: pautas_mensuales; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.pautas_mensuales (id, tenant_id, instalacion_id, guardia_id, rol_servicio_id, dia, tipo, observacion, creado_en) FROM stdin;
\.


--
-- Data for Name: puestos_por_cubrir; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.puestos_por_cubrir (id, tenant_id, pauta_diaria_id, instalacion_id, rol_servicio_id, motivo, observacion, creado_en) FROM stdin;
\.


--
-- Data for Name: roles_servicio; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.roles_servicio (id, tenant_id, nombre, descripcion, activo, creado_en) FROM stdin;
9d216c64-b52f-4d30-abac-22c54dc01cb6	\N	Supervisor Día	Supervisor para turnos de día	t	2025-08-07 15:25:16.397355
f783a6ea-a37f-4068-aeb8-115b5bb5e652	\N	Guardia Noche	Guardia para turnos de noche	f	2025-08-07 15:25:20.688524
\.


--
-- Data for Name: rondas; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.rondas (id, tenant_id, guardia_id, instalacion_id, fecha, tipo, ubicacion, lat, lng, observacion, updated_at) FROM stdin;
\.


--
-- Data for Name: sueldo_afp; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sueldo_afp (id, periodo, codigo, nombre, tasa, created_at, updated_at) FROM stdin;
8	2025-08	capital	AFP Capital	11.44	2025-08-06 18:55:55.428364	2025-08-06 18:55:55.428364
9	2025-08	cuprum	AFP Cuprum	11.44	2025-08-06 18:55:55.428364	2025-08-06 18:55:55.428364
10	2025-08	habitat	AFP Habitat	11.27	2025-08-06 18:55:55.428364	2025-08-06 18:55:55.428364
11	2025-08	modelo	AFP Modelo	10.77	2025-08-06 18:55:55.428364	2025-08-06 18:55:55.428364
12	2025-08	planvital	AFP PlanVital	11.10	2025-08-06 18:55:55.428364	2025-08-06 18:55:55.428364
13	2025-08	provida	AFP ProVida	11.45	2025-08-06 18:55:55.428364	2025-08-06 18:55:55.428364
14	2025-08	uno	AFP UNO	10.69	2025-08-06 18:55:55.428364	2025-08-06 18:55:55.428364
\.


--
-- Data for Name: sueldo_asignacion_familiar; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sueldo_asignacion_familiar (id, periodo, tramo, desde, hasta, monto, created_at, updated_at) FROM stdin;
10	2025-08	A	0.00	1000000.00	0.00	2025-08-06 18:55:55.753226	2025-08-06 18:55:55.753226
11	2025-08	B	1000000.00	2000000.00	15000.00	2025-08-06 18:55:55.753226	2025-08-06 18:55:55.753226
12	2025-08	C	2000000.00	3000000.00	25000.00	2025-08-06 18:55:55.753226	2025-08-06 18:55:55.753226
13	2025-08	D	3000000.00	\N	35000.00	2025-08-06 18:55:55.753226	2025-08-06 18:55:55.753226
\.


--
-- Data for Name: sueldo_bonos_globales; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sueldo_bonos_globales (id, nombre, descripcion, imponible, activo, created_at, updated_at) FROM stdin;
f385aede-5ebe-452f-bd36-5b45e347878c	Colación	Bono de colación para alimentación	f	t	2025-08-07 19:27:45.142698	2025-08-07 19:56:04.467019
8892f19e-3b77-4933-af8f-4309fdd56cde	Movilización	Bono de movilización para transporte	f	t	2025-08-07 19:27:45.142698	2025-08-07 19:56:04.467019
230adfdd-5d45-41d1-a745-10ffd2101a86	Responsabilidad	Bono por responsabilidad en el cargo	t	t	2025-08-07 19:27:45.142698	2025-08-07 19:56:04.467019
fb48a609-ecf0-45ab-bc8c-966256557d2b	colación	\N	f	t	2025-08-08 06:39:57.290377	2025-08-08 06:39:57.290377
\.


--
-- Data for Name: sueldo_estructuras_servicio; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sueldo_estructuras_servicio (id, instalacion_id, rol_servicio_id, monto, created_at, updated_at, sueldo_base, bono_id, activo, fecha_inactivacion) FROM stdin;
87534491-5e52-4baf-80d0-5a625eed26ea	0e8ba906-e64b-4d4d-a104-ba29f21f48a9	0e768453-97b3-4bc0-b111-4b4e421ef308	0	2025-08-08 01:43:03.590325	2025-08-08 03:39:06.88414	0	\N	f	2025-08-08 03:26:49.365588
dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3	0e8ba906-e64b-4d4d-a104-ba29f21f48a9	0e768453-97b3-4bc0-b111-4b4e421ef308	0	2025-08-07 23:53:14.785667	2025-08-08 03:39:33.016369	0	\N	f	2025-08-08 03:26:49.365588
fc388a81-08b5-44d2-8788-46622bfe82ab	7e05a55d-8db6-4c20-b51c-509f09d69f74	0e768453-97b3-4bc0-b111-4b4e421ef308	680000	2025-08-07 04:48:39.863868	2025-08-08 04:13:34.192011	0	\N	f	2025-08-08 04:13:34.192011
00e48582-9ff6-4e05-9321-8137313df33b	7e05a55d-8db6-4c20-b51c-509f09d69f74	0e768453-97b3-4bc0-b111-4b4e421ef308	113333	2025-08-07 04:49:25.341493	2025-08-08 04:13:34.192011	0	\N	f	2025-08-08 04:13:34.192011
6b408450-7f0b-4b2d-a79b-6064810f3b2f	7e05a55d-8db6-4c20-b51c-509f09d69f74	0e768453-97b3-4bc0-b111-4b4e421ef308	55000	2025-08-07 04:49:25.508397	2025-08-08 04:13:34.192011	0	\N	f	2025-08-08 04:13:34.192011
13fc49c5-e136-4169-8d1d-a604a62d1f61	7e05a55d-8db6-4c20-b51c-509f09d69f74	0e768453-97b3-4bc0-b111-4b4e421ef308	48000	2025-08-07 04:49:25.67542	2025-08-08 04:13:34.192011	0	\N	f	2025-08-08 04:13:34.192011
a527c2c6-864a-46f1-a9f0-1fb7ada6e935	7e05a55d-8db6-4c20-b51c-509f09d69f74	0e768453-97b3-4bc0-b111-4b4e421ef308	0	2025-08-08 04:13:41.888511	2025-08-08 04:14:06.756074	0	\N	f	2025-08-08 04:14:06.756074
da666d9f-8758-435b-ae7b-4cb6bedc5176	7e05a55d-8db6-4c20-b51c-509f09d69f74	0e768453-97b3-4bc0-b111-4b4e421ef308	0	2025-08-08 04:22:24.603144	2025-08-08 04:23:09.896855	0	\N	f	2025-08-08 04:23:09.896855
14a951e8-7cf5-443b-90ac-f20c91335b1e	0e8ba906-e64b-4d4d-a104-ba29f21f48a9	0e768453-97b3-4bc0-b111-4b4e421ef308	0	2025-08-08 04:58:36.739604	2025-08-08 05:01:03.750319	0	\N	f	2025-08-08 05:01:03.750319
6fb7aecb-267d-4003-8486-66e576e915c5	0e8ba906-e64b-4d4d-a104-ba29f21f48a9	0e768453-97b3-4bc0-b111-4b4e421ef308	0	2025-08-08 05:01:35.3391	2025-08-08 05:10:35.184133	0	\N	f	2025-08-08 05:10:35.184133
172a4744-5b8a-4be4-a2ee-0f02e856dbf7	0e8ba906-e64b-4d4d-a104-ba29f21f48a9	0e768453-97b3-4bc0-b111-4b4e421ef308	0	2025-08-08 05:10:59.709465	2025-08-08 05:11:06.57989	0	\N	f	2025-08-08 05:11:06.57989
a46fb3b9-8181-4bf6-babf-e41d4de85496	0e8ba906-e64b-4d4d-a104-ba29f21f48a9	0e768453-97b3-4bc0-b111-4b4e421ef308	0	2025-08-08 05:11:28.144571	2025-08-08 05:38:52.593586	0	\N	f	2025-08-08 05:38:52.593586
38aa544a-bb88-4906-9943-ddb3d41f10c0	0e8ba906-e64b-4d4d-a104-ba29f21f48a9	0e768453-97b3-4bc0-b111-4b4e421ef308	0	2025-08-08 05:40:13.638361	2025-08-08 05:47:50.565959	0	\N	f	2025-08-08 05:47:50.565959
819b6247-6695-4864-ae72-731af95f571a	0e8ba906-e64b-4d4d-a104-ba29f21f48a9	0e768453-97b3-4bc0-b111-4b4e421ef308	0	2025-08-08 05:48:42.15064	2025-08-08 06:05:39.343221	550000	\N	t	\N
681a5fe4-82e7-4716-b12c-dbb66b938d10	0e8ba906-e64b-4d4d-a104-ba29f21f48a9	0e768453-97b3-4bc0-b111-4b4e421ef308	50000	2025-08-08 06:39:57.577778	2025-08-08 06:39:57.577778	0	fb48a609-ecf0-45ab-bc8c-966256557d2b	t	\N
\.


--
-- Data for Name: sueldo_historial_estructuras; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sueldo_historial_estructuras (id, rol_servicio_id, estructura_id, accion, fecha_accion, detalles, usuario_id, datos_anteriores, datos_nuevos, created_at) FROM stdin;
039cde04-35a0-467d-abd1-803a54cfb64d	0e768453-97b3-4bc0-b111-4b4e421ef308	dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3	INACTIVACION	2025-08-08 01:39:06.508977	Estructura inactivada	\N	{"activo": true}	{"activo": false}	2025-08-08 01:39:06.508977
ddcee1b5-6d9c-45bf-acf3-e03547f36543	0e768453-97b3-4bc0-b111-4b4e421ef308	87534491-5e52-4baf-80d0-5a625eed26ea	REEMPLAZO	2025-08-08 01:43:03.590325	Prueba automatizada	\N	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "monto": 0, "activo": false, "bono_id": null, "created_at": "2025-08-08T03:53:14.785Z", "updated_at": "2025-08-08T05:39:06.508Z", "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T05:39:06.508Z"}	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "monto": 0, "activo": true, "bono_id": null, "created_at": "2025-08-08T05:43:03.590Z", "updated_at": "2025-08-08T05:43:03.590Z", "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": null}	2025-08-08 01:43:03.590325
dff4bfc9-192e-4aa3-88a1-ea29e5765de1	0e768453-97b3-4bc0-b111-4b4e421ef308	fc388a81-08b5-44d2-8788-46622bfe82ab	INACTIVACION	2025-08-08 01:44:15.181664	Estructura inactivada por inactivación del rol: Prueba de inactivación de rol	\N	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T01:44:15.455Z"}	2025-08-08 01:44:15.181664
64b50719-cbdb-4171-bf8c-a5a58ba88992	0e768453-97b3-4bc0-b111-4b4e421ef308	00e48582-9ff6-4e05-9321-8137313df33b	INACTIVACION	2025-08-08 01:44:15.181664	Estructura inactivada por inactivación del rol: Prueba de inactivación de rol	\N	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T01:44:15.591Z"}	2025-08-08 01:44:15.181664
179b7065-d2e9-4473-b1cb-58336dfc759a	0e768453-97b3-4bc0-b111-4b4e421ef308	6b408450-7f0b-4b2d-a79b-6064810f3b2f	INACTIVACION	2025-08-08 01:44:15.181664	Estructura inactivada por inactivación del rol: Prueba de inactivación de rol	\N	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T01:44:16.068Z"}	2025-08-08 01:44:15.181664
d857b9eb-6637-4e79-b900-f0262dba5456	0e768453-97b3-4bc0-b111-4b4e421ef308	13fc49c5-e136-4169-8d1d-a604a62d1f61	INACTIVACION	2025-08-08 01:44:15.181664	Estructura inactivada por inactivación del rol: Prueba de inactivación de rol	\N	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T01:44:16.204Z"}	2025-08-08 01:44:15.181664
c8d6d0f5-189a-4020-af19-7193c77e786a	0e768453-97b3-4bc0-b111-4b4e421ef308	87534491-5e52-4baf-80d0-5a625eed26ea	INACTIVACION	2025-08-08 01:44:15.181664	Estructura inactivada por inactivación del rol: Prueba de inactivación de rol	\N	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "activo": false, "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T01:44:16.339Z"}	2025-08-08 01:44:15.181664
8c2dbc69-0d1d-42d7-9c37-e717572c1f51	0e768453-97b3-4bc0-b111-4b4e421ef308	87534491-5e52-4baf-80d0-5a625eed26ea	INACTIVACION	2025-08-08 02:15:59.216252	Estructura inactivada	\N	{"activo": true}	{"activo": false}	2025-08-08 02:15:59.216252
c52fb44f-3fcf-49d6-9ea1-8fd863d7270f	0e768453-97b3-4bc0-b111-4b4e421ef308	fc388a81-08b5-44d2-8788-46622bfe82ab	INACTIVACION	2025-08-08 02:32:29.294619	Estructura inactivada por inactivación del rol: Crear estructuras inactivas para prueba	\N	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T02:32:29.506Z"}	2025-08-08 02:32:29.294619
29009a5e-a029-4e41-9ab0-dce2c60dc280	0e768453-97b3-4bc0-b111-4b4e421ef308	00e48582-9ff6-4e05-9321-8137313df33b	INACTIVACION	2025-08-08 02:32:29.294619	Estructura inactivada por inactivación del rol: Crear estructuras inactivas para prueba	\N	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T02:32:29.646Z"}	2025-08-08 02:32:29.294619
9b931361-c36b-4bb0-bb03-859b4eba6cc3	0e768453-97b3-4bc0-b111-4b4e421ef308	6b408450-7f0b-4b2d-a79b-6064810f3b2f	INACTIVACION	2025-08-08 02:32:29.294619	Estructura inactivada por inactivación del rol: Crear estructuras inactivas para prueba	\N	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T02:32:29.776Z"}	2025-08-08 02:32:29.294619
590b4ecf-c417-4b06-b322-0530667ee62b	0e768453-97b3-4bc0-b111-4b4e421ef308	13fc49c5-e136-4169-8d1d-a604a62d1f61	INACTIVACION	2025-08-08 02:32:29.294619	Estructura inactivada por inactivación del rol: Crear estructuras inactivas para prueba	\N	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T02:32:29.908Z"}	2025-08-08 02:32:29.294619
d31e5dd3-0403-4147-a616-8e41a42dedfc	0e768453-97b3-4bc0-b111-4b4e421ef308	dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3	INACTIVACION	2025-08-08 02:32:29.294619	Estructura inactivada por inactivación del rol: Crear estructuras inactivas para prueba	\N	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "activo": false, "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T02:32:30.039Z"}	2025-08-08 02:32:29.294619
96e72683-a5b2-415a-b7a2-d84231ece154	0e768453-97b3-4bc0-b111-4b4e421ef308	87534491-5e52-4baf-80d0-5a625eed26ea	INACTIVACION	2025-08-08 02:32:29.294619	Estructura inactivada por inactivación del rol: Crear estructuras inactivas para prueba	\N	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "activo": false, "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T02:32:30.167Z"}	2025-08-08 02:32:29.294619
b3e859cb-5c19-4f52-891d-c49c734287b2	0e768453-97b3-4bc0-b111-4b4e421ef308	fc388a81-08b5-44d2-8788-46622bfe82ab	INACTIVACION	2025-08-08 02:52:37.039332	Estructura inactivada por inactivación del rol: UI test	\N	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T02:52:38.003Z"}	2025-08-08 02:52:37.039332
30d13725-0575-4fea-b70b-d6ac46725f57	0e768453-97b3-4bc0-b111-4b4e421ef308	00e48582-9ff6-4e05-9321-8137313df33b	INACTIVACION	2025-08-08 02:52:37.039332	Estructura inactivada por inactivación del rol: UI test	\N	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T02:52:38.138Z"}	2025-08-08 02:52:37.039332
52dee26a-65ff-4ff1-bfa7-90ae25026c1c	0e768453-97b3-4bc0-b111-4b4e421ef308	6b408450-7f0b-4b2d-a79b-6064810f3b2f	INACTIVACION	2025-08-08 02:52:37.039332	Estructura inactivada por inactivación del rol: UI test	\N	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T02:52:41.626Z"}	2025-08-08 02:52:37.039332
4ba59d90-a413-4deb-8ddc-aeadd45d4efc	0e768453-97b3-4bc0-b111-4b4e421ef308	13fc49c5-e136-4169-8d1d-a604a62d1f61	INACTIVACION	2025-08-08 02:52:37.039332	Estructura inactivada por inactivación del rol: UI test	\N	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T02:52:43.183Z"}	2025-08-08 02:52:37.039332
51567cb6-2a9c-47d8-bf1b-2bd9af28ad0e	0e768453-97b3-4bc0-b111-4b4e421ef308	dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3	INACTIVACION	2025-08-08 02:52:37.039332	Estructura inactivada por inactivación del rol: UI test	\N	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "activo": false, "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T02:52:43.663Z"}	2025-08-08 02:52:37.039332
4326cb67-dcf3-4b54-8475-94fb1fde4194	0e768453-97b3-4bc0-b111-4b4e421ef308	87534491-5e52-4baf-80d0-5a625eed26ea	INACTIVACION	2025-08-08 02:52:37.039332	Estructura inactivada por inactivación del rol: UI test	\N	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "activo": false, "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T02:52:43.797Z"}	2025-08-08 02:52:37.039332
ed546d18-4604-4942-8a62-4bd87e7c6d0d	0e768453-97b3-4bc0-b111-4b4e421ef308	87534491-5e52-4baf-80d0-5a625eed26ea	INACTIVACION	2025-08-08 03:01:55.995925	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "activo": false, "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:01:56.197Z"}	2025-08-08 03:01:55.995925
adc5ebe4-5be0-4c74-861d-d16637b5b613	0e768453-97b3-4bc0-b111-4b4e421ef308	fc388a81-08b5-44d2-8788-46622bfe82ab	INACTIVACION	2025-08-08 03:01:55.995925	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:01:56.326Z"}	2025-08-08 03:01:55.995925
0b6e7132-66dd-4c05-b021-9c63c95b99b4	0e768453-97b3-4bc0-b111-4b4e421ef308	00e48582-9ff6-4e05-9321-8137313df33b	INACTIVACION	2025-08-08 03:01:55.995925	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:01:56.456Z"}	2025-08-08 03:01:55.995925
cfdfcc3c-9f50-4b71-95a3-d798612419b8	0e768453-97b3-4bc0-b111-4b4e421ef308	6b408450-7f0b-4b2d-a79b-6064810f3b2f	INACTIVACION	2025-08-08 03:01:55.995925	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:01:56.588Z"}	2025-08-08 03:01:55.995925
e43c6618-e4a5-4b81-b62b-5b4ce5d620c1	0e768453-97b3-4bc0-b111-4b4e421ef308	13fc49c5-e136-4169-8d1d-a604a62d1f61	INACTIVACION	2025-08-08 03:01:55.995925	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:01:56.720Z"}	2025-08-08 03:01:55.995925
1e14d96d-8aca-4187-8174-d15d7e29c3e2	0e768453-97b3-4bc0-b111-4b4e421ef308	dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3	INACTIVACION	2025-08-08 03:01:55.995925	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "activo": false, "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:01:56.850Z"}	2025-08-08 03:01:55.995925
0af93bf5-2932-488f-b63a-10e5d5044d98	0e768453-97b3-4bc0-b111-4b4e421ef308	87534491-5e52-4baf-80d0-5a625eed26ea	INACTIVACION	2025-08-08 03:10:37.165999	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "activo": false, "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:10:37.367Z"}	2025-08-08 03:10:37.165999
f7f76810-951a-4138-a1a4-e77eeea3c422	0e768453-97b3-4bc0-b111-4b4e421ef308	fc388a81-08b5-44d2-8788-46622bfe82ab	INACTIVACION	2025-08-08 03:10:37.165999	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:10:37.504Z"}	2025-08-08 03:10:37.165999
435a54f6-8ae3-4845-afa5-ebaced25a298	0e768453-97b3-4bc0-b111-4b4e421ef308	00e48582-9ff6-4e05-9321-8137313df33b	INACTIVACION	2025-08-08 03:10:37.165999	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:10:37.638Z"}	2025-08-08 03:10:37.165999
1905d611-5569-44bb-81df-0c5b604bf232	0e768453-97b3-4bc0-b111-4b4e421ef308	6b408450-7f0b-4b2d-a79b-6064810f3b2f	INACTIVACION	2025-08-08 03:10:37.165999	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:10:37.780Z"}	2025-08-08 03:10:37.165999
c472539f-ebcc-44e1-94a1-64258d0c8814	0e768453-97b3-4bc0-b111-4b4e421ef308	13fc49c5-e136-4169-8d1d-a604a62d1f61	INACTIVACION	2025-08-08 03:10:37.165999	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:10:37.916Z"}	2025-08-08 03:10:37.165999
71547144-598e-45ca-9573-03b732ae8827	0e768453-97b3-4bc0-b111-4b4e421ef308	dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3	INACTIVACION	2025-08-08 03:10:37.165999	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "activo": false, "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:10:38.052Z"}	2025-08-08 03:10:37.165999
272870ce-78bd-439d-b2ac-1973d8068207	0e768453-97b3-4bc0-b111-4b4e421ef308	87534491-5e52-4baf-80d0-5a625eed26ea	INACTIVACION	2025-08-08 03:13:36.661915	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "activo": false, "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:13:37.248Z"}	2025-08-08 03:13:36.661915
1f65d927-0431-4548-a713-97dc0c6b54be	0e768453-97b3-4bc0-b111-4b4e421ef308	fc388a81-08b5-44d2-8788-46622bfe82ab	INACTIVACION	2025-08-08 03:13:36.661915	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:13:37.392Z"}	2025-08-08 03:13:36.661915
eb3f45da-4479-4333-b879-af85201a77f8	0e768453-97b3-4bc0-b111-4b4e421ef308	00e48582-9ff6-4e05-9321-8137313df33b	INACTIVACION	2025-08-08 03:13:36.661915	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:13:37.524Z"}	2025-08-08 03:13:36.661915
596bf0ba-cbf3-4cd1-8fbd-3757034610ec	0e768453-97b3-4bc0-b111-4b4e421ef308	6b408450-7f0b-4b2d-a79b-6064810f3b2f	INACTIVACION	2025-08-08 03:13:36.661915	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:13:37.658Z"}	2025-08-08 03:13:36.661915
7a90da7e-a2ae-4bb5-9289-ac3c46173656	0e768453-97b3-4bc0-b111-4b4e421ef308	13fc49c5-e136-4169-8d1d-a604a62d1f61	INACTIVACION	2025-08-08 03:13:36.661915	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:13:37.794Z"}	2025-08-08 03:13:36.661915
3f0a8056-dc4a-4297-bcc2-f95ebff2fa0b	0e768453-97b3-4bc0-b111-4b4e421ef308	dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3	INACTIVACION	2025-08-08 03:13:36.661915	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "activo": false, "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:13:37.930Z"}	2025-08-08 03:13:36.661915
0d431cc7-48d7-435d-bc35-dbbd46f140d5	0e768453-97b3-4bc0-b111-4b4e421ef308	87534491-5e52-4baf-80d0-5a625eed26ea	INACTIVACION	2025-08-08 03:14:55.642723	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "activo": false, "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:14:55.833Z"}	2025-08-08 03:14:55.642723
f1e94342-d6d5-4637-8a0f-cfca31391efa	0e768453-97b3-4bc0-b111-4b4e421ef308	fc388a81-08b5-44d2-8788-46622bfe82ab	INACTIVACION	2025-08-08 03:14:55.642723	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:14:55.965Z"}	2025-08-08 03:14:55.642723
c247feed-b66a-4100-a348-1c181f6b062a	0e768453-97b3-4bc0-b111-4b4e421ef308	00e48582-9ff6-4e05-9321-8137313df33b	INACTIVACION	2025-08-08 03:14:55.642723	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:14:56.099Z"}	2025-08-08 03:14:55.642723
e31de224-5c5d-43b2-a0d9-add30af063de	0e768453-97b3-4bc0-b111-4b4e421ef308	6b408450-7f0b-4b2d-a79b-6064810f3b2f	INACTIVACION	2025-08-08 03:14:55.642723	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:14:56.231Z"}	2025-08-08 03:14:55.642723
f74f02c1-3461-461f-83ea-5105caadcb82	0e768453-97b3-4bc0-b111-4b4e421ef308	13fc49c5-e136-4169-8d1d-a604a62d1f61	INACTIVACION	2025-08-08 03:14:55.642723	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:14:56.364Z"}	2025-08-08 03:14:55.642723
212eacc7-7428-40bf-98c7-b459bb52dcd7	0e768453-97b3-4bc0-b111-4b4e421ef308	dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3	INACTIVACION	2025-08-08 03:14:55.642723	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "activo": false, "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:14:56.496Z"}	2025-08-08 03:14:55.642723
4e8aba6b-9489-48f6-b2c4-725d50eaf149	0e768453-97b3-4bc0-b111-4b4e421ef308	87534491-5e52-4baf-80d0-5a625eed26ea	INACTIVACION	2025-08-08 03:20:26.157822	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "activo": false, "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:20:26.562Z"}	2025-08-08 03:20:26.157822
864cda4b-598d-4d53-b051-6d4875102256	0e768453-97b3-4bc0-b111-4b4e421ef308	fc388a81-08b5-44d2-8788-46622bfe82ab	INACTIVACION	2025-08-08 03:20:26.157822	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:20:26.703Z"}	2025-08-08 03:20:26.157822
70c42cfa-7ab1-4183-ad4c-046ed61b6593	0e768453-97b3-4bc0-b111-4b4e421ef308	00e48582-9ff6-4e05-9321-8137313df33b	INACTIVACION	2025-08-08 03:20:26.157822	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:20:26.916Z"}	2025-08-08 03:20:26.157822
faf4134e-1f58-4c11-8f76-83854c7d176c	0e768453-97b3-4bc0-b111-4b4e421ef308	6b408450-7f0b-4b2d-a79b-6064810f3b2f	INACTIVACION	2025-08-08 03:20:26.157822	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:20:27.060Z"}	2025-08-08 03:20:26.157822
2564449a-ee5a-415d-a597-0c7d5bd3b540	0e768453-97b3-4bc0-b111-4b4e421ef308	13fc49c5-e136-4169-8d1d-a604a62d1f61	INACTIVACION	2025-08-08 03:20:26.157822	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:20:27.188Z"}	2025-08-08 03:20:26.157822
0b5f08d7-16ae-48fc-b0c6-0c7f974886a3	0e768453-97b3-4bc0-b111-4b4e421ef308	dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3	INACTIVACION	2025-08-08 03:20:26.157822	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "activo": false, "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:20:27.350Z"}	2025-08-08 03:20:26.157822
f58f0ff6-3079-47d1-ae00-90bcaf060e80	0e768453-97b3-4bc0-b111-4b4e421ef308	87534491-5e52-4baf-80d0-5a625eed26ea	INACTIVACION	2025-08-08 03:26:49.365588	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "87534491-5e52-4baf-80d0-5a625eed26ea", "activo": false, "sueldo_base": 560000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:26:49.785Z"}	2025-08-08 03:26:49.365588
25a2714f-4881-483b-9e15-3799688e9ba1	0e768453-97b3-4bc0-b111-4b4e421ef308	fc388a81-08b5-44d2-8788-46622bfe82ab	INACTIVACION	2025-08-08 03:26:49.365588	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:26:49.935Z"}	2025-08-08 03:26:49.365588
fb2ea23b-2577-4e4e-b671-c63ce2ba5418	0e768453-97b3-4bc0-b111-4b4e421ef308	00e48582-9ff6-4e05-9321-8137313df33b	INACTIVACION	2025-08-08 03:26:49.365588	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:26:50.074Z"}	2025-08-08 03:26:49.365588
7613d056-12a1-4652-a3ed-b195aa306775	0e768453-97b3-4bc0-b111-4b4e421ef308	6b408450-7f0b-4b2d-a79b-6064810f3b2f	INACTIVACION	2025-08-08 03:26:49.365588	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:26:50.255Z"}	2025-08-08 03:26:49.365588
7180f90b-e0d2-4589-90fd-7a7186a8f754	0e768453-97b3-4bc0-b111-4b4e421ef308	13fc49c5-e136-4169-8d1d-a604a62d1f61	INACTIVACION	2025-08-08 03:26:49.365588	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:26:50.425Z"}	2025-08-08 03:26:49.365588
88d01380-a23e-4ada-97e1-5793efdeb8f8	0e768453-97b3-4bc0-b111-4b4e421ef308	dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3	INACTIVACION	2025-08-08 03:26:49.365588	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "dac6ded9-7cdd-40e2-96a2-3cb0b22ae2a3", "activo": false, "sueldo_base": 550000, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T03:26:51.054Z"}	2025-08-08 03:26:49.365588
96de150d-7f10-4b0f-8a49-9f1c47df64d1	0e768453-97b3-4bc0-b111-4b4e421ef308	fc388a81-08b5-44d2-8788-46622bfe82ab	INACTIVACION	2025-08-08 04:13:34.192011	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "fc388a81-08b5-44d2-8788-46622bfe82ab", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T04:13:34.498Z"}	2025-08-08 04:13:34.192011
774fea77-885c-4335-af53-c0a8da478c52	0e768453-97b3-4bc0-b111-4b4e421ef308	00e48582-9ff6-4e05-9321-8137313df33b	INACTIVACION	2025-08-08 04:13:34.192011	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "00e48582-9ff6-4e05-9321-8137313df33b", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T04:13:34.646Z"}	2025-08-08 04:13:34.192011
ef8298bd-f67d-4496-b6da-211731235176	0e768453-97b3-4bc0-b111-4b4e421ef308	6b408450-7f0b-4b2d-a79b-6064810f3b2f	INACTIVACION	2025-08-08 04:13:34.192011	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "6b408450-7f0b-4b2d-a79b-6064810f3b2f", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T04:13:34.782Z"}	2025-08-08 04:13:34.192011
20d2b311-481b-4923-9e78-24cb4ad70b8d	0e768453-97b3-4bc0-b111-4b4e421ef308	13fc49c5-e136-4169-8d1d-a604a62d1f61	INACTIVACION	2025-08-08 04:13:34.192011	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "13fc49c5-e136-4169-8d1d-a604a62d1f61", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T04:13:34.919Z"}	2025-08-08 04:13:34.192011
828b74d1-efe6-4fb4-a3c6-04d1b889ac34	0e768453-97b3-4bc0-b111-4b4e421ef308	a527c2c6-864a-46f1-a9f0-1fb7ada6e935	INACTIVACION	2025-08-08 04:14:06.756074	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "a527c2c6-864a-46f1-a9f0-1fb7ada6e935", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "a527c2c6-864a-46f1-a9f0-1fb7ada6e935", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T04:14:07.051Z"}	2025-08-08 04:14:06.756074
2b6bd669-ccca-4b8b-b0c9-c243039ea6c6	0e768453-97b3-4bc0-b111-4b4e421ef308	da666d9f-8758-435b-ae7b-4cb6bedc5176	INACTIVACION	2025-08-08 04:23:09.896855	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "da666d9f-8758-435b-ae7b-4cb6bedc5176", "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "da666d9f-8758-435b-ae7b-4cb6bedc5176", "activo": false, "sueldo_base": 0, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T04:23:10.208Z"}	2025-08-08 04:23:09.896855
08cbd76f-0cf4-44e0-a586-33c6d6761b6d	0e768453-97b3-4bc0-b111-4b4e421ef308	14a951e8-7cf5-443b-90ac-f20c91335b1e	INACTIVACION	2025-08-08 05:01:03.750319	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "14a951e8-7cf5-443b-90ac-f20c91335b1e", "sueldo_base": 0, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "14a951e8-7cf5-443b-90ac-f20c91335b1e", "activo": false, "sueldo_base": 0, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T05:01:04.094Z"}	2025-08-08 05:01:03.750319
3a1d43a4-24eb-4dac-b344-1c66357fcdce	0e768453-97b3-4bc0-b111-4b4e421ef308	6fb7aecb-267d-4003-8486-66e576e915c5	INACTIVACION	2025-08-08 05:10:35.184133	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "6fb7aecb-267d-4003-8486-66e576e915c5", "sueldo_base": 0, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "6fb7aecb-267d-4003-8486-66e576e915c5", "activo": false, "sueldo_base": 0, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T05:10:35.488Z"}	2025-08-08 05:10:35.184133
8ef27491-9187-4a55-b23c-3efbadc53828	0e768453-97b3-4bc0-b111-4b4e421ef308	172a4744-5b8a-4be4-a2ee-0f02e856dbf7	INACTIVACION	2025-08-08 05:11:06.57989	Estructura inactivada por inactivación del rol: Inactivación desde instalación	\N	{"id": "172a4744-5b8a-4be4-a2ee-0f02e856dbf7", "sueldo_base": 0, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308"}	{"id": "172a4744-5b8a-4be4-a2ee-0f02e856dbf7", "activo": false, "sueldo_base": 0, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "rol_servicio_id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "fecha_inactivacion": "2025-08-08T05:11:06.886Z"}	2025-08-08 05:11:06.57989
e8999b85-b5a8-471b-85c3-802d40e7ff69	0e768453-97b3-4bc0-b111-4b4e421ef308	a46fb3b9-8181-4bf6-babf-e41d4de85496	INACTIVACION	2025-08-08 05:38:52.745153	Inactivación de estructura	\N	{"activo": true}	{"activo": false}	2025-08-08 05:38:52.745153
3716a14c-c413-40e2-bc1e-88e223087ea8	0e768453-97b3-4bc0-b111-4b4e421ef308	38aa544a-bb88-4906-9943-ddb3d41f10c0	INACTIVACION	2025-08-08 05:47:50.709925	Inactivación de estructura	\N	{"activo": true}	{"activo": false}	2025-08-08 05:47:50.709925
\.


--
-- Data for Name: sueldo_historial_roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sueldo_historial_roles (id, rol_servicio_id, accion, fecha_accion, detalles, usuario_id, datos_anteriores, datos_nuevos, created_at) FROM stdin;
9a799de4-bdb0-4eb8-b98b-fbb4ce440d5f	e4a42f1e-4a80-4a00-b428-77a9915b8604	INACTIVACION	2025-08-07 17:25:44.157627	Prueba de inactivación completa	\N	{"rol": {"id": "e4a42f1e-4a80-4a00-b428-77a9915b8604", "estado": "Inactivo", "nombre": "Noche 4x4x12 / 20:00 08:00"}, "estructura": {"id": "e97a9ec2-25b1-4145-a951-35d674f7177e", "sueldo_base": 680000, "rol_servicio_id": "e4a42f1e-4a80-4a00-b428-77a9915b8604"}}	\N	2025-08-07 17:25:44.157627
3fca7096-fb57-43cf-aae9-c2fe1a9ab5f8	48bc7016-ff20-44f6-a36d-b010280ab7ce	INACTIVACION	2025-08-07 17:35:00.659147	Inactivación manual	\N	{"rol": {"id": "48bc7016-ff20-44f6-a36d-b010280ab7ce", "estado": "Inactivo", "nombre": "Test Inactivación 3x3x12 / 06:00 18:00"}, "estructura": {"id": "bd9fd49d-d327-4a0c-ade2-1e2433c79484", "sueldo_base": 680000, "rol_servicio_id": "48bc7016-ff20-44f6-a36d-b010280ab7ce"}}	\N	2025-08-07 17:35:00.659147
b0ea1c9d-87c3-4607-8425-a8f6d1b7ce33	48bc7016-ff20-44f6-a36d-b010280ab7ce	INACTIVACION	2025-08-07 23:51:37.686063	Inactivación manual	\N	{"rol": {"id": "48bc7016-ff20-44f6-a36d-b010280ab7ce", "estado": "Inactivo", "nombre": "Test Inactivación 3x3x12 / 06:00 18:00"}, "estructura": {"id": "bd9fd49d-d327-4a0c-ade2-1e2433c79484", "sueldo_base": 680000, "rol_servicio_id": "48bc7016-ff20-44f6-a36d-b010280ab7ce"}}	\N	2025-08-07 23:51:37.686063
169fb776-ad03-4fc2-9b6d-04a232ee98d4	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 01:44:15.181664	Prueba de inactivación de rol	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Inactivo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_afectadas": 5}	\N	2025-08-08 01:44:15.181664
b6701b81-7cb4-4c20-9b2a-8c9ca404721c	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 01:54:53.101177	Prueba de inactivación de rol	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Inactivo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_afectadas": 0}	\N	2025-08-08 01:54:53.101177
f3f75ac1-ec5f-44c5-8f10-488bd0423176	0e768453-97b3-4bc0-b111-4b4e421ef308	REACTIVACION	2025-08-08 01:58:05.821732	Prueba de reactivación de rol	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Activo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_activadas": 6}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 01:58:05.821732
36c62019-248b-47b1-baed-e6ebb11577b0	48bc7016-ff20-44f6-a36d-b010280ab7ce	REACTIVACION	2025-08-08 02:02:22.391826	Prueba de activación	\N	{"rol": {"id": "48bc7016-ff20-44f6-a36d-b010280ab7ce", "estado": "Activo", "nombre": "Test Inactivación 3x3x12 / 06:00 18:00"}, "estructuras_activadas": 0}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 02:02:22.391826
b018b0a6-2e29-4162-b436-f5c4a23198d1	48bc7016-ff20-44f6-a36d-b010280ab7ce	REACTIVACION	2025-08-08 02:02:27.156677	Prueba de reactivación de rol	\N	{"rol": {"id": "48bc7016-ff20-44f6-a36d-b010280ab7ce", "estado": "Activo", "nombre": "Test Inactivación 3x3x12 / 06:00 18:00"}, "estructuras_activadas": 0}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 02:02:27.156677
84adee87-8ffd-4372-9c78-ae3495b371f3	0e768453-97b3-4bc0-b111-4b4e421ef308	ACTIVACION	2025-08-08 02:11:52.406277	Prueba de activación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Activo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_activadas": 6}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 02:11:52.406277
2d9f3d0e-88a1-4ed8-a038-3395b75e39c3	0e768453-97b3-4bc0-b111-4b4e421ef308	REACTIVACION	2025-08-08 02:11:57.803434	Prueba de reactivación de rol	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Activo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_activadas": 6}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 02:11:57.803434
d94675d8-7539-4878-9385-3e5f07453c9c	0e768453-97b3-4bc0-b111-4b4e421ef308	REACTIVACION	2025-08-08 02:32:23.231298	Prueba de activación después de corrección	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Activo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_activadas": 6}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 02:32:23.231298
7bd26a09-51c2-4d9c-9d6f-45b17cccc25d	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 02:32:29.294619	Crear estructuras inactivas para prueba	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Inactivo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_afectadas": 6}	\N	2025-08-08 02:32:29.294619
a709d9e0-5529-4f72-9732-3a4a15201066	0e768453-97b3-4bc0-b111-4b4e421ef308	REACTIVACION	2025-08-08 02:49:15.788689	Reactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Activo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_activadas": 6}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 02:49:15.788689
476e3077-ce10-4a21-83a9-67473b200a57	0e768453-97b3-4bc0-b111-4b4e421ef308	REACTIVACION	2025-08-08 02:49:33.473608	Reactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Activo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_activadas": 6}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 02:49:33.473608
deb129d5-30f8-4de6-8a05-01e123d1aadb	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 02:52:37.039332	UI test	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Inactivo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_afectadas": 6}	\N	2025-08-08 02:52:37.039332
86707b17-4aa3-4438-b471-7981f8450567	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 02:53:36.538015	Inactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Inactivo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_afectadas": 0}	\N	2025-08-08 02:53:36.538015
71fa300e-8ab4-4245-a484-09915a7ac128	0e768453-97b3-4bc0-b111-4b4e421ef308	REACTIVACION	2025-08-08 02:54:38.80894	Reactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Activo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_activadas": 6}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 02:54:38.80894
e505d743-ea69-43c5-b5c3-42050c56aa31	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 03:01:55.995925	Inactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Inactivo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_afectadas": 6}	\N	2025-08-08 03:01:55.995925
c28ded48-bd05-4916-a18c-ee263c351e06	0e768453-97b3-4bc0-b111-4b4e421ef308	REACTIVACION	2025-08-08 03:03:12.590488	Reactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Activo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_activadas": 6}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 03:03:12.590488
cc57b044-1766-4943-ada1-0bffc414de36	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 03:10:37.165999	Inactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Inactivo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_afectadas": 6}	\N	2025-08-08 03:10:37.165999
2f5867f1-b9ba-4656-8b55-71ad15bd13c6	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 03:10:45.835041	Inactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Inactivo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_afectadas": 0}	\N	2025-08-08 03:10:45.835041
9e23c705-e1b7-4032-94c1-42433526d5e2	0e768453-97b3-4bc0-b111-4b4e421ef308	REACTIVACION	2025-08-08 03:11:50.795853	Reactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Activo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_activadas": 6}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 03:11:50.795853
c8118373-df15-4ea0-94b6-c4005a06181c	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 03:13:36.661915	Inactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Inactivo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_afectadas": 6}	\N	2025-08-08 03:13:36.661915
cd19b2b7-989e-4f0f-a1a9-8e5e5d2e650b	0e768453-97b3-4bc0-b111-4b4e421ef308	REACTIVACION	2025-08-08 03:13:47.641577	Reactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Activo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_activadas": 6}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 03:13:47.641577
5c9134c7-f327-4499-b83e-c75588074de1	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 03:14:55.642723	Inactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Inactivo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_afectadas": 6}	\N	2025-08-08 03:14:55.642723
e8f937b3-9e33-445e-9068-c6c7950bc9c9	0e768453-97b3-4bc0-b111-4b4e421ef308	REACTIVACION	2025-08-08 03:18:30.540928	Reactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Activo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_activadas": 6}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 03:18:30.540928
acbdee49-89e2-4b26-bc38-c9ef6ff27b17	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 03:20:26.157822	Inactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Inactivo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_afectadas": 6}	\N	2025-08-08 03:20:26.157822
01d98804-0718-4d92-997c-112d10831867	0e768453-97b3-4bc0-b111-4b4e421ef308	REACTIVACION	2025-08-08 03:24:53.109103	Reactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Activo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_activadas": 6}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 03:24:53.109103
162a241c-eed6-4d36-ac64-4f7b442bd50a	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 03:26:49.365588	Inactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "estado": "Inactivo", "nombre": "Día 4x4x12 / 08:00 20:00"}, "estructuras_afectadas": 6}	\N	2025-08-08 03:26:49.365588
b4d91dce-9d4d-4a61-bfd8-69ed6dca7fc6	0e768453-97b3-4bc0-b111-4b4e421ef308	REACTIVACION	2025-08-08 03:30:58.070901	Reactivación desde instalación	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "nombre": "Día 4x4x12 / 08:00 20:00"}, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "estructuras_activadas": 4}	{"rol_estado": "Inactivo", "estructuras_activas": 0}	2025-08-08 03:30:58.070901
a3a9453e-5405-4828-a65b-7ed2c81de7a0	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 04:13:34.192011	Inactivación desde instalación (instalacion_id=7e05a55d-8db6-4c20-b51c-509f09d69f74)	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "nombre": "Día 4x4x12 / 08:00 20:00"}, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "estructuras_afectadas": 4}	\N	2025-08-08 04:13:34.192011
a4961e68-e295-4f45-a768-3122c7ec74ea	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 04:14:06.756074	Inactivación desde instalación (instalacion_id=7e05a55d-8db6-4c20-b51c-509f09d69f74)	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "nombre": "Día 4x4x12 / 08:00 20:00"}, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "estructuras_afectadas": 1}	\N	2025-08-08 04:14:06.756074
5b75f069-21bf-42ff-9098-024155c47764	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 04:23:09.896855	Inactivación desde instalación (instalacion_id=7e05a55d-8db6-4c20-b51c-509f09d69f74)	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "nombre": "Día 4x4x12 / 08:00 20:00"}, "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74", "estructuras_afectadas": 1}	\N	2025-08-08 04:23:09.896855
9fa208a5-8b6e-4888-8836-24edf16805bd	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 05:01:03.750319	Inactivación desde instalación (instalacion_id=0e8ba906-e64b-4d4d-a104-ba29f21f48a9)	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "nombre": "Día 4x4x12 / 08:00 20:00"}, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "estructuras_afectadas": 1}	\N	2025-08-08 05:01:03.750319
befdb522-c0cf-47a6-af84-7dafd8dc97c5	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 05:10:35.184133	Inactivación desde instalación (instalacion_id=0e8ba906-e64b-4d4d-a104-ba29f21f48a9)	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "nombre": "Día 4x4x12 / 08:00 20:00"}, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "estructuras_afectadas": 1}	\N	2025-08-08 05:10:35.184133
24fbc1d8-52f2-4c37-bf6f-a6aade4d8609	0e768453-97b3-4bc0-b111-4b4e421ef308	INACTIVACION	2025-08-08 05:11:06.57989	Inactivación desde instalación (instalacion_id=0e8ba906-e64b-4d4d-a104-ba29f21f48a9)	\N	{"rol": {"id": "0e768453-97b3-4bc0-b111-4b4e421ef308", "nombre": "Día 4x4x12 / 08:00 20:00"}, "instalacion_id": "0e8ba906-e64b-4d4d-a104-ba29f21f48a9", "estructuras_afectadas": 1}	\N	2025-08-08 05:11:06.57989
\.


--
-- Data for Name: sueldo_isapre; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sueldo_isapre (id, nombre, plan, valor_uf) FROM stdin;
\.


--
-- Data for Name: sueldo_mutualidad; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sueldo_mutualidad (id, entidad, tasa) FROM stdin;
1	ACHS	0.9300
2	IST	0.9300
3	ISL	1.0000
\.


--
-- Data for Name: sueldo_parametros_generales; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sueldo_parametros_generales (id, periodo, parametro, valor, descripcion, created_at, updated_at) FROM stdin;
22	2025-08	UF_TOPE_IMPONIBLE	87.8000	Tope imponible en UF para cotizaciones previsionales	2025-08-06 18:55:55.254089	2025-08-06 18:55:55.254089
23	2025-08	INGRESO_MINIMO	529000.0000	Ingreso mínimo mensual	2025-08-06 18:55:55.254089	2025-08-06 18:55:55.254089
24	2025-08	TOPE_GRATIFICACION_ANUAL	2512750.0000	Tope anual gratificación (4.75 ingresos mínimos)	2025-08-06 18:55:55.254089	2025-08-06 18:55:55.254089
25	2025-08	TOPE_GRATIFICACION_MENSUAL	209396.0000	Tope mensual gratificación (4.75 IM / 12)	2025-08-06 18:55:55.254089	2025-08-06 18:55:55.254089
26	2025-08	TASA_FONASA	7.0000	Tasa de cotización FONASA (%)	2025-08-06 18:55:55.254089	2025-08-06 18:55:55.254089
27	2025-08	HORAS_SEMANALES_JORNADA	44.0000	Jornada semanal legal en horas	2025-08-06 18:55:55.254089	2025-08-06 18:55:55.254089
28	2025-08	TASA_SIS	1.8800	Tasa SIS	2025-08-06 18:55:55.254089	2025-08-06 18:55:55.254089
29	2025-08	TASA_REFORMA_2025	6.0000	Tasa reforma previsional 2025	2025-08-06 18:55:55.254089	2025-08-06 18:55:55.254089
\.


--
-- Data for Name: sueldo_tramos_impuesto; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sueldo_tramos_impuesto (id, tramo, desde, hasta, factor, rebaja, periodo, tasa_max) FROM stdin;
8	1	0.00	1500000.00	0.0000	0.00	2025-08	\N
9	2	1500000.01	2500000.00	0.0400	60000.00	2025-08	\N
10	3	2500000.01	3500000.00	0.0800	160000.00	2025-08	\N
11	4	3500000.01	4500000.00	0.1350	327500.00	2025-08	\N
12	5	4500000.01	5500000.00	0.2300	765000.00	2025-08	\N
13	6	5500000.01	7500000.00	0.3040	1156500.00	2025-08	\N
14	7	7500000.01	10000000.00	0.3500	1656500.00	2025-08	\N
15	8	10000000.01	\N	0.4000	2156500.00	2025-08	\N
\.


--
-- Data for Name: sueldo_valor_uf; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sueldo_valor_uf (fecha, valor) FROM stdin;
2024-12-01	37665.8400
2025-01-01	37746.5600
2025-02-01	37800.0000
2025-03-01	37850.0000
2025-04-01	37900.0000
2025-05-01	37950.0000
2025-06-01	38000.0000
2025-07-01	38050.0000
2025-08-01	38100.0000
2025-09-01	38150.0000
2025-10-01	38200.0000
2025-11-01	38250.0000
2025-12-01	38300.0000
\.


--
-- Data for Name: te_planillas_turnos_extras; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.te_planillas_turnos_extras (id, fecha_generacion, usuario_id, monto_total, cantidad_turnos, estado, fecha_pago, observaciones, created_at, updated_at, codigo) FROM stdin;
4	2025-08-06 03:56:55.273707	56f6a58d-769c-4a35-83b2-18b4a243ed64	120000.00	4	pagada	2025-08-06 04:00:22.568762	\N	2025-08-06 03:56:55.273707	2025-08-06 04:00:22.568762	TE-2025-08-0001
\.


--
-- Data for Name: te_turnos_extras; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.te_turnos_extras (id, guardia_id, instalacion_id, puesto_id, pauta_id, fecha, estado, valor, created_at, updated_at, pagado, fecha_pago, observaciones_pago, usuario_pago, tenant_id, planilla_id, preservado, turno_original_id, desacoplado_en) FROM stdin;
90f9c964-f21c-4a78-84fb-a20ce230b890	d8083f2a-d246-4ec1-9c77-d92d8bde496b	7e05a55d-8db6-4c20-b51c-509f09d69f74	704e202e-b502-49fc-9c90-f4a97fec46a6	1848	2025-08-04	ppc	30000.00	2025-08-05 16:57:52.007595	2025-08-05 22:59:15.646774	t	2025-08-06	\N	56f6a58d-769c-4a35-83b2-18b4a243ed64	accebf8a-bacc-41fa-9601-ed39cb320a52	4	f	\N	\N
390fc7db-d1ca-4f90-8e41-adf4e41994bc	40d7e2cb-de31-45e5-99c5-1e965daed7e9	7e05a55d-8db6-4c20-b51c-509f09d69f74	a81d9847-ddd8-4771-9d45-012a24dd0839	1910	2025-08-04	reemplazo	30000.00	2025-08-05 16:58:06.88166	2025-08-05 22:59:15.646774	t	2025-08-06	\N	56f6a58d-769c-4a35-83b2-18b4a243ed64	accebf8a-bacc-41fa-9601-ed39cb320a52	4	f	\N	\N
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tenants (id, nombre, rut, created_at, activo, updated_at) FROM stdin;
accebf8a-bacc-41fa-9601-ed39cb320a52	GardOps	77.840.623-3	2025-07-28 05:26:46.835835+00	t	2025-07-28 13:09:56.966891
1cee3c7c-5cfb-4db9-83e5-26a20b6d6dc0	Empresa Demo	76.987.431-3	2025-07-28 06:11:02.809342+00	t	2025-07-28 13:09:56.966891
1397e653-a702-4020-9702-3ae4f3f8b337	Gard	\N	2025-08-06 18:36:31.386406+00	t	2025-08-06 18:36:31.386406
\.


--
-- Data for Name: tipos_documentos; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tipos_documentos (id, modulo, nombre, activo, creado_en, requiere_vencimiento, dias_antes_alarma, tenant_id) FROM stdin;
713d6d71-e812-4b58-9c41-b66303be232d	clientes	Contrato	t	2025-08-06 19:48:21.477324	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
6dff4dba-0baf-4918-bb12-e83c2db14f47	clientes	Factura	t	2025-08-06 19:48:21.803837	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
1f30ed93-8e5c-4cb6-857f-9d65407e8de3	clientes	Certificado	t	2025-08-06 19:48:22.130602	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
5c9a7171-5d93-4292-a533-d906ac2d009e	clientes	Identificación	t	2025-08-06 19:48:22.45464	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
7841c9f8-fb6e-439b-a7c4-ebbf6d57ab25	guardias	Contrato Laboral	t	2025-08-06 19:48:22.781613	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
408d1a75-efc4-4826-abc6-fc5e86ce3ebb	guardias	Certificado Médico	t	2025-08-06 19:48:23.111201	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
50845ef3-6f3f-4448-99e7-4cea67a33284	guardias	Antecedentes	t	2025-08-06 19:48:23.437777	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
c43875cb-750d-443b-b280-5d73fe387972	guardias	Certificado de Capacitación	t	2025-08-06 19:48:23.764533	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
1f57fee8-fb1d-4432-a649-89bfffbb6ba4	instalaciones	Plano	t	2025-08-06 19:48:24.090545	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
68dd27c9-c605-4b29-905e-102e7ffde225	instalaciones	Certificado de Seguridad	t	2025-08-06 19:48:24.415599	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
86db13a4-dec3-4511-98de-40c7948a62ea	instalaciones	Manual de Procedimientos	t	2025-08-06 19:48:24.737111	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
315b9c9d-889a-45e5-8904-579f917a446c	pautas	Pauta Mensual	t	2025-08-06 19:48:25.063753	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
331fed04-6219-4df9-afd4-53f2a3415076	pautas	Pauta Diaria	t	2025-08-06 19:48:25.388492	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
b72f61aa-850b-4aa4-b483-490e606003f0	planillas	Planilla de Asistencia	t	2025-08-06 19:48:25.717477	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
b0034eac-5f98-436c-8fce-9ab08ec5be4a	planillas	Planilla de Horas Extras	t	2025-08-06 19:48:26.041494	f	30	1397e653-a702-4020-9702-3ae4f3f8b337
\.


--
-- Data for Name: turnos_extras; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.turnos_extras (id, tenant_id, pauta_diaria_id, guardia_id, instalacion_origen_id, instalacion_destino_id, tipo, aprobado_por, observacion, creado_en) FROM stdin;
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.usuarios (id, tenant_id, email, password, nombre, apellido, rol, activo, fecha_creacion, ultimo_acceso, telefono, avatar) FROM stdin;
bd3b321c-cc5a-4892-b15e-0779c37d8141	accebf8a-bacc-41fa-9601-ed39cb320a52	carlos.irigoyen@gard.cl	$2b$10$IinVQSUA8D9UxKJCqhllROYKYR9s.KSfK/upQL3x217r1P0SqfneK	Carlos	Irigoyen	admin	t	2025-08-08 11:54:16.396874	\N	+56 9 1234 5678	\N
e40a434c-2485-4d71-b075-219b44938116	accebf8a-bacc-41fa-9601-ed39cb320a52	supervisor@gardops.com	$2b$10$bjNIKIRIxxrcyn63rsaFf.BKR1eYG3qm9tA3uiRsbpPco3IA4QSAm	Juan	Supervisor	supervisor	t	2025-08-08 11:54:16.5395	\N	+56 9 8765 4321	\N
35e43410-9789-4468-8d1a-1d336c1799d0	accebf8a-bacc-41fa-9601-ed39cb320a52	guardia@gardops.com	$2b$10$VbYsVtYfHfNEh7wSr5s2OerKULX.tSwYRK3SdXN2T.zM3dnG5/uLC	Pedro	Guardia	guardia	t	2025-08-08 11:54:16.661376	\N	+56 9 5555 5555	\N
\.


--
-- Data for Name: usuarios_permisos; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.usuarios_permisos (id, rol_id, modulo, accion, tenant_id, updated_at) FROM stdin;
\.


--
-- Data for Name: usuarios_roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.usuarios_roles (id, nombre, tenant_id, updated_at) FROM stdin;
\.


--
-- Name: as_turnos_pauta_mensual_new_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.as_turnos_pauta_mensual_new_id_seq', 2278, true);


--
-- Name: planillas_turnos_extras_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.planillas_turnos_extras_id_seq', 5, true);


--
-- Name: sueldo_afp_new_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.sueldo_afp_new_id_seq', 14, true);


--
-- Name: sueldo_asignacion_familiar_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.sueldo_asignacion_familiar_id_seq', 13, true);


--
-- Name: sueldo_isapre_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.sueldo_isapre_id_seq', 1, false);


--
-- Name: sueldo_mutualidad_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.sueldo_mutualidad_id_seq', 3, true);


--
-- Name: sueldo_parametros_generales_new_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.sueldo_parametros_generales_new_id_seq1', 29, true);


--
-- Name: sueldo_tramos_impuesto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.sueldo_tramos_impuesto_id_seq', 31, true);


--
-- Name: afps afps_nombre_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.afps
    ADD CONSTRAINT afps_nombre_key UNIQUE (nombre);


--
-- Name: afps afps_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.afps
    ADD CONSTRAINT afps_pkey PRIMARY KEY (id);


--
-- Name: alertas_documentos alertas_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.alertas_documentos
    ADD CONSTRAINT alertas_documentos_pkey PRIMARY KEY (id);


--
-- Name: as_turnos_pauta_mensual as_turnos_pauta_mensual_new_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.as_turnos_pauta_mensual
    ADD CONSTRAINT as_turnos_pauta_mensual_new_pkey PRIMARY KEY (id);


--
-- Name: as_turnos_pauta_mensual as_turnos_pauta_mensual_unique_puesto_fecha; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.as_turnos_pauta_mensual
    ADD CONSTRAINT as_turnos_pauta_mensual_unique_puesto_fecha UNIQUE (puesto_id, anio, mes, dia);


--
-- Name: as_turnos_puestos_operativos as_turnos_puestos_operativos_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.as_turnos_puestos_operativos
    ADD CONSTRAINT as_turnos_puestos_operativos_pkey PRIMARY KEY (id);


--
-- Name: bancos bancos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bancos
    ADD CONSTRAINT bancos_codigo_key UNIQUE (codigo);


--
-- Name: bancos bancos_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bancos
    ADD CONSTRAINT bancos_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_rut_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_rut_key UNIQUE (rut);


--
-- Name: comunas comunas_nombre_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comunas
    ADD CONSTRAINT comunas_nombre_key UNIQUE (nombre);


--
-- Name: comunas comunas_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comunas
    ADD CONSTRAINT comunas_pkey PRIMARY KEY (id);


--
-- Name: doc_templates doc_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doc_templates
    ADD CONSTRAINT doc_templates_pkey PRIMARY KEY (id);


--
-- Name: documentos_clientes documentos_clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_clientes
    ADD CONSTRAINT documentos_clientes_pkey PRIMARY KEY (id);


--
-- Name: documentos_guardias documentos_guardias_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_guardias
    ADD CONSTRAINT documentos_guardias_pkey PRIMARY KEY (id);


--
-- Name: documentos_instalacion documentos_instalacion_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_instalacion
    ADD CONSTRAINT documentos_instalacion_pkey PRIMARY KEY (id);


--
-- Name: documentos documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_pkey PRIMARY KEY (id);


--
-- Name: documentos_usuarios documentos_usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_usuarios
    ADD CONSTRAINT documentos_usuarios_pkey PRIMARY KEY (id);


--
-- Name: firmas firmas_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.firmas
    ADD CONSTRAINT firmas_pkey PRIMARY KEY (id);


--
-- Name: guardias guardias_temp_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.guardias
    ADD CONSTRAINT guardias_temp_email_key UNIQUE (email);


--
-- Name: guardias guardias_temp_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.guardias
    ADD CONSTRAINT guardias_temp_pkey PRIMARY KEY (id);


--
-- Name: sueldo_historial_estructuras idx_historial_estructuras_id; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_historial_estructuras
    ADD CONSTRAINT idx_historial_estructuras_id PRIMARY KEY (id);


--
-- Name: sueldo_historial_estructuras idx_historial_estructuras_rol_estructura; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_historial_estructuras
    ADD CONSTRAINT idx_historial_estructuras_rol_estructura UNIQUE (rol_servicio_id, estructura_id, fecha_accion);


--
-- Name: sueldo_historial_roles idx_historial_roles_servicio_id; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_historial_roles
    ADD CONSTRAINT idx_historial_roles_servicio_id PRIMARY KEY (id);


--
-- Name: sueldo_historial_roles idx_historial_roles_servicio_rol_id; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_historial_roles
    ADD CONSTRAINT idx_historial_roles_servicio_rol_id UNIQUE (rol_servicio_id, fecha_accion);


--
-- Name: instalaciones instalaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.instalaciones
    ADD CONSTRAINT instalaciones_pkey PRIMARY KEY (id);


--
-- Name: isapres isapres_nombre_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.isapres
    ADD CONSTRAINT isapres_nombre_key UNIQUE (nombre);


--
-- Name: isapres isapres_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.isapres
    ADD CONSTRAINT isapres_pkey PRIMARY KEY (id);


--
-- Name: logs_clientes logs_clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_clientes
    ADD CONSTRAINT logs_clientes_pkey PRIMARY KEY (id);


--
-- Name: logs_documentos logs_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_documentos
    ADD CONSTRAINT logs_documentos_pkey PRIMARY KEY (id);


--
-- Name: logs_guardias logs_guardias_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_guardias
    ADD CONSTRAINT logs_guardias_pkey PRIMARY KEY (id);


--
-- Name: logs_instalaciones logs_instalaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_instalaciones
    ADD CONSTRAINT logs_instalaciones_pkey PRIMARY KEY (id);


--
-- Name: logs_pauta_diaria logs_pauta_diaria_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_pauta_diaria
    ADD CONSTRAINT logs_pauta_diaria_pkey PRIMARY KEY (id);


--
-- Name: logs_pauta_mensual logs_pauta_mensual_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_pauta_mensual
    ADD CONSTRAINT logs_pauta_mensual_pkey PRIMARY KEY (id);


--
-- Name: logs_puestos_operativos logs_puestos_operativos_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_puestos_operativos
    ADD CONSTRAINT logs_puestos_operativos_pkey PRIMARY KEY (id);


--
-- Name: logs_turnos_extras logs_turnos_extras_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_turnos_extras
    ADD CONSTRAINT logs_turnos_extras_pkey PRIMARY KEY (id);


--
-- Name: logs_usuarios logs_usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_usuarios
    ADD CONSTRAINT logs_usuarios_pkey PRIMARY KEY (id);


--
-- Name: pagos_turnos_extras pagos_turnos_extras_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pagos_turnos_extras
    ADD CONSTRAINT pagos_turnos_extras_pkey PRIMARY KEY (id);


--
-- Name: pautas_diarias pautas_diarias_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pautas_diarias
    ADD CONSTRAINT pautas_diarias_pkey PRIMARY KEY (id);


--
-- Name: pautas_mensuales pautas_mensuales_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pautas_mensuales
    ADD CONSTRAINT pautas_mensuales_pkey PRIMARY KEY (id);


--
-- Name: te_planillas_turnos_extras planillas_turnos_extras_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.te_planillas_turnos_extras
    ADD CONSTRAINT planillas_turnos_extras_pkey PRIMARY KEY (id);


--
-- Name: puestos_por_cubrir puestos_por_cubrir_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.puestos_por_cubrir
    ADD CONSTRAINT puestos_por_cubrir_pkey PRIMARY KEY (id);


--
-- Name: usuarios_roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.usuarios_roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: usuarios_roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.usuarios_roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: as_turnos_roles_servicio roles_servicio_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.as_turnos_roles_servicio
    ADD CONSTRAINT roles_servicio_pkey PRIMARY KEY (id);


--
-- Name: roles_servicio roles_servicio_pkey1; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles_servicio
    ADD CONSTRAINT roles_servicio_pkey1 PRIMARY KEY (id);


--
-- Name: rondas rondas_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rondas
    ADD CONSTRAINT rondas_pkey PRIMARY KEY (id);


--
-- Name: sueldo_afp sueldo_afp_new_periodo_codigo_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_afp
    ADD CONSTRAINT sueldo_afp_new_periodo_codigo_key UNIQUE (periodo, codigo);


--
-- Name: sueldo_afp sueldo_afp_new_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_afp
    ADD CONSTRAINT sueldo_afp_new_pkey PRIMARY KEY (id);


--
-- Name: sueldo_asignacion_familiar sueldo_asignacion_familiar_periodo_tramo_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_asignacion_familiar
    ADD CONSTRAINT sueldo_asignacion_familiar_periodo_tramo_key UNIQUE (periodo, tramo);


--
-- Name: sueldo_asignacion_familiar sueldo_asignacion_familiar_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_asignacion_familiar
    ADD CONSTRAINT sueldo_asignacion_familiar_pkey PRIMARY KEY (id);


--
-- Name: sueldo_bonos_globales sueldo_bonos_globales_nombre_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_bonos_globales
    ADD CONSTRAINT sueldo_bonos_globales_nombre_key UNIQUE (nombre);


--
-- Name: sueldo_bonos_globales sueldo_bonos_globales_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_bonos_globales
    ADD CONSTRAINT sueldo_bonos_globales_pkey PRIMARY KEY (id);


--
-- Name: sueldo_estructuras_servicio sueldo_estructuras_servicio_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_estructuras_servicio
    ADD CONSTRAINT sueldo_estructuras_servicio_pkey PRIMARY KEY (id);


--
-- Name: sueldo_isapre sueldo_isapre_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_isapre
    ADD CONSTRAINT sueldo_isapre_pkey PRIMARY KEY (id);


--
-- Name: sueldo_mutualidad sueldo_mutualidad_entidad_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_mutualidad
    ADD CONSTRAINT sueldo_mutualidad_entidad_key UNIQUE (entidad);


--
-- Name: sueldo_mutualidad sueldo_mutualidad_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_mutualidad
    ADD CONSTRAINT sueldo_mutualidad_pkey PRIMARY KEY (id);


--
-- Name: sueldo_parametros_generales sueldo_parametros_generales_new_periodo_parametro_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_parametros_generales
    ADD CONSTRAINT sueldo_parametros_generales_new_periodo_parametro_key UNIQUE (periodo, parametro);


--
-- Name: sueldo_parametros_generales sueldo_parametros_generales_new_pkey1; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_parametros_generales
    ADD CONSTRAINT sueldo_parametros_generales_new_pkey1 PRIMARY KEY (id);


--
-- Name: sueldo_tramos_impuesto sueldo_tramos_impuesto_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_tramos_impuesto
    ADD CONSTRAINT sueldo_tramos_impuesto_pkey PRIMARY KEY (id);


--
-- Name: sueldo_valor_uf sueldo_valor_uf_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_valor_uf
    ADD CONSTRAINT sueldo_valor_uf_pkey PRIMARY KEY (fecha);


--
-- Name: te_planillas_turnos_extras te_planillas_turnos_extras_codigo_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.te_planillas_turnos_extras
    ADD CONSTRAINT te_planillas_turnos_extras_codigo_key UNIQUE (codigo);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_rut_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_rut_key UNIQUE (rut);


--
-- Name: documentos_tipos tipos_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_tipos
    ADD CONSTRAINT tipos_documentos_pkey PRIMARY KEY (id);


--
-- Name: tipos_documentos tipos_documentos_pkey1; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tipos_documentos
    ADD CONSTRAINT tipos_documentos_pkey1 PRIMARY KEY (id);


--
-- Name: te_turnos_extras turnos_extras_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.te_turnos_extras
    ADD CONSTRAINT turnos_extras_pkey PRIMARY KEY (id);


--
-- Name: turnos_extras turnos_extras_pkey1; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.turnos_extras
    ADD CONSTRAINT turnos_extras_pkey1 PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios_permisos usuarios_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.usuarios_permisos
    ADD CONSTRAINT usuarios_permisos_pkey PRIMARY KEY (id);


--
-- Name: usuarios_permisos usuarios_permisos_rol_id_modulo_accion_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.usuarios_permisos
    ADD CONSTRAINT usuarios_permisos_rol_id_modulo_accion_key UNIQUE (rol_id, modulo, accion);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_afp_periodo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_afp_periodo ON public.sueldo_afp USING btree (periodo);


--
-- Name: idx_alertas_documentos_dias_restantes; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_alertas_documentos_dias_restantes ON public.alertas_documentos USING btree (dias_restantes);


--
-- Name: idx_alertas_documentos_documento_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_alertas_documentos_documento_id ON public.alertas_documentos USING btree (documento_id);


--
-- Name: idx_alertas_documentos_tenant_leida; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_alertas_documentos_tenant_leida ON public.alertas_documentos USING btree (tenant_id, leida);


--
-- Name: idx_as_turnos_pauta_mensual_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_as_turnos_pauta_mensual_estado ON public.as_turnos_pauta_mensual USING btree (estado);


--
-- Name: idx_as_turnos_pauta_mensual_fecha_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_as_turnos_pauta_mensual_fecha_estado ON public.as_turnos_pauta_mensual USING btree (anio, mes, dia, estado);


--
-- Name: idx_asignacion_periodo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_asignacion_periodo ON public.sueldo_asignacion_familiar USING btree (periodo);


--
-- Name: idx_bancos_codigo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_bancos_codigo ON public.bancos USING btree (codigo);


--
-- Name: idx_clientes_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_clientes_created_at ON public.clientes USING btree (created_at);


--
-- Name: idx_clientes_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_clientes_estado ON public.clientes USING btree (estado);


--
-- Name: idx_clientes_nombre; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_clientes_nombre ON public.clientes USING btree (nombre);


--
-- Name: idx_clientes_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_clientes_tenant ON public.clientes USING btree (tenant_id);


--
-- Name: idx_doc_templates_name; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_doc_templates_name ON public.doc_templates USING btree (name);


--
-- Name: idx_doc_templates_updated_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_doc_templates_updated_at ON public.doc_templates USING btree (updated_at);


--
-- Name: idx_documentos_clientes_cliente_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_clientes_cliente_id ON public.documentos_clientes USING btree (cliente_id);


--
-- Name: idx_documentos_clientes_cliente_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_clientes_cliente_tenant ON public.documentos_clientes USING btree (cliente_id, tenant_id);


--
-- Name: idx_documentos_clientes_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_clientes_created_at ON public.documentos_clientes USING btree (created_at);


--
-- Name: idx_documentos_clientes_fecha_vencimiento; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_clientes_fecha_vencimiento ON public.documentos_clientes USING btree (fecha_vencimiento);


--
-- Name: idx_documentos_clientes_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_clientes_tenant ON public.documentos_clientes USING btree (tenant_id);


--
-- Name: idx_documentos_clientes_tipo_documento; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_clientes_tipo_documento ON public.documentos_clientes USING btree (tipo_documento_id);


--
-- Name: idx_documentos_clientes_tipo_documento_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_clientes_tipo_documento_id ON public.documentos_clientes USING btree (tipo_documento_id);


--
-- Name: idx_documentos_fecha_vencimiento; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_fecha_vencimiento ON public.documentos_clientes USING btree (fecha_vencimiento);


--
-- Name: idx_documentos_guardia; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_guardia ON public.documentos USING btree (guardia_id);


--
-- Name: idx_documentos_guardia_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_guardia_tenant ON public.documentos USING btree (guardia_id, tenant_id);


--
-- Name: idx_documentos_guardias_fecha_vencimiento; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_guardias_fecha_vencimiento ON public.documentos_guardias USING btree (fecha_vencimiento);


--
-- Name: idx_documentos_guardias_guardia_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_guardias_guardia_tenant ON public.documentos_guardias USING btree (guardia_id, tenant_id);


--
-- Name: idx_documentos_guardias_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_guardias_tenant ON public.documentos_guardias USING btree (tenant_id);


--
-- Name: idx_documentos_guardias_tenant_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_guardias_tenant_id ON public.documentos_guardias USING btree (tenant_id);


--
-- Name: idx_documentos_guardias_tipo_documento_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_guardias_tipo_documento_id ON public.documentos_guardias USING btree (tipo_documento_id);


--
-- Name: idx_documentos_instalacion; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_instalacion ON public.documentos USING btree (instalacion_id);


--
-- Name: idx_documentos_instalacion_fecha_vencimiento; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_instalacion_fecha_vencimiento ON public.documentos_instalacion USING btree (fecha_vencimiento);


--
-- Name: idx_documentos_instalacion_instalacion_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_instalacion_instalacion_id ON public.documentos_instalacion USING btree (instalacion_id);


--
-- Name: idx_documentos_instalacion_instalacion_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_instalacion_instalacion_tenant ON public.documentos_instalacion USING btree (instalacion_id, tenant_id);


--
-- Name: idx_documentos_instalacion_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_instalacion_tenant ON public.documentos USING btree (instalacion_id, tenant_id);


--
-- Name: idx_documentos_instalacion_tenant_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_instalacion_tenant_id ON public.documentos_instalacion USING btree (tenant_id);


--
-- Name: idx_documentos_instalacion_tipo_documento_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_instalacion_tipo_documento_id ON public.documentos_instalacion USING btree (tipo_documento_id);


--
-- Name: idx_documentos_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_tenant ON public.documentos USING btree (tenant_id);


--
-- Name: idx_documentos_tipos_modulo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_tipos_modulo ON public.documentos_tipos USING btree (modulo);


--
-- Name: idx_documentos_tipos_modulo_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_tipos_modulo_tenant ON public.documentos_tipos USING btree (modulo, tenant_id);


--
-- Name: idx_documentos_tipos_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_tipos_tenant ON public.documentos_tipos USING btree (tenant_id);


--
-- Name: idx_documentos_usuarios_usuario_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_documentos_usuarios_usuario_id ON public.documentos_usuarios USING btree (usuario_id);


--
-- Name: idx_guardia_fecha_turno; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_guardia_fecha_turno ON public.te_turnos_extras USING btree (guardia_id, fecha);


--
-- Name: idx_guardias_activo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_activo ON public.guardias USING btree (activo);


--
-- Name: idx_guardias_banco; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_banco ON public.guardias USING btree (banco);


--
-- Name: idx_guardias_ciudad; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_ciudad ON public.guardias USING btree (ciudad);


--
-- Name: idx_guardias_comuna; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_comuna ON public.guardias USING btree (comuna);


--
-- Name: idx_guardias_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_created_at ON public.guardias USING btree (created_at);


--
-- Name: idx_guardias_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_email ON public.guardias USING btree (email);


--
-- Name: idx_guardias_instalacion_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_instalacion_id ON public.guardias USING btree (instalacion_id);


--
-- Name: idx_guardias_location; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_location ON public.guardias USING btree (latitud, longitud);


--
-- Name: idx_guardias_nombre_apellidos; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_nombre_apellidos ON public.guardias USING btree (apellido_paterno, apellido_materno, nombre);


--
-- Name: idx_guardias_numero_cuenta; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_numero_cuenta ON public.guardias USING btree (numero_cuenta);


--
-- Name: idx_guardias_rut; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_rut ON public.guardias USING btree (rut);


--
-- Name: idx_guardias_telefono; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_telefono ON public.guardias USING btree (telefono);


--
-- Name: idx_guardias_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_tenant ON public.guardias USING btree (tenant_id);


--
-- Name: idx_guardias_tipo_cuenta; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_tipo_cuenta ON public.guardias USING btree (tipo_cuenta);


--
-- Name: idx_guardias_usuario; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_guardias_usuario ON public.guardias USING btree (usuario_id);


--
-- Name: idx_historial_estructuras_accion; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_historial_estructuras_accion ON public.sueldo_historial_estructuras USING btree (accion);


--
-- Name: idx_historial_estructuras_estructura_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_historial_estructuras_estructura_id ON public.sueldo_historial_estructuras USING btree (estructura_id);


--
-- Name: idx_historial_estructuras_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_historial_estructuras_fecha ON public.sueldo_historial_estructuras USING btree (fecha_accion);


--
-- Name: idx_historial_estructuras_rol_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_historial_estructuras_rol_id ON public.sueldo_historial_estructuras USING btree (rol_servicio_id);


--
-- Name: idx_historial_roles_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_historial_roles_fecha ON public.sueldo_historial_roles USING btree (fecha_accion);


--
-- Name: idx_historial_roles_servicio_accion; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_historial_roles_servicio_accion ON public.sueldo_historial_roles USING btree (accion);


--
-- Name: idx_historial_roles_servicio_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_historial_roles_servicio_fecha ON public.sueldo_historial_roles USING btree (fecha_accion);


--
-- Name: idx_instalaciones_ciudad; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_instalaciones_ciudad ON public.instalaciones USING btree (ciudad);


--
-- Name: idx_instalaciones_cliente_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_instalaciones_cliente_estado ON public.instalaciones USING btree (cliente_id, estado);


--
-- Name: idx_instalaciones_cliente_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_instalaciones_cliente_id ON public.instalaciones USING btree (cliente_id);


--
-- Name: idx_instalaciones_comuna; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_instalaciones_comuna ON public.instalaciones USING btree (comuna);


--
-- Name: idx_instalaciones_comuna_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_instalaciones_comuna_estado ON public.instalaciones USING btree (comuna, estado);


--
-- Name: idx_instalaciones_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_instalaciones_created_at ON public.instalaciones USING btree (created_at);


--
-- Name: idx_instalaciones_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_instalaciones_estado ON public.instalaciones USING btree (estado);


--
-- Name: idx_instalaciones_nombre; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_instalaciones_nombre ON public.instalaciones USING btree (nombre);


--
-- Name: idx_instalaciones_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_instalaciones_tenant ON public.instalaciones USING btree (tenant_id);


--
-- Name: idx_logs_clientes_cliente_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_clientes_cliente_id ON public.logs_clientes USING btree (cliente_id);


--
-- Name: idx_logs_clientes_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_clientes_fecha ON public.logs_clientes USING btree (fecha DESC);


--
-- Name: idx_logs_documentos_documento_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_documentos_documento_id ON public.logs_documentos USING btree (documento_id);


--
-- Name: idx_logs_documentos_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_documentos_fecha ON public.logs_documentos USING btree (fecha);


--
-- Name: idx_logs_documentos_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_documentos_tenant ON public.logs_documentos USING btree (tenant_id);


--
-- Name: idx_logs_documentos_usuario; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_documentos_usuario ON public.logs_documentos USING btree (usuario);


--
-- Name: idx_logs_guardias_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_guardias_fecha ON public.logs_guardias USING btree (fecha);


--
-- Name: idx_logs_guardias_guardia_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_guardias_guardia_id ON public.logs_guardias USING btree (guardia_id);


--
-- Name: idx_logs_guardias_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_guardias_tenant ON public.logs_guardias USING btree (tenant_id);


--
-- Name: idx_logs_guardias_usuario; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_guardias_usuario ON public.logs_guardias USING btree (usuario);


--
-- Name: idx_logs_instalaciones_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_instalaciones_fecha ON public.logs_instalaciones USING btree (fecha DESC);


--
-- Name: idx_logs_instalaciones_instalacion_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_instalaciones_instalacion_id ON public.logs_instalaciones USING btree (instalacion_id);


--
-- Name: idx_logs_instalaciones_tipo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_instalaciones_tipo ON public.logs_instalaciones USING btree (tipo);


--
-- Name: idx_logs_pauta_diaria_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_pauta_diaria_fecha ON public.logs_pauta_diaria USING btree (fecha);


--
-- Name: idx_logs_pauta_diaria_pauta_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_pauta_diaria_pauta_id ON public.logs_pauta_diaria USING btree (pauta_diaria_id);


--
-- Name: idx_logs_pauta_diaria_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_pauta_diaria_tenant ON public.logs_pauta_diaria USING btree (tenant_id);


--
-- Name: idx_logs_pauta_diaria_usuario; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_pauta_diaria_usuario ON public.logs_pauta_diaria USING btree (usuario);


--
-- Name: idx_logs_pauta_mensual_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_pauta_mensual_fecha ON public.logs_pauta_mensual USING btree (fecha);


--
-- Name: idx_logs_pauta_mensual_pauta_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_pauta_mensual_pauta_id ON public.logs_pauta_mensual USING btree (pauta_mensual_id);


--
-- Name: idx_logs_pauta_mensual_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_pauta_mensual_tenant ON public.logs_pauta_mensual USING btree (tenant_id);


--
-- Name: idx_logs_pauta_mensual_usuario; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_pauta_mensual_usuario ON public.logs_pauta_mensual USING btree (usuario);


--
-- Name: idx_logs_puestos_operativos_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_puestos_operativos_fecha ON public.logs_puestos_operativos USING btree (fecha);


--
-- Name: idx_logs_puestos_operativos_puesto_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_puestos_operativos_puesto_id ON public.logs_puestos_operativos USING btree (puesto_operativo_id);


--
-- Name: idx_logs_puestos_operativos_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_puestos_operativos_tenant ON public.logs_puestos_operativos USING btree (tenant_id);


--
-- Name: idx_logs_puestos_operativos_usuario; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_puestos_operativos_usuario ON public.logs_puestos_operativos USING btree (usuario);


--
-- Name: idx_logs_turnos_extras_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_turnos_extras_fecha ON public.logs_turnos_extras USING btree (fecha);


--
-- Name: idx_logs_turnos_extras_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_turnos_extras_tenant ON public.logs_turnos_extras USING btree (tenant_id);


--
-- Name: idx_logs_turnos_extras_turno_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_turnos_extras_turno_id ON public.logs_turnos_extras USING btree (turno_extra_id);


--
-- Name: idx_logs_turnos_extras_usuario; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_turnos_extras_usuario ON public.logs_turnos_extras USING btree (usuario);


--
-- Name: idx_logs_usuarios_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_usuarios_fecha ON public.logs_usuarios USING btree (fecha);


--
-- Name: idx_logs_usuarios_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_usuarios_tenant ON public.logs_usuarios USING btree (tenant_id);


--
-- Name: idx_logs_usuarios_usuario; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_usuarios_usuario ON public.logs_usuarios USING btree (usuario);


--
-- Name: idx_logs_usuarios_usuario_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_logs_usuarios_usuario_id ON public.logs_usuarios USING btree (usuario_id);


--
-- Name: idx_pagos_turnos_extras_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pagos_turnos_extras_estado ON public.pagos_turnos_extras USING btree (estado);


--
-- Name: idx_pagos_turnos_extras_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pagos_turnos_extras_fecha ON public.pagos_turnos_extras USING btree (fecha);


--
-- Name: idx_pagos_turnos_extras_guardia_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pagos_turnos_extras_guardia_id ON public.pagos_turnos_extras USING btree (guardia_id);


--
-- Name: idx_pagos_turnos_extras_instalacion_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pagos_turnos_extras_instalacion_id ON public.pagos_turnos_extras USING btree (instalacion_id);


--
-- Name: idx_pagos_turnos_extras_pauta_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pagos_turnos_extras_pauta_id ON public.pagos_turnos_extras USING btree (pauta_id);


--
-- Name: idx_pagos_turnos_extras_puesto_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pagos_turnos_extras_puesto_id ON public.pagos_turnos_extras USING btree (puesto_id);


--
-- Name: idx_parametros_periodo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_parametros_periodo ON public.sueldo_parametros_generales USING btree (periodo);


--
-- Name: idx_pauta_mensual_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pauta_mensual_fecha ON public.as_turnos_pauta_mensual USING btree (anio, mes, dia);


--
-- Name: idx_pauta_mensual_guardia; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pauta_mensual_guardia ON public.as_turnos_pauta_mensual USING btree (guardia_id);


--
-- Name: idx_pauta_mensual_puesto_mes; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pauta_mensual_puesto_mes ON public.as_turnos_pauta_mensual USING btree (puesto_id, anio, mes);


--
-- Name: idx_pautas_diarias_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pautas_diarias_estado ON public.pautas_diarias USING btree (estado);


--
-- Name: idx_pautas_diarias_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pautas_diarias_fecha ON public.pautas_diarias USING btree (fecha);


--
-- Name: idx_pautas_diarias_pauta_mensual; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pautas_diarias_pauta_mensual ON public.pautas_diarias USING btree (pauta_mensual_id);


--
-- Name: idx_pautas_diarias_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pautas_diarias_tenant ON public.pautas_diarias USING btree (tenant_id);


--
-- Name: idx_pautas_mensuales_dia; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pautas_mensuales_dia ON public.pautas_mensuales USING btree (dia);


--
-- Name: idx_pautas_mensuales_guardia; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pautas_mensuales_guardia ON public.pautas_mensuales USING btree (guardia_id);


--
-- Name: idx_pautas_mensuales_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_pautas_mensuales_tenant ON public.pautas_mensuales USING btree (tenant_id);


--
-- Name: idx_planillas_turnos_extras_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_planillas_turnos_extras_estado ON public.te_planillas_turnos_extras USING btree (estado);


--
-- Name: idx_planillas_turnos_extras_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_planillas_turnos_extras_fecha ON public.te_planillas_turnos_extras USING btree (fecha_generacion);


--
-- Name: idx_planillas_turnos_extras_usuario; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_planillas_turnos_extras_usuario ON public.te_planillas_turnos_extras USING btree (usuario_id);


--
-- Name: idx_ppc_instalacion; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ppc_instalacion ON public.puestos_por_cubrir USING btree (instalacion_id);


--
-- Name: idx_ppc_motivo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ppc_motivo ON public.puestos_por_cubrir USING btree (motivo);


--
-- Name: idx_ppc_pauta_diaria; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ppc_pauta_diaria ON public.puestos_por_cubrir USING btree (pauta_diaria_id);


--
-- Name: idx_ppc_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ppc_tenant ON public.puestos_por_cubrir USING btree (tenant_id);


--
-- Name: idx_puestos_operativos_activo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_puestos_operativos_activo ON public.as_turnos_puestos_operativos USING btree (activo);


--
-- Name: idx_puestos_operativos_eliminado_en; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_puestos_operativos_eliminado_en ON public.as_turnos_puestos_operativos USING btree (eliminado_en);


--
-- Name: idx_puestos_operativos_guardia; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_puestos_operativos_guardia ON public.as_turnos_puestos_operativos USING btree (guardia_id);


--
-- Name: idx_puestos_operativos_instalacion; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_puestos_operativos_instalacion ON public.as_turnos_puestos_operativos USING btree (instalacion_id);


--
-- Name: idx_puestos_operativos_ppc; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_puestos_operativos_ppc ON public.as_turnos_puestos_operativos USING btree (es_ppc);


--
-- Name: idx_puestos_operativos_rol; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_puestos_operativos_rol ON public.as_turnos_puestos_operativos USING btree (rol_id);


--
-- Name: idx_reemplazo_guardia_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_reemplazo_guardia_id ON public.as_turnos_pauta_mensual USING btree (reemplazo_guardia_id);


--
-- Name: idx_roles_servicio_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_roles_servicio_estado ON public.as_turnos_roles_servicio USING btree (estado);


--
-- Name: idx_roles_servicio_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_roles_servicio_tenant ON public.as_turnos_roles_servicio USING btree (tenant_id);


--
-- Name: idx_rondas_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_rondas_fecha ON public.rondas USING btree (fecha);


--
-- Name: idx_sueldo_bonos_globales_activo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sueldo_bonos_globales_activo ON public.sueldo_bonos_globales USING btree (activo);


--
-- Name: idx_sueldo_bonos_globales_imponible; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sueldo_bonos_globales_imponible ON public.sueldo_bonos_globales USING btree (imponible);


--
-- Name: idx_sueldo_estructuras_instalacion; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sueldo_estructuras_instalacion ON public.sueldo_estructuras_servicio USING btree (instalacion_id);


--
-- Name: idx_sueldo_estructuras_instalacion_rol; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sueldo_estructuras_instalacion_rol ON public.sueldo_estructuras_servicio USING btree (instalacion_id, rol_servicio_id);


--
-- Name: idx_sueldo_estructuras_rol; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sueldo_estructuras_rol ON public.sueldo_estructuras_servicio USING btree (rol_servicio_id);


--
-- Name: idx_te_planillas_turnos_extras_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_te_planillas_turnos_extras_estado ON public.te_planillas_turnos_extras USING btree (estado);


--
-- Name: idx_te_planillas_turnos_extras_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_te_planillas_turnos_extras_fecha ON public.te_planillas_turnos_extras USING btree (fecha_generacion);


--
-- Name: idx_te_planillas_turnos_extras_usuario; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_te_planillas_turnos_extras_usuario ON public.te_planillas_turnos_extras USING btree (usuario_id);


--
-- Name: idx_te_turnos_extras_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_te_turnos_extras_estado ON public.te_turnos_extras USING btree (estado);


--
-- Name: idx_te_turnos_extras_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_te_turnos_extras_fecha ON public.te_turnos_extras USING btree (fecha);


--
-- Name: idx_te_turnos_extras_guardia_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_te_turnos_extras_guardia_id ON public.te_turnos_extras USING btree (guardia_id);


--
-- Name: idx_te_turnos_extras_instalacion_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_te_turnos_extras_instalacion_id ON public.te_turnos_extras USING btree (instalacion_id);


--
-- Name: idx_te_turnos_extras_pagado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_te_turnos_extras_pagado ON public.te_turnos_extras USING btree (pagado);


--
-- Name: idx_te_turnos_extras_planilla_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_te_turnos_extras_planilla_id ON public.te_turnos_extras USING btree (planilla_id);


--
-- Name: idx_tipos_documentos_requiere_vencimiento; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tipos_documentos_requiere_vencimiento ON public.documentos_tipos USING btree (requiere_vencimiento);


--
-- Name: idx_tramos_periodo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tramos_periodo ON public.sueldo_tramos_impuesto USING btree (periodo);


--
-- Name: idx_turnos_extras_destino; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_destino ON public.turnos_extras USING btree (instalacion_destino_id);


--
-- Name: idx_turnos_extras_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_estado ON public.te_turnos_extras USING btree (estado);


--
-- Name: idx_turnos_extras_fecha; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_fecha ON public.te_turnos_extras USING btree (fecha);


--
-- Name: idx_turnos_extras_fecha_pagado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_fecha_pagado ON public.te_turnos_extras USING btree (fecha, pagado);


--
-- Name: idx_turnos_extras_fecha_pago; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_fecha_pago ON public.te_turnos_extras USING btree (fecha_pago);


--
-- Name: idx_turnos_extras_guardia; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_guardia ON public.turnos_extras USING btree (guardia_id);


--
-- Name: idx_turnos_extras_guardia_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_guardia_id ON public.te_turnos_extras USING btree (guardia_id);


--
-- Name: idx_turnos_extras_guardia_pagado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_guardia_pagado ON public.te_turnos_extras USING btree (guardia_id, pagado);


--
-- Name: idx_turnos_extras_instalacion_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_instalacion_id ON public.te_turnos_extras USING btree (instalacion_id);


--
-- Name: idx_turnos_extras_pagado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_pagado ON public.te_turnos_extras USING btree (pagado);


--
-- Name: idx_turnos_extras_pauta_diaria; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_pauta_diaria ON public.turnos_extras USING btree (pauta_diaria_id);


--
-- Name: idx_turnos_extras_pauta_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_pauta_id ON public.te_turnos_extras USING btree (pauta_id);


--
-- Name: idx_turnos_extras_planilla_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_planilla_id ON public.te_turnos_extras USING btree (planilla_id);


--
-- Name: idx_turnos_extras_puesto_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_puesto_id ON public.te_turnos_extras USING btree (puesto_id);


--
-- Name: idx_turnos_extras_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_tenant ON public.turnos_extras USING btree (tenant_id);


--
-- Name: idx_turnos_extras_tipo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_extras_tipo ON public.turnos_extras USING btree (tipo);


--
-- Name: idx_turnos_roles_servicio_estado; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_turnos_roles_servicio_estado ON public.as_turnos_roles_servicio USING btree (estado);


--
-- Name: idx_usuarios_activo; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_usuarios_activo ON public.usuarios USING btree (activo);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (email);


--
-- Name: idx_usuarios_permisos_tenant_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_usuarios_permisos_tenant_id ON public.usuarios_permisos USING btree (tenant_id);


--
-- Name: idx_usuarios_rol; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_usuarios_rol ON public.usuarios USING btree (rol);


--
-- Name: idx_usuarios_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_usuarios_tenant ON public.usuarios USING btree (tenant_id);


--
-- Name: unique_active_role_servicio; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX unique_active_role_servicio ON public.as_turnos_roles_servicio USING btree (dias_trabajo, dias_descanso, hora_inicio, hora_termino) WHERE (estado = 'Activo'::text);


--
-- Name: as_turnos_roles_servicio trigger_crear_estructura_sueldo; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER trigger_crear_estructura_sueldo AFTER INSERT ON public.as_turnos_roles_servicio FOR EACH ROW EXECUTE FUNCTION public.crear_estructura_sueldo_automatica();


--
-- Name: as_turnos_pauta_mensual update_as_turnos_pauta_mensual_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER update_as_turnos_pauta_mensual_updated_at BEFORE UPDATE ON public.as_turnos_pauta_mensual FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: alertas_documentos alertas_documentos_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.alertas_documentos
    ADD CONSTRAINT alertas_documentos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES public.documentos(id) ON DELETE CASCADE;


--
-- Name: as_turnos_puestos_operativos as_turnos_puestos_operativos_guardia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.as_turnos_puestos_operativos
    ADD CONSTRAINT as_turnos_puestos_operativos_guardia_id_fkey FOREIGN KEY (guardia_id) REFERENCES public.guardias(id);


--
-- Name: as_turnos_puestos_operativos as_turnos_puestos_operativos_instalacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.as_turnos_puestos_operativos
    ADD CONSTRAINT as_turnos_puestos_operativos_instalacion_id_fkey FOREIGN KEY (instalacion_id) REFERENCES public.instalaciones(id);


--
-- Name: as_turnos_puestos_operativos as_turnos_puestos_operativos_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.as_turnos_puestos_operativos
    ADD CONSTRAINT as_turnos_puestos_operativos_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.as_turnos_roles_servicio(id);


--
-- Name: clientes clientes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: documentos_clientes documentos_clientes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_clientes
    ADD CONSTRAINT documentos_clientes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: documentos_clientes documentos_clientes_tipo_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_clientes
    ADD CONSTRAINT documentos_clientes_tipo_documento_id_fkey FOREIGN KEY (tipo_documento_id) REFERENCES public.documentos_tipos(id);


--
-- Name: documentos documentos_guardia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_guardia_id_fkey FOREIGN KEY (guardia_id) REFERENCES public.guardias(id);


--
-- Name: documentos_guardias documentos_guardias_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_guardias
    ADD CONSTRAINT documentos_guardias_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: documentos_guardias documentos_guardias_tipo_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_guardias
    ADD CONSTRAINT documentos_guardias_tipo_documento_id_fkey FOREIGN KEY (tipo_documento_id) REFERENCES public.documentos_tipos(id);


--
-- Name: documentos documentos_instalacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_instalacion_id_fkey FOREIGN KEY (instalacion_id) REFERENCES public.instalaciones(id);


--
-- Name: documentos_instalacion documentos_instalacion_instalacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_instalacion
    ADD CONSTRAINT documentos_instalacion_instalacion_id_fkey FOREIGN KEY (instalacion_id) REFERENCES public.instalaciones(id);


--
-- Name: documentos_instalacion documentos_instalacion_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_instalacion
    ADD CONSTRAINT documentos_instalacion_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: documentos_instalacion documentos_instalacion_tipo_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_instalacion
    ADD CONSTRAINT documentos_instalacion_tipo_documento_id_fkey FOREIGN KEY (tipo_documento_id) REFERENCES public.documentos_tipos(id);


--
-- Name: documentos documentos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: documentos documentos_tipo_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_tipo_documento_id_fkey FOREIGN KEY (tipo_documento_id) REFERENCES public.documentos_tipos(id);


--
-- Name: documentos_usuarios documentos_usuarios_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_usuarios
    ADD CONSTRAINT documentos_usuarios_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: documentos_usuarios documentos_usuarios_tipo_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_usuarios
    ADD CONSTRAINT documentos_usuarios_tipo_documento_id_fkey FOREIGN KEY (tipo_documento_id) REFERENCES public.documentos_tipos(id);


--
-- Name: firmas firmas_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.firmas
    ADD CONSTRAINT firmas_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES public.documentos(id);


--
-- Name: documentos_clientes fk_documentos_clientes_cliente_id; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_clientes
    ADD CONSTRAINT fk_documentos_clientes_cliente_id FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: as_turnos_puestos_operativos fk_guardia; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.as_turnos_puestos_operativos
    ADD CONSTRAINT fk_guardia FOREIGN KEY (guardia_id) REFERENCES public.guardias(id);


--
-- Name: as_turnos_puestos_operativos fk_instalacion; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.as_turnos_puestos_operativos
    ADD CONSTRAINT fk_instalacion FOREIGN KEY (instalacion_id) REFERENCES public.instalaciones(id);


--
-- Name: logs_instalaciones fk_logs_instalaciones_instalacion; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_instalaciones
    ADD CONSTRAINT fk_logs_instalaciones_instalacion FOREIGN KEY (instalacion_id) REFERENCES public.instalaciones(id) ON DELETE CASCADE;


--
-- Name: as_turnos_puestos_operativos fk_rol; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.as_turnos_puestos_operativos
    ADD CONSTRAINT fk_rol FOREIGN KEY (rol_id) REFERENCES public.as_turnos_roles_servicio(id);


--
-- Name: guardias guardias_banco_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.guardias
    ADD CONSTRAINT guardias_banco_fkey FOREIGN KEY (banco) REFERENCES public.bancos(id);


--
-- Name: guardias guardias_temp_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.guardias
    ADD CONSTRAINT guardias_temp_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: sueldo_historial_estructuras historial_estructuras_servicio_rol_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_historial_estructuras
    ADD CONSTRAINT historial_estructuras_servicio_rol_servicio_id_fkey FOREIGN KEY (rol_servicio_id) REFERENCES public.as_turnos_roles_servicio(id) ON DELETE CASCADE;


--
-- Name: sueldo_historial_roles historial_roles_servicio_rol_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_historial_roles
    ADD CONSTRAINT historial_roles_servicio_rol_servicio_id_fkey FOREIGN KEY (rol_servicio_id) REFERENCES public.as_turnos_roles_servicio(id) ON DELETE CASCADE;


--
-- Name: instalaciones instalaciones_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.instalaciones
    ADD CONSTRAINT instalaciones_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: instalaciones instalaciones_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.instalaciones
    ADD CONSTRAINT instalaciones_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: logs_clientes logs_clientes_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_clientes
    ADD CONSTRAINT logs_clientes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: logs_documentos logs_documentos_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_documentos
    ADD CONSTRAINT logs_documentos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES public.documentos(id) ON DELETE CASCADE;


--
-- Name: logs_documentos logs_documentos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_documentos
    ADD CONSTRAINT logs_documentos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: logs_guardias logs_guardias_guardia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_guardias
    ADD CONSTRAINT logs_guardias_guardia_id_fkey FOREIGN KEY (guardia_id) REFERENCES public.guardias(id) ON DELETE CASCADE;


--
-- Name: logs_guardias logs_guardias_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_guardias
    ADD CONSTRAINT logs_guardias_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: logs_pauta_diaria logs_pauta_diaria_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_pauta_diaria
    ADD CONSTRAINT logs_pauta_diaria_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: logs_pauta_mensual logs_pauta_mensual_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_pauta_mensual
    ADD CONSTRAINT logs_pauta_mensual_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: logs_puestos_operativos logs_puestos_operativos_puesto_operativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_puestos_operativos
    ADD CONSTRAINT logs_puestos_operativos_puesto_operativo_id_fkey FOREIGN KEY (puesto_operativo_id) REFERENCES public.as_turnos_puestos_operativos(id) ON DELETE CASCADE;


--
-- Name: logs_puestos_operativos logs_puestos_operativos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_puestos_operativos
    ADD CONSTRAINT logs_puestos_operativos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: logs_turnos_extras logs_turnos_extras_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_turnos_extras
    ADD CONSTRAINT logs_turnos_extras_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: logs_turnos_extras logs_turnos_extras_turno_extra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_turnos_extras
    ADD CONSTRAINT logs_turnos_extras_turno_extra_id_fkey FOREIGN KEY (turno_extra_id) REFERENCES public.te_turnos_extras(id) ON DELETE CASCADE;


--
-- Name: logs_usuarios logs_usuarios_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs_usuarios
    ADD CONSTRAINT logs_usuarios_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: pagos_turnos_extras pagos_turnos_extras_guardia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pagos_turnos_extras
    ADD CONSTRAINT pagos_turnos_extras_guardia_id_fkey FOREIGN KEY (guardia_id) REFERENCES public.guardias(id);


--
-- Name: pagos_turnos_extras pagos_turnos_extras_instalacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pagos_turnos_extras
    ADD CONSTRAINT pagos_turnos_extras_instalacion_id_fkey FOREIGN KEY (instalacion_id) REFERENCES public.instalaciones(id);


--
-- Name: pagos_turnos_extras pagos_turnos_extras_pauta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pagos_turnos_extras
    ADD CONSTRAINT pagos_turnos_extras_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.as_turnos_pauta_mensual(id);


--
-- Name: pagos_turnos_extras pagos_turnos_extras_puesto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pagos_turnos_extras
    ADD CONSTRAINT pagos_turnos_extras_puesto_id_fkey FOREIGN KEY (puesto_id) REFERENCES public.as_turnos_puestos_operativos(id);


--
-- Name: pautas_diarias pautas_diarias_cobertura_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pautas_diarias
    ADD CONSTRAINT pautas_diarias_cobertura_por_id_fkey FOREIGN KEY (cobertura_por_id) REFERENCES public.guardias(id) ON DELETE SET NULL;


--
-- Name: pautas_diarias pautas_diarias_guardia_asignado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pautas_diarias
    ADD CONSTRAINT pautas_diarias_guardia_asignado_id_fkey FOREIGN KEY (guardia_asignado_id) REFERENCES public.guardias(id) ON DELETE SET NULL;


--
-- Name: pautas_diarias pautas_diarias_pauta_mensual_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pautas_diarias
    ADD CONSTRAINT pautas_diarias_pauta_mensual_id_fkey FOREIGN KEY (pauta_mensual_id) REFERENCES public.pautas_mensuales(id) ON DELETE CASCADE;


--
-- Name: pautas_diarias pautas_diarias_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pautas_diarias
    ADD CONSTRAINT pautas_diarias_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: pautas_mensuales pautas_mensuales_guardia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pautas_mensuales
    ADD CONSTRAINT pautas_mensuales_guardia_id_fkey FOREIGN KEY (guardia_id) REFERENCES public.guardias(id) ON DELETE CASCADE;


--
-- Name: pautas_mensuales pautas_mensuales_instalacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pautas_mensuales
    ADD CONSTRAINT pautas_mensuales_instalacion_id_fkey FOREIGN KEY (instalacion_id) REFERENCES public.instalaciones(id) ON DELETE CASCADE;


--
-- Name: pautas_mensuales pautas_mensuales_rol_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pautas_mensuales
    ADD CONSTRAINT pautas_mensuales_rol_servicio_id_fkey FOREIGN KEY (rol_servicio_id) REFERENCES public.roles_servicio(id) ON DELETE SET NULL;


--
-- Name: pautas_mensuales pautas_mensuales_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pautas_mensuales
    ADD CONSTRAINT pautas_mensuales_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: puestos_por_cubrir puestos_por_cubrir_instalacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.puestos_por_cubrir
    ADD CONSTRAINT puestos_por_cubrir_instalacion_id_fkey FOREIGN KEY (instalacion_id) REFERENCES public.instalaciones(id) ON DELETE SET NULL;


--
-- Name: puestos_por_cubrir puestos_por_cubrir_rol_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.puestos_por_cubrir
    ADD CONSTRAINT puestos_por_cubrir_rol_servicio_id_fkey FOREIGN KEY (rol_servicio_id) REFERENCES public.roles_servicio(id) ON DELETE SET NULL;


--
-- Name: puestos_por_cubrir puestos_por_cubrir_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.puestos_por_cubrir
    ADD CONSTRAINT puestos_por_cubrir_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: as_turnos_roles_servicio roles_servicio_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.as_turnos_roles_servicio
    ADD CONSTRAINT roles_servicio_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: roles_servicio roles_servicio_tenant_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles_servicio
    ADD CONSTRAINT roles_servicio_tenant_id_fkey1 FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: rondas rondas_guardia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rondas
    ADD CONSTRAINT rondas_guardia_id_fkey FOREIGN KEY (guardia_id) REFERENCES public.guardias(id);


--
-- Name: rondas rondas_instalacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rondas
    ADD CONSTRAINT rondas_instalacion_id_fkey FOREIGN KEY (instalacion_id) REFERENCES public.instalaciones(id);


--
-- Name: rondas rondas_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rondas
    ADD CONSTRAINT rondas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: sueldo_estructuras_servicio sueldo_estructuras_servicio_bono_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_estructuras_servicio
    ADD CONSTRAINT sueldo_estructuras_servicio_bono_id_fkey FOREIGN KEY (bono_id) REFERENCES public.sueldo_bonos_globales(id);


--
-- Name: sueldo_estructuras_servicio sueldo_estructuras_servicio_instalacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_estructuras_servicio
    ADD CONSTRAINT sueldo_estructuras_servicio_instalacion_id_fkey FOREIGN KEY (instalacion_id) REFERENCES public.instalaciones(id) ON DELETE CASCADE;


--
-- Name: sueldo_estructuras_servicio sueldo_estructuras_servicio_rol_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sueldo_estructuras_servicio
    ADD CONSTRAINT sueldo_estructuras_servicio_rol_servicio_id_fkey FOREIGN KEY (rol_servicio_id) REFERENCES public.as_turnos_roles_servicio(id) ON DELETE CASCADE;


--
-- Name: documentos_tipos tipos_documentos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentos_tipos
    ADD CONSTRAINT tipos_documentos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tipos_documentos tipos_documentos_tenant_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tipos_documentos
    ADD CONSTRAINT tipos_documentos_tenant_id_fkey1 FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: te_turnos_extras turnos_extras_guardia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.te_turnos_extras
    ADD CONSTRAINT turnos_extras_guardia_id_fkey FOREIGN KEY (guardia_id) REFERENCES public.guardias(id);


--
-- Name: turnos_extras turnos_extras_guardia_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.turnos_extras
    ADD CONSTRAINT turnos_extras_guardia_id_fkey1 FOREIGN KEY (guardia_id) REFERENCES public.guardias(id) ON DELETE SET NULL;


--
-- Name: turnos_extras turnos_extras_instalacion_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.turnos_extras
    ADD CONSTRAINT turnos_extras_instalacion_destino_id_fkey FOREIGN KEY (instalacion_destino_id) REFERENCES public.instalaciones(id) ON DELETE SET NULL;


--
-- Name: te_turnos_extras turnos_extras_instalacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.te_turnos_extras
    ADD CONSTRAINT turnos_extras_instalacion_id_fkey FOREIGN KEY (instalacion_id) REFERENCES public.instalaciones(id);


--
-- Name: turnos_extras turnos_extras_instalacion_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.turnos_extras
    ADD CONSTRAINT turnos_extras_instalacion_origen_id_fkey FOREIGN KEY (instalacion_origen_id) REFERENCES public.instalaciones(id) ON DELETE SET NULL;


--
-- Name: turnos_extras turnos_extras_pauta_diaria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.turnos_extras
    ADD CONSTRAINT turnos_extras_pauta_diaria_id_fkey FOREIGN KEY (pauta_diaria_id) REFERENCES public.pautas_diarias(id) ON DELETE CASCADE;


--
-- Name: te_turnos_extras turnos_extras_pauta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.te_turnos_extras
    ADD CONSTRAINT turnos_extras_pauta_id_fkey FOREIGN KEY (pauta_id) REFERENCES public.as_turnos_pauta_mensual(id);


--
-- Name: te_turnos_extras turnos_extras_planilla_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.te_turnos_extras
    ADD CONSTRAINT turnos_extras_planilla_id_fkey FOREIGN KEY (planilla_id) REFERENCES public.te_planillas_turnos_extras(id);


--
-- Name: te_turnos_extras turnos_extras_puesto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.te_turnos_extras
    ADD CONSTRAINT turnos_extras_puesto_id_fkey FOREIGN KEY (puesto_id) REFERENCES public.as_turnos_puestos_operativos(id);


--
-- Name: turnos_extras turnos_extras_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.turnos_extras
    ADD CONSTRAINT turnos_extras_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: usuarios_permisos usuarios_permisos_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.usuarios_permisos
    ADD CONSTRAINT usuarios_permisos_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.usuarios_roles(id);


--
-- Name: usuarios_permisos usuarios_permisos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.usuarios_permisos
    ADD CONSTRAINT usuarios_permisos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: usuarios_roles usuarios_roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.usuarios_roles
    ADD CONSTRAINT usuarios_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

