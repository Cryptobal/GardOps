-- Debug: Verificar datos del guardia Astorga
SELECT 
  g.id,
  g.nombre,
  g.apellido_paterno,
  g.apellido_materno,
  CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as nombre_malformado,
  CONCAT(g.nombre, ' ', g.apellido_paterno) as nombre_correcto
FROM guardias g 
WHERE g.nombre ILIKE '%astorga%' OR g.apellido_paterno ILIKE '%astorga%';

-- Verificar la pauta mensual de hoy
SELECT 
  pm.id,
  pm.puesto_id,
  pm.guardia_id,
  pm.estado,
  pm.estado_ui,
  g.nombre,
  g.apellido_paterno,
  g.apellido_materno,
  CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre) as nombre_malformado
FROM as_turnos_pauta_mensual pm
LEFT JOIN guardias g ON pm.guardia_id = g.id
WHERE pm.anio = 2024 AND pm.mes = 9 AND pm.dia = 12
  AND (g.nombre ILIKE '%astorga%' OR g.apellido_paterno ILIKE '%astorga%');
