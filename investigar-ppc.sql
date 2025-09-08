-- Script para investigar el problema de PPCs y Aaron Aguilera
-- Ejecutar en la base de datos para identificar registros problemáticos

-- 1. Buscar registros de Aaron Aguilera
SELECT 
  'GUARDIAS' as tabla,
  g.id,
  g.nombre,
  g.apellido_paterno,
  g.apellido_materno,
  g.estado,
  g.tenant_id
FROM guardias g
WHERE g.nombre ILIKE '%Aaron%' 
   OR g.apellido_paterno ILIKE '%Aguilera%'
   OR g.apellido_materno ILIKE '%Toro%'
ORDER BY g.nombre, g.apellido_paterno;

-- 2. Buscar PPCs activos en puestos operativos
SELECT 
  'PUESTOS_OPERATIVOS' as tabla,
  po.id,
  po.instalacion_id,
  po.nombre_puesto,
  po.es_ppc,
  po.guardia_id,
  po.activo,
  i.nombre as instalacion_nombre,
  g.nombre || ' ' || g.apellido_paterno as guardia_nombre
FROM as_turnos_puestos_operativos po
LEFT JOIN instalaciones i ON po.instalacion_id = i.id
LEFT JOIN guardias g ON po.guardia_id = g.id
WHERE po.es_ppc = true OR po.guardia_id IS NOT NULL
ORDER BY i.nombre, po.nombre_puesto;

-- 3. Buscar en pauta mensual para hoy
SELECT 
  'PAUTA_MENSUAL' as tabla,
  pm.id,
  pm.puesto_id,
  pm.guardia_id,
  pm.estado,
  pm.estado_ui,
  pm.meta,
  po.nombre_puesto,
  i.nombre as instalacion_nombre,
  g.nombre || ' ' || g.apellido_paterno as guardia_nombre
FROM as_turnos_pauta_mensual pm
JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
JOIN instalaciones i ON po.instalacion_id = i.id
LEFT JOIN guardias g ON pm.guardia_id = g.id
WHERE pm.anio = EXTRACT(YEAR FROM CURRENT_DATE)
  AND pm.mes = EXTRACT(MONTH FROM CURRENT_DATE)
  AND pm.dia = EXTRACT(DAY FROM CURRENT_DATE)
ORDER BY i.nombre, po.nombre_puesto;

-- 4. Buscar en la vista unificada para hoy
SELECT 
  'VISTA_UNIFICADA' as tabla,
  pauta_id,
  puesto_id,
  instalacion_nombre,
  puesto_nombre,
  estado_ui,
  es_ppc,
  guardia_trabajo_nombre,
  guardia_titular_nombre,
  cobertura_guardia_nombre
FROM as_turnos_v_pauta_diaria_unificada
WHERE fecha = CURRENT_DATE::text
ORDER BY instalacion_nombre, puesto_nombre;

-- 5. Buscar específicamente en Bodega Santa Amalia
SELECT 
  'SANTA_AMALIA' as tabla,
  pauta_id,
  puesto_id,
  instalacion_nombre,
  puesto_nombre,
  estado_ui,
  es_ppc,
  guardia_trabajo_nombre,
  guardia_titular_nombre,
  cobertura_guardia_nombre,
  meta
FROM as_turnos_v_pauta_diaria_unificada
WHERE fecha = CURRENT_DATE::text
  AND instalacion_nombre ILIKE '%Santa Amalia%'
ORDER BY puesto_nombre;
