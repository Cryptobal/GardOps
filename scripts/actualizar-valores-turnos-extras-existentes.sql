-- Script para actualizar valores de turnos extras existentes
-- Ejecutar en base de datos GardOps

-- Verificar turnos extras con valores incorrectos
SELECT 
    te.id,
    te.guardia_id,
    g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
    te.instalacion_id,
    i.nombre as instalacion_nombre,
    i.valor_turno_extra as valor_instalacion,
    te.valor as valor_actual_turno,
    te.estado,
    te.pagado,
    te.created_at
FROM turnos_extras te
JOIN guardias g ON g.id = te.guardia_id
JOIN instalaciones i ON i.id = te.instalacion_id
WHERE te.valor = 0 OR te.valor IS NULL
ORDER BY te.created_at DESC;

-- Actualizar turnos extras con valores correctos de sus instalaciones
UPDATE turnos_extras 
SET 
    valor = i.valor_turno_extra,
    updated_at = NOW()
FROM instalaciones i
WHERE turnos_extras.instalacion_id = i.id 
  AND (turnos_extras.valor = 0 OR turnos_extras.valor IS NULL)
  AND i.valor_turno_extra IS NOT NULL 
  AND i.valor_turno_extra > 0;

-- Verificar cambios realizados
SELECT 
    te.id,
    te.guardia_id,
    g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
    te.instalacion_id,
    i.nombre as instalacion_nombre,
    i.valor_turno_extra as valor_instalacion,
    te.valor as valor_turno_extra,
    te.estado,
    te.pagado,
    te.updated_at
FROM turnos_extras te
JOIN guardias g ON g.id = te.guardia_id
JOIN instalaciones i ON i.id = te.instalacion_id
ORDER BY te.updated_at DESC
LIMIT 10;

-- Resumen de turnos extras por instalación
SELECT 
    i.nombre as instalacion_nombre,
    i.valor_turno_extra as valor_instalacion,
    COUNT(te.id) as total_turnos,
    SUM(te.valor) as monto_total,
    AVG(te.valor) as promedio_valor
FROM instalaciones i
LEFT JOIN turnos_extras te ON i.id = te.instalacion_id
WHERE i.valor_turno_extra IS NOT NULL AND i.valor_turno_extra > 0
GROUP BY i.id, i.nombre, i.valor_turno_extra
ORDER BY i.nombre; 