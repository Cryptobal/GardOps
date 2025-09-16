-- Corregir función fn_marcar_extra para manejar conflictos de restricción única
-- Soluciona el error: duplicate key value violates unique constraint "idx_guardia_fecha_turno"

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
  v_es_ppc boolean;
  v_valor_turno_extra numeric;
  v_existing_turno_extra_id uuid;
BEGIN
  -- Extraer año, mes y día de la fecha
  v_anio := EXTRACT(YEAR FROM p_fecha);
  v_mes := EXTRACT(MONTH FROM p_fecha);
  v_dia := EXTRACT(DAY FROM p_fecha);
  
  -- Obtener el valor del turno extra de la instalación
  SELECT valor_turno_extra INTO v_valor_turno_extra
  FROM public.instalaciones
  WHERE instalaciones.id = p_instalacion_id;
  
  -- Si no se encuentra el valor, usar 0 por defecto
  IF v_valor_turno_extra IS NULL THEN
    v_valor_turno_extra := 0;
  END IF;
  
  -- Buscar el registro de pauta mensual usando anio, mes, dia
  SELECT pm.id, (pm.guardia_id IS NULL) as es_ppc
  INTO v_pauta_id, v_es_ppc
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
      guardia_trabajo_id, guardia_cobertura_id, created_at, updated_at
    ) VALUES (
      p_instalacion_id, p_rol_id, p_puesto_id, v_anio, v_mes, v_dia,
      'planificado', 'te', 'planificado', 'ppc', null, 'turno_extra',
      null, p_cobertura_guardia_id, NOW(), NOW()
    ) RETURNING id INTO v_pauta_id;
    
    v_es_ppc := true;
  ELSE
    -- Actualizar el registro existente
    UPDATE public.as_turnos_pauta_mensual
    SET 
      estado = 'planificado',
      estado_ui = 'te',
      tipo_turno = 'planificado',
      estado_puesto = CASE 
        WHEN v_es_ppc THEN 'ppc'
        ELSE 'asignado'
      END,
      estado_guardia = CASE 
        WHEN v_es_ppc THEN NULL
        ELSE 'falta'
      END,
      tipo_cobertura = 'turno_extra',
      guardia_trabajo_id = null,
      guardia_cobertura_id = p_cobertura_guardia_id,
      updated_at = NOW()
    WHERE id = v_pauta_id;
  END IF;

  -- Verificar si ya existe un turno extra para esta guardia en esta fecha
  SELECT te.id INTO v_existing_turno_extra_id
  FROM public.TE_turnos_extras te
  WHERE te.guardia_id = p_cobertura_guardia_id
    AND te.fecha = p_fecha
  LIMIT 1;

  -- Si ya existe un turno extra, actualizarlo en lugar de crear uno nuevo
  IF v_existing_turno_extra_id IS NOT NULL THEN
    UPDATE public.TE_turnos_extras
    SET 
      pauta_id = v_pauta_id,
      instalacion_id = p_instalacion_id,
      puesto_id = p_puesto_id,
      estado = CASE WHEN v_es_ppc THEN 'ppc' ELSE 'reemplazo' END,
      valor = v_valor_turno_extra,
      updated_at = NOW()
    WHERE te.id = v_existing_turno_extra_id;
  ELSE
    -- Crear nuevo registro en turnos extras
    INSERT INTO public.TE_turnos_extras (
      pauta_id, guardia_id, instalacion_id, puesto_id, fecha, estado, valor, created_at, updated_at
    ) VALUES (
      v_pauta_id, p_cobertura_guardia_id, p_instalacion_id, p_puesto_id, p_fecha, 
      CASE WHEN v_es_ppc THEN 'ppc' ELSE 'reemplazo' END, 
      v_valor_turno_extra, NOW(), NOW()
    );
  END IF;

  -- Retornar el resultado
  RETURN QUERY SELECT 
    v_pauta_id,
    'planificado'::text,
    'te'::text,
    'planificado'::text,
    CASE WHEN v_es_ppc THEN 'ppc' ELSE 'asignado' END::text,
    CASE WHEN v_es_ppc THEN NULL ELSE 'falta' END::text,
    'turno_extra'::text,
    null::uuid,
    p_cobertura_guardia_id,
    'Turno extra marcado exitosamente'::text;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION as_turnos.fn_marcar_extra IS 'Marca un turno extra manejando conflictos de restricción única';
