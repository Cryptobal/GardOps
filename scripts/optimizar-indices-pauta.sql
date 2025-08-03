-- Script para optimizar índices relacionados con pautas mensuales
-- Ejecutar este script para mejorar el rendimiento de las consultas

-- Índices para tabla as_turnos_pauta_mensual
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pauta_mensual_instalacion_anio_mes 
ON as_turnos_pauta_mensual(instalacion_id, anio, mes);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pauta_mensual_guardia_dia 
ON as_turnos_pauta_mensual(guardia_id, dia);

-- Índices para tabla as_turnos_asignaciones
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asignaciones_guardia_estado 
ON as_turnos_asignaciones(guardia_id, estado);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asignaciones_requisito_estado 
ON as_turnos_asignaciones(requisito_puesto_id, estado);

-- Índices para tabla as_turnos_requisitos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requisitos_instalacion_rol 
ON as_turnos_requisitos(instalacion_id, rol_servicio_id);

-- Índices para tabla as_turnos_ppc
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ppc_requisito_estado 
ON as_turnos_ppc(requisito_puesto_id, estado);

-- Índices para tabla guardias
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guardias_activo 
ON guardias(activo);

-- Índices para tabla as_turnos_configuracion
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_turnos_config_instalacion 
ON as_turnos_configuracion(instalacion_id);

-- Índices compuestos para consultas específicas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guardias_asignaciones_activos 
ON as_turnos_asignaciones(guardia_id, estado) 
WHERE estado = 'Activa';

-- Estadísticas de tablas
ANALYZE as_turnos_pauta_mensual;
ANALYZE as_turnos_asignaciones;
ANALYZE as_turnos_requisitos;
ANALYZE as_turnos_ppc;
ANALYZE guardias;
ANALYZE as_turnos_configuracion;

-- Verificar índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef 
FROM pg_indexes 
WHERE tablename IN (
    'as_turnos_pauta_mensual',
    'as_turnos_asignaciones', 
    'as_turnos_requisitos',
    'as_turnos_ppc',
    'guardias',
    'as_turnos_configuracion'
)
ORDER BY tablename, indexname;