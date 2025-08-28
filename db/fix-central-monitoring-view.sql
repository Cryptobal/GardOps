-- Corregir la vista de turnos activos con los nombres de tablas correctos
DROP VIEW IF EXISTS central_v_turnos_activos;

CREATE VIEW central_v_turnos_activos AS
SELECT 
  i.id as instalacion_id,
  i.nombre as instalacion_nombre,
  i.telefono as instalacion_telefono,
  g.id as guardia_id,
  g.nombre as guardia_nombre,
  g.telefono as guardia_telefono,
  r.nombre as rol_nombre,
  r.hora_inicio,
  r.hora_termino,
  p.nombre_puesto as nombre_puesto,
  pm.estado as estado_pauta,
  pm.anio,
  pm.mes,
  pm.dia,
  DATE(pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0')) as fecha
FROM instalaciones i
JOIN as_turnos_puestos_operativos p ON i.id = p.instalacion_id
JOIN as_turnos_pauta_mensual pm ON p.id = pm.puesto_id
JOIN as_turnos_roles_servicio r ON p.rol_id = r.id
LEFT JOIN guardias g ON pm.guardia_id = g.id
WHERE pm.estado = 'activo'
  AND DATE(pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0')) = CURRENT_DATE
ORDER BY i.nombre, r.hora_inicio;
