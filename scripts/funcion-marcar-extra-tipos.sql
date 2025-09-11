-- Función fn_marcar_extra con tipos explícitos

DROP FUNCTION IF EXISTS as_turnos.fn_marcar_extra(date,uuid,uuid,uuid,uuid,text,text);

CREATE OR REPLACE FUNCTION as_turnos.fn_marcar_extra(
  p_fecha date,
  p_instalacion_id uuid,
  p_rol_id uuid,
  p_puesto_id uuid,
  p_cobertura_guardia_id uuid,
  p_origen text,
  p_actor text
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
  v_anio integer;
  v_mes integer;
  v_dia integer;
  v_pauta_id bigint;
  v_valor_turno_extra numeric := 35000;
BEGIN
  -- Extraer año, mes y día de la fecha
  v_anio := EXTRACT(YEAR FROM p_fecha);
  v_mes := EXTRACT(MONTH FROM p_fecha);
  v_dia := EXTRACT(DAY FROM p_fecha);
  
  -- Buscar el registro de pauta mensual
  SELECT pm.id INTO v_pauta_id
  FROM public.as_turnos_pauta_mensual pm
  WHERE pm.puesto_id = p_puesto_id
    AND pm.anio = v_anio
    AND pm.mes = v_mes
    AND pm.dia = v_dia
  LIMIT 1;
  
  -- Si no existe el registro, crear uno
  IF v_pauta_id IS NULL THEN
    INSERT INTO public.as_turnos_pauta_mensual (
      instalacion_id, rol_id, puesto_id, anio, mes, dia,
      estado, estado_ui, tipo_turno, estado_puesto, estado_guardia, tipo_cobertura,
      guardia_trabajo_id, turno_extra_guardia_id, created_at, updated_at
    ) VALUES (
      p_instalacion_id, p_rol_id, p_puesto_id, v_anio, v_mes, v_dia,
      'planificado', 'te', 'planificado', 'ppc', null, 'turno_extra',
      null, p_cobertura_guardia_id, NOW(), NOW()
    );
    
    -- Obtener el ID del registro insertado
    SELECT pm.id INTO v_pauta_id
    FROM public.as_turnos_pauta_mensual pm
    WHERE pm.puesto_id = p_puesto_id
      AND pm.anio = v_anio
      AND pm.mes = v_mes
      AND pm.dia = v_dia
    LIMIT 1;
  ELSE
    -- Actualizar el registro existente
    UPDATE public.as_turnos_pauta_mensual 
    SET 
      estado = 'planificado',
      estado_ui = 'te',
      tipo_turno = 'planificado',
      estado_puesto = 'ppc',
      estado_guardia = null,
      tipo_cobertura = 'turno_extra',
      guardia_trabajo_id = null,
      turno_extra_guardia_id = p_cobertura_guardia_id,
      updated_at = NOW()
    WHERE public.as_turnos_pauta_mensual.id = v_pauta_id;
  END IF;
  
  -- Crear registro en TE_turnos_extras
  INSERT INTO public.TE_turnos_extras (
    pauta_id, guardia_id, instalacion_id, puesto_id, fecha, estado, valor, created_at, updated_at
  ) VALUES (
    v_pauta_id, p_cobertura_guardia_id, p_instalacion_id, p_puesto_id, p_fecha, 'ppc', v_valor_turno_extra, NOW(), NOW()
  );
  
  -- Retornar el resultado con tipos explícitos
  RETURN QUERY
  SELECT 
    pm.id::bigint,
    pm.estado::text,
    pm.estado_ui::text,
    pm.tipo_turno::text,
    pm.estado_puesto::text,
    pm.estado_guardia::text,
    pm.tipo_cobertura::text,
    pm.guardia_trabajo_id::uuid,
    pm.turno_extra_guardia_id::uuid,
    'Turno extra marcado exitosamente'::text
  FROM public.as_turnos_pauta_mensual pm
  WHERE pm.id = v_pauta_id;
  
END;
$$ LANGUAGE plpgsql;
