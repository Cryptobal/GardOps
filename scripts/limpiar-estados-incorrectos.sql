-- Script para limpiar estados incorrectos en Pauta Diaria
-- Ejecutar en Neon Database

-- 1. Ver registros con estado 'trabajado' que no deberían estar así
SELECT 
  pm.id,
  pm.puesto_id,
  pm.guardia_id,
  pm.estado,
  pm.anio,
  pm.mes,
  pm.dia,
  po.nombre_puesto,
  po.es_ppc,
  i.nombre as instalacion_nombre,
  pm.created_at
FROM as_turnos_pauta_mensual pm
INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
INNER JOIN instalaciones i ON po.instalacion_id = i.id
WHERE pm.estado = 'trabajado' 
  AND pm.anio = 2025 
  AND pm.mes = 8 
  AND pm.dia = 6
ORDER BY pm.created_at DESC;

-- 2. Verificar si hay registros de turnos_extras (reemplazos) para estos puestos
SELECT 
  pm.id as pauta_id,
  pm.puesto_id,
  pm.estado,
  te.id as turno_extra_id,
  te.guardia_id as reemplazo_guardia_id
FROM as_turnos_pauta_mensual pm
LEFT JOIN turnos_extras te ON pm.id = te.pauta_id
WHERE pm.estado = 'trabajado' 
  AND pm.anio = 2025 
  AND pm.mes = 8 
  AND pm.dia = 6;

-- 3. Actualizar registros incorrectos a estado 'T' (Asignado)
-- Solo los que están marcados como 'trabajado' pero no tienen reemplazo confirmado
UPDATE as_turnos_pauta_mensual
SET estado = 'T',
    updated_at = NOW()
WHERE estado = 'trabajado' 
  AND anio = 2025 
  AND mes = 8 
  AND dia = 6
  AND id NOT IN (
    SELECT DISTINCT pm.id 
    FROM as_turnos_pauta_mensual pm
    INNER JOIN turnos_extras te ON pm.id = te.pauta_id
    WHERE pm.estado = 'trabajado' 
      AND pm.anio = 2025 
      AND pm.mes = 8 
      AND pm.dia = 6
  );

-- 4. Verificar el resultado después de la limpieza
SELECT 
  estado,
  COUNT(*) as cantidad
FROM as_turnos_pauta_mensual 
WHERE anio = 2025 AND mes = 8 AND dia = 6
GROUP BY estado
ORDER BY estado;

-- 5. Verificar que los PPCs tengan estado correcto
SELECT 
  po.nombre_puesto,
  po.es_ppc,
  pm.estado,
  pm.guardia_id
FROM as_turnos_pauta_mensual pm
INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
WHERE pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 6
  AND po.es_ppc = true
ORDER BY po.nombre_puesto; 