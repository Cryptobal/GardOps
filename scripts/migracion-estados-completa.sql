-- ===============================================
-- MIGRACIÓN COMPLETA DE ESTADOS DE TURNOS
-- Elimina completamente la lógica anterior
-- ===============================================

-- PASO 1: Crear backup de datos actuales
CREATE TABLE IF NOT EXISTS backup_estados_turnos_20250111 AS
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
FROM public.as_turnos_pauta_mensual
WHERE estado IS NOT NULL OR estado_ui IS NOT NULL;

CREATE TABLE IF NOT EXISTS backup_turnos_extras_20250111 AS
SELECT * FROM public.te_turnos_extras;

-- PASO 2: Agregar nuevas columnas
ALTER TABLE public.as_turnos_pauta_mensual 
ADD COLUMN IF NOT EXISTS tipo_turno TEXT,
ADD COLUMN IF NOT EXISTS estado_puesto TEXT,
ADD COLUMN IF NOT EXISTS estado_guardia TEXT,
ADD COLUMN IF NOT EXISTS tipo_cobertura TEXT,
ADD COLUMN IF NOT EXISTS guardia_trabajo_id UUID;

-- PASO 3: Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_pauta_tipo_turno ON public.as_turnos_pauta_mensual(tipo_turno);
CREATE INDEX IF NOT EXISTS idx_pauta_estado_puesto ON public.as_turnos_pauta_mensual(estado_puesto);
CREATE INDEX IF NOT EXISTS idx_pauta_estado_guardia ON public.as_turnos_pauta_mensual(estado_guardia);
CREATE INDEX IF NOT EXISTS idx_pauta_tipo_cobertura ON public.as_turnos_pauta_mensual(tipo_cobertura);
CREATE INDEX IF NOT EXISTS idx_pauta_guardia_trabajo ON public.as_turnos_pauta_mensual(guardia_trabajo_id);

-- PASO 4: Migrar datos existentes
UPDATE public.as_turnos_pauta_mensual 
SET 
  -- TIPO DE TURNO
  tipo_turno = CASE 
    WHEN estado = 'libre' THEN 'libre'
    ELSE 'planificado'
  END,
  
  -- ESTADO DEL PUESTO
  estado_puesto = CASE 
    WHEN estado = 'libre' THEN 'libre'
    WHEN guardia_id IS NULL THEN 'ppc'
    ELSE 'asignado'
  END,
  
  -- ESTADO DEL GUARDIA (solo si hay guardia asignado)
  estado_guardia = CASE 
    WHEN estado = 'trabajado' THEN 'asistido'
    WHEN estado = 'reemplazo' THEN 'falta'
    WHEN estado = 'inasistencia' THEN 'falta'
    WHEN estado = 'permiso' THEN 'permiso'
    WHEN estado = 'vacaciones' THEN 'vacaciones'
    WHEN estado = 'licencia' THEN 'licencia'
    WHEN estado = 'libre' THEN NULL
    WHEN guardia_id IS NULL THEN NULL
    ELSE NULL
  END,
  
  -- TIPO DE COBERTURA (solo si hay guardia asignado)
  tipo_cobertura = CASE 
    WHEN estado = 'libre' THEN NULL
    WHEN guardia_id IS NULL THEN NULL
    WHEN estado_ui = 'asistido' AND (meta->>'cobertura_guardia_id' IS NULL) THEN 'guardia_asignado'
    WHEN estado_ui IN ('reemplazo', 'extra', 'te', 'turno_extra') OR (meta->>'cobertura_guardia_id' IS NOT NULL) THEN 'turno_extra'
    WHEN estado_ui IN ('sin_cobertura', 'inasistencia') THEN 'sin_cobertura'
    WHEN estado = 'trabajado' THEN 'guardia_asignado'
    WHEN estado = 'reemplazo' THEN 'turno_extra'
    WHEN estado = 'inasistencia' THEN 'sin_cobertura'
    ELSE NULL
  END,
  
  -- GUARDIA QUE TRABAJÓ
  guardia_trabajo_id = CASE 
    WHEN meta->>'cobertura_guardia_id' IS NOT NULL THEN (meta->>'cobertura_guardia_id')::UUID
    ELSE guardia_id
  END
WHERE tipo_turno IS NULL;

-- PASO 5: Limpiar metadatos obsoletos
UPDATE public.as_turnos_pauta_mensual 
SET meta = meta - 'estado_ui' - 'reemplazo_guardia_id' - 'reemplazo_guardia_nombre'
WHERE meta ? 'estado_ui' OR meta ? 'reemplazo_guardia_id' OR meta ? 'reemplazo_guardia_nombre';

-- PASO 6: Validar migración
SELECT 
  'Total registros migrados' as tipo,
  COUNT(*) as cantidad
FROM public.as_turnos_pauta_mensual
WHERE tipo_turno IS NOT NULL
UNION ALL
SELECT 
  'Con tipo_turno' as tipo,
  COUNT(*) as cantidad
FROM public.as_turnos_pauta_mensual
WHERE tipo_turno IS NOT NULL
UNION ALL
SELECT 
  'Con estado_puesto' as tipo,
  COUNT(*) as cantidad
FROM public.as_turnos_pauta_mensual
WHERE estado_puesto IS NOT NULL
UNION ALL
SELECT 
  'Con estado_guardia' as tipo,
  COUNT(*) as cantidad
FROM public.as_turnos_pauta_mensual
WHERE estado_guardia IS NOT NULL
UNION ALL
SELECT 
  'Con tipo_cobertura' as tipo,
  COUNT(*) as cantidad
FROM public.as_turnos_pauta_mensual
WHERE tipo_cobertura IS NOT NULL;

-- PASO 7: Verificar consistencia
SELECT 
  'Inconsistencias encontradas' as tipo,
  COUNT(*) as cantidad
FROM public.as_turnos_pauta_mensual
WHERE 
  (estado_puesto = 'asignado' AND (estado_guardia IS NULL OR tipo_cobertura IS NULL))
  OR (estado_puesto = 'ppc' AND estado_guardia IS NOT NULL)
  OR (tipo_turno = 'libre' AND (estado_guardia IS NOT NULL OR tipo_cobertura IS NOT NULL));
