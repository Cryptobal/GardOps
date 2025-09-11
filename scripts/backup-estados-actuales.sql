-- Backup de estados actuales antes de migración
-- Ejecutar antes de cualquier cambio

-- 1. Crear tabla de backup de estados actuales
CREATE TABLE IF NOT EXISTS backup_estados_turnos_$(date +%Y%m%d) AS
SELECT 
  id,
  estado,
  estado_ui,
  meta,
  guardia_id,
  puesto_id,
  fecha,
  created_at,
  updated_at
FROM as_turnos_pauta_mensual
WHERE estado IS NOT NULL OR estado_ui IS NOT NULL;

-- 2. Crear tabla de backup de turnos extras
CREATE TABLE IF NOT EXISTS backup_turnos_extras_$(date +%Y%m%d) AS
SELECT * FROM TE_turnos_extras;

-- 3. Verificar conteos antes de migración
SELECT 
  'as_turnos_pauta_mensual' as tabla,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN estado IS NOT NULL THEN 1 END) as con_estado,
  COUNT(CASE WHEN estado_ui IS NOT NULL THEN 1 END) as con_estado_ui
FROM as_turnos_pauta_mensual
UNION ALL
SELECT 
  'TE_turnos_extras' as tabla,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN estado IS NOT NULL THEN 1 END) as con_estado,
  COUNT(CASE WHEN estado_ui IS NOT NULL THEN 1 END) as con_estado_ui
FROM TE_turnos_extras;
