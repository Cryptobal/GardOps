-- Corregir función fn_revertir_a_plan para limpiar campos de turno extra

CREATE OR REPLACE FUNCTION as_turnos.fn_revertir_a_plan(
  p_pauta_id bigint,
  p_actor_ref text
) RETURNS TABLE(
  id bigint,
  estado text,
  estado_ui text,
  tipo_turno text,
  estado_puesto text,
  estado_guardia text,
  tipo_cobertura text,
  guardia_trabajo_id uuid,
  guardia_cobertura_id uuid,
  mensaje text
) AS $$
DECLARE
  v_before jsonb;
  v_after  jsonb;
  v_has_logs boolean;
BEGIN
  -- Obtener estado anterior
  SELECT jsonb_build_object(
    'estado', estado,
    'estado_ui', estado_ui,
    'meta', meta,
    'turno_extra_guardia_id', turno_extra_guardia_id,
    'tipo_cobertura', tipo_cobertura
  ) INTO v_before
  FROM public.as_turnos_pauta_mensual
  WHERE id = p_pauta_id;

  -- Revertir a planificado - limpiar TODO incluyendo turno extra
  UPDATE public.as_turnos_pauta_mensual
  SET 
    estado = 'planificado',
    estado_ui = NULL,  -- Limpiar completamente
    meta = NULL,  -- Limpiar completamente el meta
    turno_extra_guardia_id = NULL,  -- Limpiar turno extra
    tipo_cobertura = NULL,  -- Limpiar tipo de cobertura
    estado_guardia = NULL,  -- Limpiar estado del guardia
    estado_puesto = NULL,  -- Limpiar estado del puesto
    tipo_turno = 'planificado'  -- Establecer como planificado
  WHERE id = p_pauta_id;

  -- Obtener estado posterior
  SELECT jsonb_build_object(
    'estado', estado,
    'estado_ui', estado_ui,
    'meta', meta,
    'turno_extra_guardia_id', turno_extra_guardia_id,
    'tipo_cobertura', tipo_cobertura
  ) INTO v_after
  FROM public.as_turnos_pauta_mensual
  WHERE id = p_pauta_id;

  -- Verificar si existe la tabla de logs
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'as_turnos_logs'
  ) INTO v_has_logs;

  -- Solo intentar insertar log si la tabla existe
  IF v_has_logs THEN
    BEGIN
      -- Intentar insertar con el nombre de columna correcto
      INSERT INTO public.as_turnos_logs(
        actor_ref, 
        action, 
        pauta_id, 
        before_state, 
        after_state,
        created_at
      )
      VALUES (
        p_actor_ref,
        'revertir_a_plan',
        p_pauta_id,
        v_before::text,
        v_after::text,
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Si falla el log, no fallar toda la operación
      RAISE NOTICE 'No se pudo insertar log: %', SQLERRM;
    END;
  END IF;

  -- Retornar el resultado
  RETURN QUERY
  SELECT 
    pm.id,
    pm.estado,
    pm.estado_ui,
    pm.tipo_turno,
    pm.estado_puesto,
    pm.estado_guardia,
    pm.tipo_cobertura,
    pm.guardia_trabajo_id,
    pm.turno_extra_guardia_id,
    'Turno revertido a planificado exitosamente'::text
  FROM public.as_turnos_pauta_mensual pm
  WHERE pm.id = p_pauta_id;
END;
$$ LANGUAGE plpgsql;
