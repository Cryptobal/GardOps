-- ===============================================
-- CORRECCIÓN DE VISTA: as_turnos_v_pauta_diaria_unificada
-- ===============================================
-- Actualiza la vista para que funcione con la nueva lógica de turnos extras

DROP VIEW IF EXISTS as_turnos_v_pauta_diaria_unificada CASCADE;

CREATE OR REPLACE VIEW as_turnos_v_pauta_diaria_unificada AS
WITH pauta_dedup AS (
  SELECT DISTINCT ON (pm.puesto_id, pm.anio, pm.mes, pm.dia)
    pm.id::text as pauta_id,
    pm.puesto_id,
    pm.guardia_id,
    pm.anio,
    pm.mes,
    pm.dia,
    TO_DATE(CONCAT(pm.anio, '-', pm.mes, '-', pm.dia), 'YYYY-MM-DD') as fecha,
    pm.estado as estado_pauta_mensual,
    pm.estado_ui,
    pm.observaciones,
    pm.meta,
    
    -- NUEVOS CAMPOS PARA TURNOS EXTRAS
    pm.guardia_trabajo_id,
    pm.tipo_cobertura,
    pm.tipo_turno,
    pm.estado_puesto,
    pm.estado_guardia,
    
    -- Información de la instalación
    i.id as instalacion_id,
    i.nombre as instalacion_nombre,
    i.telefono as instalacion_telefono,
    
    -- Información del guardia titular
    g.id as guardia_titular_id,
    CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as guardia_titular_nombre,
    g.telefono as guardia_titular_telefono,
    
    -- Información del puesto
    po.nombre_puesto,
    po.es_ppc,
    
    -- Información del rol de servicio
    rs.id as rol_id,
    rs.nombre as rol_nombre,
    rs.hora_inicio::text as hora_inicio,
    rs.hora_termino::text as hora_fin
    
  FROM as_turnos_pauta_mensual pm
  INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
  INNER JOIN instalaciones i ON po.instalacion_id = i.id
  LEFT JOIN guardias g ON pm.guardia_id = g.id
  LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
  WHERE po.activo = true
    AND pm.estado IN ('planificado', 'libre', 'sin_cobertura')  
  ORDER BY pm.puesto_id, pm.anio, pm.mes, pm.dia, pm.id DESC
)
SELECT 
  pd.pauta_id,
  pd.fecha::text,
  pd.puesto_id::text,
  pd.nombre_puesto as puesto_nombre,
  pd.instalacion_id::text,
  pd.instalacion_nombre,
  pd.instalacion_telefono,
  pd.estado_pauta_mensual,
  
  -- Estado UI para Pauta Diaria (NUEVA LÓGICA)
  CASE 
    -- Si no se ha marcado asistencia, aparece como 'planificado'
    WHEN pd.estado_ui IS NULL OR pd.estado_ui = 'plan' THEN 'planificado'
    
    -- Estados de ejecución
    WHEN pd.estado_ui = 'asistio' THEN 'asistido'
    WHEN pd.estado_ui = 'inasistencia' THEN 'inasistencia'
    WHEN pd.estado_ui = 'reemplazo' THEN 'reemplazo'
    WHEN pd.estado_ui = 'sin_cobertura' THEN 'sin_cobertura'
    
    -- Estados de turno extra (NUEVA LÓGICA)
    WHEN pd.estado_ui = 'extra' THEN 'extra'
    WHEN pd.estado_ui = 'turno_extra' THEN 'extra'
    WHEN pd.estado_ui = 'te' THEN 'extra'
    
    -- Por defecto, planificado
    ELSE 'planificado'
  END as estado_ui,
  
  -- Metadatos en formato JSON (ACTUALIZADO)
  jsonb_build_object(
    'cobertura_guardia_id', CASE 
      WHEN pd.guardia_trabajo_id IS NOT NULL THEN pd.guardia_trabajo_id::text
      ELSE pd.meta->>'cobertura_guardia_id'
    END,
    'tipo_cobertura', COALESCE(pd.tipo_cobertura, pd.meta->>'tipo'),
    'observaciones', pd.observaciones,
    'estado_semaforo', pd.meta->>'estado_semaforo',
    'comentarios', pd.meta->>'comentarios'
  ) as meta,
  
  -- ID del guardia que trabaja (NUEVA LÓGICA)
  COALESCE(pd.guardia_trabajo_id, pd.guardia_titular_id)::text as guardia_trabajo_id,
  
  -- Nombre del guardia que trabaja (NUEVA LÓGICA)
  CASE 
    WHEN pd.guardia_trabajo_id IS NOT NULL THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias WHERE id = pd.guardia_trabajo_id)
    ELSE pd.guardia_titular_nombre
  END as guardia_trabajo_nombre,
  
  -- Teléfono del guardia que trabaja (NUEVA LÓGICA)
  CASE 
    WHEN pd.guardia_trabajo_id IS NOT NULL THEN 
      (SELECT telefono FROM guardias WHERE id = pd.guardia_trabajo_id)
    ELSE pd.guardia_titular_telefono
  END as guardia_trabajo_telefono,
  
  -- Información del guardia titular
  pd.guardia_titular_id::text,
  pd.guardia_titular_nombre,
  pd.guardia_titular_telefono,
  
  -- Flags de estado (ACTUALIZADOS)
  pd.es_ppc,
  (pd.guardia_trabajo_id IS NOT NULL AND pd.tipo_cobertura = 'turno_extra') as es_reemplazo,
  (pd.estado_ui IN ('sin_cobertura', 'inasistencia')) as es_sin_cobertura,
  (pd.estado_ui = 'inasistencia') as es_falta_sin_aviso,
  (pd.es_ppc AND pd.guardia_titular_id IS NULL) OR 
  (pd.estado_ui IN ('sin_cobertura', 'inasistencia')) as necesita_cobertura,
  
  -- Información del horario
  pd.hora_inicio,
  pd.hora_fin,
  pd.rol_id::text,
  pd.rol_nombre,
  
  -- Nombres de reemplazo/cobertura (NUEVA LÓGICA)
  CASE 
    WHEN pd.guardia_trabajo_id IS NOT NULL AND pd.tipo_cobertura = 'turno_extra' THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias WHERE id = pd.guardia_trabajo_id)
    ELSE NULL
  END as reemplazo_guardia_nombre,
  
  CASE 
    WHEN pd.guardia_trabajo_id IS NOT NULL AND pd.tipo_cobertura = 'turno_extra' THEN 
      (SELECT CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) 
       FROM guardias WHERE id = pd.guardia_trabajo_id)
    ELSE NULL
  END as cobertura_guardia_nombre,
  
  -- Teléfono de cobertura (NUEVA LÓGICA)
  CASE 
    WHEN pd.guardia_trabajo_id IS NOT NULL AND pd.tipo_cobertura = 'turno_extra' THEN 
      (SELECT telefono FROM guardias WHERE id = pd.guardia_trabajo_id)
    ELSE NULL
  END as cobertura_guardia_telefono
  
FROM pauta_dedup pd;

-- Crear índices para optimizar la vista (si no existen)
CREATE INDEX IF NOT EXISTS idx_pauta_mensual_planificado 
ON as_turnos_pauta_mensual(estado) WHERE estado = 'planificado';

CREATE INDEX IF NOT EXISTS idx_pauta_mensual_fecha_completa 
ON as_turnos_pauta_mensual(anio, mes, dia);

CREATE INDEX IF NOT EXISTS idx_pauta_guardia_trabajo 
ON as_turnos_pauta_mensual(guardia_trabajo_id);

CREATE INDEX IF NOT EXISTS idx_pauta_tipo_cobertura 
ON as_turnos_pauta_mensual(tipo_cobertura);

-- Comentario descriptivo
COMMENT ON VIEW as_turnos_v_pauta_diaria_unificada IS 'Vista unificada para Pauta Diaria: Usa nueva lógica con guardia_trabajo_id y tipo_cobertura para turnos extras';
