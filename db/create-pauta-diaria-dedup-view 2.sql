-- Vista para pauta diaria con deduplicación
-- Esta vista maneja correctamente los duplicados y proporciona datos normalizados para la UI

-- Eliminar vista existente si existe
DROP VIEW IF EXISTS as_turnos_v_pauta_diaria_dedup CASCADE;

-- Crear vista con deduplicación y todas las columnas necesarias
CREATE OR REPLACE VIEW as_turnos_v_pauta_diaria_dedup AS
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
    pm.observaciones,
    
    -- Información de la instalación
    i.id as instalacion_id,
    i.nombre as instalacion_nombre,
    
    -- Información del guardia titular
    g.id as guardia_titular_id,
    CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_titular_nombre,
    
    -- Información del puesto
    po.nombre_puesto as puesto_nombre,
    po.es_ppc,
    
    -- Información del rol de servicio
    rs.id as rol_id,
    rs.nombre as rol_nombre,
    rs.hora_inicio::text as hora_inicio,
    rs.hora_termino::text as hora_fin,
    
    -- Información de cobertura desde turnos_extras (el más reciente)
    te.guardia_id as cobertura_guardia_id,
    te.estado as tipo_cobertura,
    te.created_at as cobertura_fecha
    
  FROM as_turnos_pauta_mensual pm
  INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
  INNER JOIN instalaciones i ON po.instalacion_id = i.id
  LEFT JOIN guardias g ON pm.guardia_id = g.id
  LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
  LEFT JOIN LATERAL (
    SELECT guardia_id, estado, created_at
    FROM TE_turnos_extras te
    WHERE te.pauta_id = pm.id
    ORDER BY te.created_at DESC
    LIMIT 1
  ) te ON true
  WHERE po.activo = true
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
  
  -- Estado UI normalizado
  CASE 
    WHEN pd.estado IN ('trabajado', 'T') AND pd.cobertura_guardia_id IS NOT NULL THEN 'reemplazo'
    WHEN pd.estado IN ('trabajado', 'T') THEN 'asistido'
    WHEN pd.estado = 'sin_cobertura' THEN 'sin_cobertura'
    WHEN pd.estado = 'inasistencia' THEN 'sin_cobertura'
    WHEN pd.estado = 'permiso' THEN 'permiso'
    WHEN pd.estado = 'licencia' THEN 'licencia'
    WHEN pd.es_ppc AND (pd.guardia_id IS NULL OR pd.estado IN ('libre', 'planificado')) THEN 'ppc_libre'
    WHEN pd.estado = 'libre' THEN 'libre'
    ELSE 'plan'
  END as estado_ui,
  
  -- Metadatos en formato JSON
  jsonb_build_object(
    'cobertura_guardia_id', pd.cobertura_guardia_id::text,
    'tipo_cobertura', pd.tipo_cobertura,
    'observaciones', pd.observaciones
  ) as meta,
  
  -- ID del guardia que trabaja (titular o cobertura)
  COALESCE(pd.cobertura_guardia_id, pd.guardia_id)::text as guardia_trabajo_id,
  
  -- Nombre del guardia que trabaja
  CASE 
    WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias WHERE id = pd.cobertura_guardia_id)
    ELSE pd.guardia_titular_nombre
  END as guardia_trabajo_nombre,
  
  -- Información del guardia titular
  pd.guardia_titular_id::text,
  pd.guardia_titular_nombre,
  
  -- Flags de estado
  pd.es_ppc,
  (pd.cobertura_guardia_id IS NOT NULL) as es_reemplazo,
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
    ELSE NULL
  END as reemplazo_guardia_nombre,
  
  CASE 
    WHEN pd.cobertura_guardia_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias WHERE id = pd.cobertura_guardia_id)
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
COMMENT ON VIEW as_turnos_v_pauta_diaria_dedup IS 'Vista para pauta diaria con deduplicación y normalización de estados para la UI';
