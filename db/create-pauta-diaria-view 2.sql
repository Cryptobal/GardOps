-- Crear vista para pauta diaria
-- Esta vista combina los datos de pauta mensual con información de instalaciones y guardias

CREATE OR REPLACE VIEW as_turnos_v_pauta_diaria AS
SELECT 
  pm.id as pauta_id,
  pm.puesto_id,
  pm.guardia_id,
  pm.anio,
  pm.mes,
  pm.dia,
  TO_DATE(CONCAT(pm.anio, '-', pm.mes, '-', pm.dia), 'YYYY-MM-DD') as fecha,
  pm.estado,
  pm.observaciones as meta,
  
  -- Información de la instalación
  i.id as instalacion_id,
  i.nombre as instalacion_nombre,
  
  -- Información del guardia
  g.nombre as guardia_nombre,
  g.apellido_paterno as guardia_apellido_paterno,
  g.apellido_materno as guardia_apellido_materno,
  
  -- Información del puesto
  po.nombre_puesto,
  po.es_ppc,
  
  -- Información del rol de servicio
  rs.nombre as rol_nombre,
  rs.hora_inicio,
  rs.hora_termino
  
FROM as_turnos_pauta_mensual pm
INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
INNER JOIN instalaciones i ON po.instalacion_id = i.id
LEFT JOIN guardias g ON pm.guardia_id = g.id
LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
WHERE po.activo = true;

-- Crear índices para optimizar la vista (si no existen)
CREATE INDEX IF NOT EXISTS idx_pauta_diaria_fecha 
ON as_turnos_pauta_mensual(anio, mes, dia);

CREATE INDEX IF NOT EXISTS idx_pauta_diaria_instalacion 
ON as_turnos_pauta_mensual(puesto_id);

-- Comentario sobre la vista
COMMENT ON VIEW as_turnos_v_pauta_diaria IS 'Vista para consultar pauta diaria con información completa de instalaciones, guardias y puestos';
