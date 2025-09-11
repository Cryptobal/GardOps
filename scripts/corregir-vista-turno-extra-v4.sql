-- Corregir vista para incluir información de turnos extra (versión 4)

CREATE OR REPLACE VIEW as_turnos_v_pauta_diaria_unificada AS
WITH pauta_diaria AS (
  SELECT 
    pm.id as pauta_id,
    pm.instalacion_id,
    pm.puesto_id,
    pm.anio,
    pm.mes,
    pm.dia,
    CONCAT(pm.anio, '-', LPAD(pm.mes::text, 2, '0'), '-', LPAD(pm.dia::text, 2, '0'))::date as fecha,
    pm.estado,
    pm.estado_ui,
    pm.tipo_turno,
    pm.estado_puesto,
    pm.estado_guardia,
    pm.tipo_cobertura,
    pm.guardia_trabajo_id,
    pm.turno_extra_guardia_id,
    pm.created_at,
    pm.updated_at,
    pm.observaciones,
    pm.reemplazo_guardia_id,
    pm.meta,
    pm.editado_manualmente,
    pm.plan_base,
    pm.estado_rrhh,
    pm.estado_operacion,
    pm.guardia_asignado_id,
    pm.turno_extra_motivo
  FROM public.as_turnos_pauta_mensual pm
  WHERE pm.anio IS NOT NULL 
    AND pm.mes IS NOT NULL 
    AND pm.dia IS NOT NULL
)
SELECT 
  pd.pauta_id,
  pd.fecha,
  pd.puesto_id,
  po.nombre_puesto,
  pd.instalacion_id,
  i.nombre as instalacion_nombre,
  i.telefono as instalacion_telefono,
  pd.estado as estado_pauta_mensual,
  pd.estado_ui,
  pd.tipo_turno,
  pd.estado_puesto,
  pd.estado_guardia,
  pd.tipo_cobertura,
  pd.guardia_trabajo_id,
  pd.turno_extra_guardia_id,
  pd.created_at,
  pd.updated_at,
  pd.observaciones,
  pd.reemplazo_guardia_id,
  pd.meta,
  pd.editado_manualmente,
  pd.plan_base,
  pd.estado_rrhh,
  pd.estado_operacion,
  pd.guardia_asignado_id,
  pd.turno_extra_motivo,
  
  -- Información del guardia titular
  gt.id as guardia_titular_id,
  gt.nombre as guardia_titular_nombre,
  gt.telefono as guardia_titular_telefono,
  
  -- Información del guardia de trabajo
  gw.nombre as guardia_trabajo_nombre,
  gw.telefono as guardia_trabajo_telefono,
  
  -- Información del guardia de cobertura (turno extra)
  gc.nombre as cobertura_guardia_nombre,
  gc.telefono as cobertura_guardia_telefono,
  
  -- Información del guardia de reemplazo (convertir text a uuid)
  gr.nombre as reemplazo_guardia_nombre,
  gr.telefono as reemplazo_guardia_telefono,
  
  -- Información del rol (desde puesto operativo)
  po.rol_id,
  r.nombre as rol_nombre,
  r.hora_inicio,
  r.hora_termino as hora_fin,
  
  -- Flags
  (pd.guardia_trabajo_id IS NULL) as es_ppc,
  (pd.turno_extra_guardia_id IS NOT NULL OR pd.reemplazo_guardia_id IS NOT NULL) as tiene_cobertura,
  
  -- Campos adicionales para compatibilidad
  pd.meta->>'estado_semaforo' as estado_semaforo,
  pd.meta->>'comentarios' as comentarios,
  pd.meta->>'cobertura_guardia_id' as meta_cobertura_guardia_id

FROM pauta_diaria pd
LEFT JOIN public.as_turnos_puestos_operativos po ON pd.puesto_id = po.id
LEFT JOIN public.instalaciones i ON pd.instalacion_id = i.id
LEFT JOIN public.guardias gt ON pd.guardia_asignado_id = gt.id
LEFT JOIN public.guardias gw ON pd.guardia_trabajo_id = gw.id
LEFT JOIN public.guardias gc ON pd.turno_extra_guardia_id = gc.id  -- Guardia de turno extra
LEFT JOIN public.guardias gr ON pd.reemplazo_guardia_id::uuid = gr.id  -- Convertir text a uuid
LEFT JOIN public.as_turnos_roles_servicio r ON po.rol_id = r.id
ORDER BY pd.puesto_id, pd.anio, pd.mes, pd.dia, pd.id DESC;
