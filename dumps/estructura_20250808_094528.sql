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

