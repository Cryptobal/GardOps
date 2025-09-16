-- ===============================================
-- LIMPIAR GUARDIAS FANTASMA EN TE_TURNOS_EXTRAS
-- ===============================================
-- Elimina registros inconsistentes que están bloqueando asignaciones

-- 1. Mostrar registros que se van a eliminar (para verificar)
SELECT 'REGISTROS A ELIMINAR:' as accion;
SELECT 
  te.id,
  te.guardia_id,
  g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
  te.fecha,
  te.pauta_id,
  'INCONSISTENTE - No corresponde al guardia_trabajo_id actual' as razon
FROM TE_turnos_extras te
LEFT JOIN guardias g ON te.guardia_id = g.id
LEFT JOIN as_turnos_pauta_mensual pm ON te.pauta_id = pm.id
WHERE te.fecha = '2025-09-12'
  AND (
    -- Caso 1: Registro en TE_turnos_extras pero no coincide con guardia_trabajo_id
    (pm.guardia_trabajo_id IS NOT NULL AND te.guardia_id != pm.guardia_trabajo_id)
    OR
    -- Caso 2: Registro en TE_turnos_extras pero no hay tipo_cobertura
    (pm.tipo_cobertura IS NULL OR pm.tipo_cobertura != 'turno_extra')
    OR
    -- Caso 3: Registro huérfano (pauta no existe)
    pm.id IS NULL
  );

-- 2. Eliminar registros inconsistentes
DELETE FROM TE_turnos_extras te
WHERE te.fecha = '2025-09-12'
  AND EXISTS (
    SELECT 1 
    FROM as_turnos_pauta_mensual pm 
    WHERE pm.id = te.pauta_id
    AND (
      -- Caso 1: No coincide con guardia_trabajo_id actual
      (pm.guardia_trabajo_id IS NOT NULL AND te.guardia_id != pm.guardia_trabajo_id)
      OR
      -- Caso 2: No hay tipo_cobertura de turno_extra
      (pm.tipo_cobertura IS NULL OR pm.tipo_cobertura != 'turno_extra')
    )
  );

-- 3. Eliminar registros huérfanos (sin pauta correspondiente)
DELETE FROM TE_turnos_extras te
WHERE te.fecha = '2025-09-12'
  AND NOT EXISTS (
    SELECT 1 FROM as_turnos_pauta_mensual pm WHERE pm.id = te.pauta_id
  );

-- 4. Mostrar estado final
SELECT 'ESTADO FINAL:' as accion;
SELECT 
  te.id,
  te.guardia_id,
  g.nombre || ' ' || g.apellido_paterno as guardia_nombre,
  te.fecha,
  te.pauta_id,
  pm.guardia_trabajo_id,
  pm.tipo_cobertura
FROM TE_turnos_extras te
LEFT JOIN guardias g ON te.guardia_id = g.id
LEFT JOIN as_turnos_pauta_mensual pm ON te.pauta_id = pm.id
WHERE te.fecha = '2025-09-12'
ORDER BY g.apellido_paterno, g.nombre;
