-- Verificar turnos para hoy (2025-08-30)

-- 1. Verificar qué turnos existen para hoy
SELECT 
  'Turnos planificados para hoy (2025-08-30):' as info;
SELECT 
  pm.anio,
  pm.mes,
  pm.dia,
  pm.estado,
  i.nombre as instalacion,
  po.activo
FROM as_turnos_pauta_mensual pm
INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
INNER JOIN instalaciones i ON po.instalacion_id = i.id
WHERE pm.anio = 2025 
  AND pm.mes = 8 
  AND pm.dia = 30
ORDER BY i.nombre;

-- 2. Verificar qué instalaciones tienen puestos operativos
SELECT 
  'Instalaciones con puestos operativos:' as info;
SELECT 
  i.nombre,
  COUNT(po.id) as puestos_activos
FROM instalaciones i
LEFT JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id AND po.activo = true
GROUP BY i.id, i.nombre
ORDER BY i.nombre;

-- 3. Crear turnos para hoy si no existen
INSERT INTO as_turnos_pauta_mensual (
  anio, mes, dia, puesto_id, estado, created_at, updated_at
)
SELECT 
  2025 as anio,
  8 as mes,
  30 as dia,
  po.id as puesto_id,
  'planificado' as estado,
  NOW() as created_at,
  NOW() as updated_at
FROM as_turnos_puestos_operativos po
INNER JOIN instalaciones i ON po.instalacion_id = i.id
WHERE po.activo = true
  AND NOT EXISTS (
    SELECT 1 FROM as_turnos_pauta_mensual pm 
    WHERE pm.anio = 2025 
      AND pm.mes = 8 
      AND pm.dia = 30 
      AND pm.puesto_id = po.id
  );

-- 4. Verificar turnos después de la inserción
SELECT 
  'Turnos después de la inserción:' as info;
SELECT 
  pm.anio,
  pm.mes,
  pm.dia,
  pm.estado,
  i.nombre as instalacion,
  po.activo
FROM as_turnos_pauta_mensual pm
INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
INNER JOIN instalaciones i ON po.instalacion_id = i.id
WHERE pm.anio = 2025 
  AND pm.mes = 8 
  AND pm.dia = 30
ORDER BY i.nombre;
