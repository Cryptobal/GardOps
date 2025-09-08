-- Script para corregir el problema de PPCs y datos fantasma de Aaron Aguilera
-- Ejecutar en la base de datos para limpiar inconsistencias

BEGIN;

-- 1. Identificar el registro problemático en pauta mensual
-- Puesto 2 tiene estado "plan" con Aaron Fernando Aguilera pero debería ser PPC
SELECT 
  'ANTES - Registro problemático:' as accion,
  pm.id,
  pm.puesto_id,
  pm.guardia_id,
  pm.estado,
  pm.estado_ui,
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
  AND i.nombre ILIKE '%Santa Amalia%'
  AND po.nombre_puesto = 'Puesto 2';

-- 2. Corregir el estado del Puesto 2 en pauta mensual
-- Cambiar de "plan" a "ppc" y eliminar la asignación de Aaron Fernando Aguilera
UPDATE as_turnos_pauta_mensual 
SET 
  estado = 'ppc',
  estado_ui = 'ppc',
  guardia_id = NULL,
  meta = meta - 'cobertura_guardia_id' - 'reemplazo_guardia_id',
  updated_at = NOW()
WHERE puesto_id IN (
  SELECT po.id 
  FROM as_turnos_puestos_operativos po
  JOIN instalaciones i ON po.instalacion_id = i.id
  WHERE i.nombre ILIKE '%Santa Amalia%'
    AND po.nombre_puesto = 'Puesto 2'
)
AND anio = EXTRACT(YEAR FROM CURRENT_DATE)
AND mes = EXTRACT(MONTH FROM CURRENT_DATE)
AND dia = EXTRACT(DAY FROM CURRENT_DATE);

-- 3. Verificar que ambos puestos estén correctamente configurados como PPCs
UPDATE as_turnos_puestos_operativos 
SET 
  es_ppc = true,
  guardia_id = NULL,
  actualizado_en = NOW()
WHERE id IN (
  SELECT po.id 
  FROM as_turnos_puestos_operativos po
  JOIN instalaciones i ON po.instalacion_id = i.id
  WHERE i.nombre ILIKE '%Santa Amalia%'
    AND po.nombre_puesto IN ('Puesto #1', 'Puesto 2')
);

-- 4. Verificar el resultado después de la corrección
SELECT 
  'DESPUÉS - Estado corregido:' as accion,
  pm.id,
  pm.puesto_id,
  pm.guardia_id,
  pm.estado,
  pm.estado_ui,
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
  AND i.nombre ILIKE '%Santa Amalia%'
ORDER BY po.nombre_puesto;

-- 5. Verificar la vista unificada después de la corrección
SELECT 
  'VISTA UNIFICADA - Después de corrección:' as accion,
  pauta_id,
  puesto_id,
  instalacion_nombre,
  puesto_nombre,
  estado_ui,
  es_ppc,
  guardia_trabajo_nombre,
  guardia_titular_nombre
FROM as_turnos_v_pauta_diaria_unificada
WHERE fecha = CURRENT_DATE::text
  AND instalacion_nombre ILIKE '%Santa Amalia%'
ORDER BY puesto_nombre;

COMMIT;
