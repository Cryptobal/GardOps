-- Función fn_revertir_a_plan que solo hace UPDATE

DROP FUNCTION IF EXISTS as_turnos.fn_revertir_a_plan(bigint, text);

CREATE OR REPLACE FUNCTION as_turnos.fn_revertir_a_plan(
  p_pauta_id bigint,
  p_actor_ref text
) RETURNS void AS $$
BEGIN
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
  WHERE as_turnos_pauta_mensual.id = p_pauta_id;
END;
$$ LANGUAGE plpgsql;
