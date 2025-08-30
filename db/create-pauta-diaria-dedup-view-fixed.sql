-- Vista para pauta diaria con deduplicación y lógica corregida
-- Esta vista implementa los 3 estados consistentes y filtra correctamente los PPCs libres

-- Eliminar vista existente si existe
DROP VIEW IF EXISTS as_turnos_v_pauta_diaria_dedup_fixed CASCADE;

-- Crear vista con deduplicación y todas las columnas necesarias
CREATE OR REPLACE VIEW as_turnos_v_pauta_diaria_dedup_fixed AS
WITH pauta_dedup AS (
  SELECT DISTINCT ON (pm.puesto_id, pm.anio, pm.mes, pm.dia)
    pm.id::text as pauta_id,
    pm.puesto_id,
    pm.guardia_id,
    pm.anio,
    pm.mes,
    pm.dia,
    TO_DATE(CONCAT(pm.anio, '-', pm.mes, '-', pm.dia), 'YYYY-MM-DD') as fecha,
    pm.estado,
    pm.estado_ui,
    pm.observaciones,
    pm.meta,
    
    -- Información de la instalación (usar LEFT JOIN para incluir puestos inexistentes)
    COALESCE(i.id, '00000000-0000-0000-0000-000000000000'::uuid) as instalacion_id,
    COALESCE(i.nombre, 'Instalación no encontrada') as instalacion_nombre,
    
    -- Información del guardia titular
    COALESCE(pm.guardia_id, po.guardia_id) as guardia_titular_id,
    CASE 
      WHEN pm.guardia_id IS NOT NULL THEN CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre)
      WHEN po.guardia_id IS NOT NULL THEN 
        (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
         FROM guardias WHERE id = po.guardia_id)
      ELSE NULL
    END as guardia_titular_nombre,
    
    -- Información del puesto (manejar casos donde no existe)
    COALESCE(po.nombre_puesto, 'Puesto no encontrado') as puesto_nombre,
    -- PPC se detecta por guardia_id IS NULL, no por meta->>'origen'
    (pm.guardia_id IS NULL) as es_ppc,
    
    -- Información del rol de servicio
    COALESCE(rs.id, '00000000-0000-0000-0000-000000000000'::uuid) as rol_id,
    COALESCE(rs.nombre, 'Rol no encontrado') as rol_nombre,
    COALESCE(rs.hora_inicio::text, '00:00') as hora_inicio,
    COALESCE(rs.hora_termino::text, '00:00') as hora_fin,
    
    -- Información de cobertura desde turnos_extras (el más reciente)
    te.guardia_id as cobertura_guardia_id,
    te.estado as tipo_cobertura,
    te.created_at as cobertura_fecha,
    
    -- Información de cobertura desde meta JSON (para compatibilidad)
    (pm.meta->>'cobertura_guardia_id')::uuid as meta_cobertura_guardia_id,
    pm.meta->>'tipo' as meta_tipo_cobertura
    
  FROM as_turnos_pauta_mensual pm
  LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id AND po.activo = true
  LEFT JOIN instalaciones i ON COALESCE(po.instalacion_id, '00000000-0000-0000-0000-000000000000'::uuid) = i.id
  LEFT JOIN guardias g ON pm.guardia_id = g.id
  LEFT JOIN as_turnos_roles_servicio rs ON COALESCE(po.rol_id, '00000000-0000-0000-0000-000000000000'::uuid) = rs.id
  LEFT JOIN LATERAL (
    SELECT guardia_id, estado, created_at
    FROM TE_turnos_extras te
    WHERE te.pauta_id = pm.id
    ORDER BY te.created_at DESC
    LIMIT 1
  ) te ON true
  ORDER BY pm.puesto_id, pm.anio, pm.mes, pm.dia, pm.id DESC
)
SELECT 
  pd.pauta_id,
  pd.fecha::text,
  pd.puesto_id::text,
  pd.puesto_nombre,
  pd.instalacion_id::text,
  pd.instalacion_nombre,
  pd.estado,
  
  -- Usar directamente el estado_ui de la tabla base
  pd.estado_ui,
  
  -- Metadatos en formato JSON
  jsonb_build_object(
    'cobertura_guardia_id', COALESCE(pd.cobertura_guardia_id::text, pd.meta_cobertura_guardia_id::text),
    'tipo_cobertura', COALESCE(pd.tipo_cobertura, pd.meta_tipo_cobertura),
    'observaciones', pd.observaciones
  ) as meta,
  
  -- ID del guardia que trabaja (titular o cobertura)
  COALESCE(pd.cobertura_guardia_id, pd.meta_cobertura_guardia_id, pd.guardia_id)::text as guardia_trabajo_id,
  
  -- Nombre del guardia que trabaja
  CASE 
    WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias WHERE id = pd.cobertura_guardia_id)
    WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias WHERE id = pd.meta_cobertura_guardia_id)
    ELSE pd.guardia_titular_nombre
  END as guardia_trabajo_nombre,
  
  -- Información del guardia titular
  pd.guardia_titular_id::text,
  pd.guardia_titular_nombre,
  
  -- Flags de estado
  pd.es_ppc,
  (pd.cobertura_guardia_id IS NOT NULL OR pd.meta_cobertura_guardia_id IS NOT NULL) as es_reemplazo,
  (pd.estado IN ('sin_cobertura', 'inasistencia')) as es_sin_cobertura,
  (pd.estado = 'inasistencia') as es_falta_sin_aviso,
  (pd.es_ppc AND pd.guardia_id IS NULL) OR 
  (pd.estado IN ('sin_cobertura', 'inasistencia')) as necesita_cobertura,
  
  -- Información del horario
  pd.hora_inicio,
  pd.hora_fin,
  pd.rol_id::text,
  pd.rol_nombre,
  NULL::text as rol_alias,
  
  -- Nombres de reemplazo/cobertura (para compatibilidad)
  CASE 
    WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias WHERE id = pd.cobertura_guardia_id)
    WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias WHERE id = pd.meta_cobertura_guardia_id)
    ELSE NULL
  END as reemplazo_guardia_nombre,
  
  CASE 
    WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias WHERE id = pd.cobertura_guardia_id)
    WHEN pd.meta_cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias WHERE id = pd.meta_cobertura_guardia_id)
    ELSE NULL
  END as cobertura_guardia_nombre
  
FROM pauta_dedup pd;

-- Crear índices para optimizar la vista
CREATE INDEX IF NOT EXISTS idx_pauta_mensual_fecha_completa 
ON as_turnos_pauta_mensual(anio, mes, dia);

CREATE INDEX IF NOT EXISTS idx_turnos_extras_pauta 
ON TE_turnos_extras(pauta_id);

CREATE INDEX IF NOT EXISTS idx_turnos_extras_created 
ON TE_turnos_extras(created_at DESC);

-- Comentario descriptivo
COMMENT ON VIEW as_turnos_v_pauta_diaria_dedup_fixed IS 'Vista para pauta diaria con estados consistentes: Asistió, Turno Extra, Sin Cobertura';
