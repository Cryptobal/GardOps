-- Rollout TE (Turno Extra) unificado para PPC cubierto y Reemplazo
-- Seguro e idempotente. No elimina estados viejos, solo agrega mapping a TE.

BEGIN;

-- 1) Función: reemplazo escribe TE
DROP FUNCTION IF EXISTS as_turnos.fn_registrar_reemplazo(bigint, uuid, text, text);
CREATE OR REPLACE FUNCTION as_turnos.fn_registrar_reemplazo(
  p_pauta_id bigint,
  p_cobertura_guardia_id uuid,
  p_actor_ref text,
  p_motivo text DEFAULT NULL
)
RETURNS TABLE (ok boolean, pauta_id bigint, estado text)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.as_turnos_pauta_mensual
  SET 
    estado = 'trabajado',
    estado_ui = 'te',
    meta = COALESCE(meta, '{}'::jsonb) || 
           jsonb_build_object(
             'tipo','turno_extra',
             'te_origen','reemplazo',
             'cobertura_guardia_id', p_cobertura_guardia_id::text,
             'motivo', p_motivo,
             'marcado_por', p_actor_ref,
             'marcado_ts', NOW()::text,
             'action','registrar_reemplazo'
           ),
    updated_at = NOW()
  WHERE id = p_pauta_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, p_pauta_id, 'error: Pauta no encontrada'::text; RETURN;
  END IF;
  RETURN QUERY SELECT TRUE, p_pauta_id, 'te'::text;
END;$$;

-- 2) Función: marcar extra (PPC cubierto) escribe TE
DROP FUNCTION IF EXISTS as_turnos.fn_marcar_extra(date, uuid, uuid, uuid, uuid, text, text);
CREATE OR REPLACE FUNCTION as_turnos.fn_marcar_extra(
  p_fecha date,
  p_instalacion_id uuid,
  p_rol_id uuid,
  p_puesto_id uuid,
  p_cobertura_guardia_id uuid,
  p_origen text,
  p_actor_ref text
)
RETURNS TABLE (ok boolean, updated_pauta_id bigint)
LANGUAGE plpgsql
AS $$
DECLARE v_id bigint; BEGIN
  SELECT id INTO v_id FROM public.as_turnos_pauta_mensual
  WHERE make_date(anio,mes,dia)=p_fecha AND puesto_id=p_puesto_id
  ORDER BY id DESC LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT FALSE, NULL::bigint; RETURN; END IF;
  UPDATE public.as_turnos_pauta_mensual SET
    estado='trabajado',
    estado_ui='te',
    meta = COALESCE(meta,'{}'::jsonb) || jsonb_build_object(
      'tipo','turno_extra','te_origen','ppc','cobertura_guardia_id',p_cobertura_guardia_id::text,
      'origen', p_origen, 'actor_ref', p_actor_ref, 'action','marcar_extra', 'ts', NOW()::text
    ),
    updated_at=NOW()
  WHERE id=v_id;
  RETURN QUERY SELECT TRUE, v_id;
END;$$;

-- 3) Deshacer: limpia TE
DROP FUNCTION IF EXISTS as_turnos.fn_deshacer(bigint, text);
CREATE OR REPLACE FUNCTION as_turnos.fn_deshacer(p_pauta_id bigint, p_actor_ref text)
RETURNS TABLE (ok boolean, pauta_id bigint, estado text)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.as_turnos_pauta_mensual SET
    estado='planificado', estado_ui='plan',
    meta = (COALESCE(meta,'{}'::jsonb) - 'tipo' - 'te_origen' - 'cobertura_guardia_id' - 'estado_ui' - 'motivo' - 'falta_sin_aviso')
           || jsonb_build_object('deshacer_actor',p_actor_ref,'deshacer_ts',NOW()::text,'action','deshacer'),
    updated_at=NOW()
  WHERE id=p_pauta_id;
  RETURN QUERY SELECT TRUE, p_pauta_id, 'plan'::text;
END;$$;

-- 4) Vista: mapear TE primero
CREATE OR REPLACE VIEW as_turnos_v_pauta_diaria_dedup AS
WITH pauta_dedup AS (
  SELECT DISTINCT ON (pm.puesto_id, pm.anio, pm.mes, pm.dia)
    pm.id::text AS pauta_id, pm.puesto_id, pm.guardia_id, pm.anio, pm.mes, pm.dia,
    to_date(concat(pm.anio,'-',pm.mes,'-',pm.dia),'YYYY-MM-DD') AS fecha,
    pm.estado, pm.observaciones, pm.meta, pm.estado_ui AS estado_ui_tabla,
    i.id AS instalacion_id, i.nombre AS instalacion_nombre,
    g.id AS guardia_titular_id,
    concat(g.apellido_paterno,' ',g.apellido_materno,', ',g.nombre) AS guardia_titular_nombre,
    po.nombre_puesto AS puesto_nombre, po.es_ppc,
    rs.id AS rol_id, rs.nombre AS rol_nombre, rs.hora_inicio, rs.hora_termino AS hora_fin
  FROM as_turnos_pauta_mensual pm
  JOIN as_turnos_puestos_operativos po ON pm.puesto_id=po.id
  JOIN instalaciones i ON po.instalacion_id=i.id
  LEFT JOIN guardias g ON pm.guardia_id=g.id
  LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id=rs.id
  WHERE po.activo=true
  ORDER BY pm.puesto_id, pm.anio, pm.mes, pm.dia, pm.id DESC
)
SELECT
  pauta_id, fecha::text AS fecha, puesto_id::text AS puesto_id, puesto_nombre,
  instalacion_id::text AS instalacion_id, instalacion_nombre, estado,
  -- Mapping de estado_ui (prioridad TE)
  COALESCE(
    CASE WHEN meta->>'tipo'='turno_extra' THEN 'te' END,
    meta->>'estado_ui', estado_ui_tabla,
    CASE
      WHEN estado='reemplazo' THEN 'te'
      WHEN estado IN ('trabajado','T') AND (meta->>'cobertura_guardia_id') IS NOT NULL THEN 'te'
      WHEN estado IN ('trabajado','T') THEN 'asistido'
      WHEN estado='libre' THEN 'libre'
      WHEN estado IN ('sin_cobertura','inasistencia') THEN 'sin_cobertura'
      WHEN es_ppc AND guardia_id IS NULL THEN 'ppc_libre'
      ELSE 'plan'
    END
  ) AS estado_ui,
  meta,
  COALESCE(meta->>'cobertura_guardia_id', guardia_id::text) AS guardia_trabajo_id,
  CASE WHEN (meta->>'cobertura_guardia_id') IS NOT NULL THEN (
    SELECT concat(gg.apellido_paterno,' ',gg.apellido_materno,', ',gg.nombre) FROM guardias gg
    WHERE gg.id::text = (pd.meta->>'cobertura_guardia_id')
  ) ELSE guardia_titular_nombre END AS guardia_trabajo_nombre,
  guardia_titular_id::text AS guardia_titular_id,
  guardia_titular_nombre,
  es_ppc,
  (meta->>'cobertura_guardia_id') IS NOT NULL AS es_reemplazo,
  estado IN ('sin_cobertura','inasistencia') AS es_sin_cobertura,
  estado='inasistencia' OR (meta->>'falta_sin_aviso')='true' AS es_falta_sin_aviso,
  es_ppc AND guardia_id IS NULL AND (meta->>'cobertura_guardia_id') IS NULL OR (estado IN ('sin_cobertura','inasistencia')) AND (meta->>'cobertura_guardia_id') IS NULL AS necesita_cobertura,
  hora_inicio, hora_fin, rol_id::text AS rol_id, rol_nombre, NULL::text AS rol_alias,
  CASE WHEN (meta->>'cobertura_guardia_id') IS NOT NULL THEN (
    SELECT concat(gg.apellido_paterno,' ',gg.apellido_materno,', ',gg.nombre) FROM guardias gg
    WHERE gg.id::text = (pd.meta->>'cobertura_guardia_id')
  ) ELSE NULL::text END AS reemplazo_guardia_nombre,
  CASE WHEN (meta->>'cobertura_guardia_id') IS NOT NULL THEN (
    SELECT concat(gg.apellido_paterno,' ',gg.apellido_materno,', ',gg.nombre) FROM guardias gg
    WHERE gg.id::text = (pd.meta->>'cobertura_guardia_id')
  ) ELSE NULL::text END AS cobertura_guardia_nombre
FROM pauta_dedup pd;

COMMIT;
