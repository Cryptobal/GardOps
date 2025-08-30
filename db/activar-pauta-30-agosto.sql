-- Activar registros de la pauta mensual del 30 de agosto
-- Esto permitirá que se generen los llamados automáticamente

UPDATE as_turnos_pauta_mensual 
SET estado = 'Activo' 
WHERE anio = 2025 
  AND mes = 8 
  AND dia = 30 
  AND estado IN ('libre', 'planificado')
  AND puesto_id IN (
    SELECT id FROM as_turnos_puestos_operativos WHERE activo = true
  );

-- Verificar el resultado
SELECT 
  pm.estado,
  COUNT(*) as cantidad
FROM as_turnos_pauta_mensual pm
INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
WHERE pm.anio = 2025
  AND pm.mes = 8
  AND pm.dia = 30
  AND po.activo = true
GROUP BY pm.estado
ORDER BY pm.estado;
