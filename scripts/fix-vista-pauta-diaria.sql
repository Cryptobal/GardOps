-- ===============================================
-- CORRECCIÓN DE VISTA: as_turnos_v_pauta_diaria_unificada
-- ===============================================
-- Corrige el error de columna "guardia_nombre" inexistente

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
    pm.estado_puesto as estado_pauta_mensual,
    pm.observaciones,
    pm.meta,
    
    -- NUEVOS CAMPOS PARA TURNOS EXTRAS
    pm.guardia_trabajo_id,
    pm.tipo_cobertura,
    pm.tipo_turno,
    -- LÓGICA CORREGIDA: Determinar estado_puesto basado en es_ppc y guardia_id
    CASE 
      WHEN po.es_ppc = true AND pm.guardia_id IS NULL THEN 'ppc'
      WHEN po.es_ppc = true AND pm.guardia_id IS NOT NULL THEN 'asignado'
      WHEN po.es_ppc = false AND pm.guardia_id IS NOT NULL THEN 'asignado'
      ELSE 'libre'
    END as estado_puesto,
    pm.estado_guardia,
    
    -- Información de la instalación
    i.id as instalacion_id,
    i.nombre as instalacion_nombre,
    i.telefono as instalacion_telefono,
    
    -- Información del guardia titular (CORREGIDO: usar campos existentes)
    g.id as guardia_titular_id,
    CASE 
      WHEN g.nombre IS NOT NULL AND g.apellido_paterno IS NOT NULL THEN 
        CONCAT(g.nombre, ' ', g.apellido_paterno)
      WHEN g.nombre IS NOT NULL THEN g.nombre
      WHEN g.apellido_paterno IS NOT NULL THEN g.apellido_paterno
      ELSE NULL
    END as guardia_titular_nombre,
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
    AND pm.tipo_turno = 'planificado'
  ORDER BY pm.puesto_id, pm.anio, pm.mes, pm.dia, pm.id DESC
)
SELECT 
  pd.pauta_id,
  pd.fecha,
  pd.puesto_id::text,
  pd.nombre_puesto as puesto_nombre,
  pd.instalacion_id::text,
  pd.instalacion_nombre,
  pd.estado_pauta_mensual as estado,
  pd.meta,
  pd.guardia_trabajo_id::text,
  
  -- CORREGIDO: Usar guardia_titular_nombre en lugar de guardia_nombre
  pd.guardia_titular_nombre as guardia_trabajo_nombre,
  pd.guardia_id::text as guardia_titular_id,
  pd.guardia_titular_nombre,
  pd.es_ppc,
  pd.rol_id::text,
  pd.rol_nombre,
  pd.hora_inicio,
  pd.hora_fin,
  pd.guardia_titular_telefono as guardia_telefono,
  
  -- Información de cobertura desde meta JSON
  (pd.meta->>'cobertura_guardia_id')::text as cobertura_guardia_id,
  pd.meta->>'tipo' as cobertura_estado,
  pd.meta->>'cobertura_fecha' as cobertura_fecha,
  
  -- Campos adicionales para lógica de botones
  pd.tipo_turno,
  pd.estado_puesto,
  pd.estado_guardia,
  pd.tipo_cobertura
  
FROM pauta_dedup pd;

COMMENT ON VIEW as_turnos_v_pauta_diaria_unificada IS 'Vista corregida para pauta diaria sin errores de columnas inexistentes';
