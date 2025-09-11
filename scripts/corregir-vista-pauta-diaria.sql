-- ===============================================
-- CORRECCIÓN DE VISTA PAUTA DIARIA
-- ===============================================
-- Corrige la lógica de estados para que PPCs planificados sin cobertura
-- aparezcan como 'planificado' en lugar de 'sin_cobertura'

-- 1. Actualizar vista de pauta diaria unificada con lógica corregida
DROP VIEW IF EXISTS public.as_turnos_v_pauta_diaria_unificada CASCADE;

CREATE VIEW public.as_turnos_v_pauta_diaria_unificada AS
SELECT 
  pm.id as pauta_id,
  (pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date as fecha,
  pm.puesto_id::text,
  po.nombre_puesto,
  po.instalacion_id::text,
  i.nombre as instalacion_nombre,
  i.telefono as instalacion_telefono,
  pm.estado as estado_pauta_mensual,
  
  -- LÓGICA CORREGIDA DE ESTADO UI
  CASE 
    -- Si es día libre
    WHEN pm.tipo_turno = 'libre' THEN 'libre'
    
    -- Si no se ha ejecutado (estado inicial)
    WHEN pm.estado_puesto IS NULL THEN 'planificado'
    
    -- Si el puesto es libre
    WHEN pm.estado_puesto = 'libre' THEN 'libre'
    
    -- Si el puesto es PPC - CORREGIDO
    WHEN pm.estado_puesto = 'ppc' THEN
      CASE 
        WHEN pm.tipo_cobertura = 'turno_extra' THEN 'extra'
        -- CORRECCIÓN: PPC sin cobertura debe aparecer como 'planificado', no 'sin_cobertura'
        WHEN pm.tipo_cobertura = 'sin_cobertura' OR pm.tipo_cobertura IS NULL THEN 'planificado'
        ELSE 'planificado'
      END
    
    -- Si el puesto tiene guardia asignado
    WHEN pm.estado_puesto = 'asignado' THEN
      CASE 
        WHEN pm.tipo_cobertura = 'turno_extra' THEN 'extra'
        WHEN pm.tipo_cobertura = 'sin_cobertura' THEN 'sin_cobertura'
        WHEN pm.tipo_cobertura = 'guardia_asignado' THEN 'asistido'
        ELSE 'planificado'
      END
    
    ELSE 'planificado'
  END as estado_ui,
  
  -- Metadatos en formato JSON
  jsonb_build_object(
    'cobertura_guardia_id', COALESCE(pm.guardia_trabajo_id::text, pm.meta->>'cobertura_guardia_id'),
    'tipo_cobertura', pm.tipo_cobertura,
    'observaciones', pm.meta->>'observaciones',
    'estado_semaforo', pm.meta->>'estado_semaforo',
    'comentarios', pm.meta->>'comentarios'
  ) as meta,
  
  -- ID del guardia que trabaja (titular o cobertura)
  COALESCE(pm.guardia_trabajo_id, pm.guardia_id)::text as guardia_trabajo_id,
  
  -- Nombre del guardia que trabaja
  CASE 
    WHEN pm.guardia_trabajo_id IS NOT NULL THEN
      COALESCE(
        g_cobertura.nombre || ' ' || g_cobertura.apellido_paterno,
        g_titular.nombre || ' ' || g_titular.apellido_paterno
      )
    ELSE
      g_titular.nombre || ' ' || g_titular.apellido_paterno
  END as guardia_trabajo_nombre,
  
  -- Información del guardia titular
  pm.guardia_id::text as guardia_titular_id,
  g_titular.nombre || ' ' || g_titular.apellido_paterno as guardia_titular_nombre,
  
  -- Flags importantes
  CASE WHEN pm.guardia_id IS NULL THEN true ELSE false END as es_ppc,
  CASE WHEN pm.guardia_trabajo_id IS NOT NULL AND pm.guardia_trabajo_id != pm.guardia_id THEN true ELSE false END as tiene_cobertura,
  
  -- Información del rol de servicio
  rs.id::text as rol_id,
  rs.nombre as rol_nombre,
  rs.hora_inicio::text as hora_inicio,
  rs.hora_termino::text as hora_fin,
  
  -- Fechas
  pm.created_at,
  pm.updated_at
  
FROM public.as_turnos_pauta_mensual pm
LEFT JOIN public.as_turnos_puestos_operativos po ON pm.puesto_id = po.id
LEFT JOIN public.instalaciones i ON po.instalacion_id = i.id
LEFT JOIN public.guardias g_titular ON pm.guardia_id = g_titular.id
LEFT JOIN public.guardias g_cobertura ON pm.guardia_trabajo_id = g_cobertura.id
LEFT JOIN public.as_turnos_roles_servicio rs ON po.rol_id = rs.id
WHERE po.activo = true
  AND pm.estado IN ('planificado', 'libre')
ORDER BY pm.puesto_id, pm.anio, pm.mes, pm.dia, pm.id DESC;

-- 2. Actualizar vista de pauta diaria dedup
DROP VIEW IF EXISTS public.as_turnos_v_pauta_diaria_dedup_fixed CASCADE;

CREATE VIEW public.as_turnos_v_pauta_diaria_dedup_fixed AS
SELECT DISTINCT ON (puesto_id, fecha)
  *
FROM public.as_turnos_v_pauta_diaria_unificada
ORDER BY puesto_id, fecha, pauta_id DESC;

-- 3. Comentarios en las vistas
COMMENT ON VIEW public.as_turnos_v_pauta_diaria_unificada IS 'Vista unificada de pauta diaria con lógica corregida de estados - PPCs sin cobertura aparecen como planificado';
COMMENT ON VIEW public.as_turnos_v_pauta_diaria_dedup_fixed IS 'Vista deduplicada de pauta diaria con lógica corregida de estados';

-- 4. Verificar la corrección
SELECT 
  'Verificación de corrección' as test,
  estado_ui,
  COUNT(*) as cantidad
FROM public.as_turnos_v_pauta_diaria_dedup_fixed 
WHERE fecha = CURRENT_DATE
GROUP BY estado_ui
ORDER BY estado_ui;
