-- Corregir función para marcar sin cobertura con nueva estructura

DROP FUNCTION IF EXISTS as_turnos.fn_marcar_sin_cobertura(bigint, text, jsonb, text);

CREATE OR REPLACE FUNCTION as_turnos.fn_marcar_sin_cobertura(
  p_pauta_id bigint,
  p_actor_ref text
) RETURNS TABLE(
  id bigint,
  fecha date,
  estado text,
  meta jsonb
) AS $$
BEGIN
  -- Marcar como sin cobertura con nueva estructura
  UPDATE public.as_turnos_pauta_mensual
  SET 
    estado = 'sin_cobertura',
    estado_ui = 'sin_cobertura',
    tipo_turno = 'planificado',
    estado_puesto = 'ppc',  -- PPC sin cobertura
    estado_guardia = 'falta',  -- Guardia no asistió
    tipo_cobertura = 'sin_cobertura',  -- Sin cobertura
    meta = jsonb_build_object(
      'action', 'marcar_sin_cobertura',
      'origen', 'ppc',
      'marcado_ts', NOW()::text,
      'marcado_por', p_actor_ref
    )
  WHERE as_turnos_pauta_mensual.id = p_pauta_id;

  -- Retornar el resultado
  RETURN QUERY
  SELECT 
    pm.id,
    make_date(pm.anio, pm.mes, pm.dia) as fecha,
    pm.estado,
    pm.meta
  FROM public.as_turnos_pauta_mensual pm
  WHERE pm.id = p_pauta_id;
END;
$$ LANGUAGE plpgsql;
