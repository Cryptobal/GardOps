-- Script para limpiar estados incorrectos en Pauta Diaria
-- Ejecutar en Neon Database

-- 1. Ver registros actuales con estado 'trabajado' sin confirmación manual
SELECT 
  id,
  puesto_id,
  guardia_id,
  estado,
  anio,
  mes,
  dia,
  created_at
FROM as_turnos_pauta_mensual 
WHERE estado = 'trabajado' 
  AND (confirmacion_manual IS NULL OR confirmacion_manual = false)
ORDER BY created_at DESC;

-- 2. Actualizar registros incorrectos a estado 'T' (Asignado)
UPDATE as_turnos_pauta_mensual
SET estado = 'T',
    updated_at = NOW()
WHERE estado = 'trabajado' 
  AND (confirmacion_manual IS NULL OR confirmacion_manual = false);

-- 3. Verificar el resultado
SELECT 
  estado,
  COUNT(*) as cantidad
FROM as_turnos_pauta_mensual 
GROUP BY estado
ORDER BY estado;

-- 4. Verificar que los registros con guardia asignado tengan estado 'T'
SELECT 
  estado,
  COUNT(*) as cantidad
FROM as_turnos_pauta_mensual 
WHERE guardia_id IS NOT NULL
GROUP BY estado
ORDER BY estado; 