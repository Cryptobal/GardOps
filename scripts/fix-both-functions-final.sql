-- ===============================================
-- CORRECCIÓN FINAL DE AMBAS FUNCIONES
-- ===============================================
-- 1. Corrige fn_marcar_extra (error de ambigüedad)
-- 2. Asegura que fn_deshacer elimine de TE_turnos_extras

-- 1. CORREGIR fn_marcar_extra
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
      guardia_trabajo_id = p_cobertura_guardia_id,
      updated_at = NOW()
    WHERE as_turnos_pauta_mensual.id = v_pauta_id;
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
    WHERE TE_turnos_extras.id = v_existing_turno_extra_id;
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

-- 2. ASEGURAR QUE fn_deshacer ELIMINE DE TE_turnos_extras
DROP FUNCTION IF EXISTS as_turnos.fn_deshacer(bigint, text);

CREATE OR REPLACE FUNCTION as_turnos.fn_deshacer(
    p_pauta_id bigint,
    p_actor_ref text
)
RETURNS TABLE (
    ok boolean,
    pauta_id bigint,
    estado text
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_pauta RECORD;
BEGIN
    -- Obtener información de la pauta
    SELECT * INTO v_pauta
    FROM public.as_turnos_pauta_mensual
    WHERE as_turnos_pauta_mensual.id = p_pauta_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, p_pauta_id, 'error: Pauta no encontrada'::text;
        RETURN;
    END IF;

    -- Actualizar a estado planificado usando nueva estructura
    UPDATE public.as_turnos_pauta_mensual
    SET 
        tipo_turno = 'planificado',
        estado_puesto = CASE 
            WHEN guardia_id IS NULL THEN 'ppc'
            ELSE 'asignado'
        END,
        estado_guardia = NULL,
        estado_ui = NULL,
        tipo_cobertura = NULL,
        guardia_trabajo_id = NULL,
        meta = (COALESCE(meta, '{}'::jsonb)
                  - 'cobertura_guardia_id'
                  - 'tipo'
                  - 'extra_uid'
                  - 'es_extra'
                  - 'reemplazo_guardia_id'
                  - 'reemplazo_guardia_nombre'
                  - 'sin_cobertura'
                  - 'motivo'
                  - 'falta_sin_aviso')
               || jsonb_build_object(
                  'deshacer_actor', p_actor_ref,
                  'deshacer_ts', NOW()::text,
                  'action', 'deshacer'
               ),
        updated_at = NOW()
    WHERE as_turnos_pauta_mensual.id = p_pauta_id;

    -- ELIMINAR turnos extras relacionados (CRÍTICO)
    DELETE FROM public.TE_turnos_extras WHERE pauta_id = p_pauta_id;

    RETURN QUERY SELECT TRUE, p_pauta_id, 'planificado'::text;
END;
$$;

COMMENT ON FUNCTION as_turnos.fn_deshacer IS 'Revierte un turno al estado planificado y elimina turnos extras relacionados';
