-- Script para optimizar el rendimiento de las consultas de instalaciones
-- Ejecutar este script para mejorar significativamente la velocidad de carga

-- 1. Crear índices compuestos para mejorar las consultas de estadísticas
CREATE INDEX IF NOT EXISTS idx_turnos_requisitos_instalacion_id ON as_turnos_requisitos(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_turnos_asignaciones_requisito_estado ON as_turnos_asignaciones(requisito_puesto_id, estado);
CREATE INDEX IF NOT EXISTS idx_turnos_ppc_requisito_estado ON as_turnos_ppc(requisito_puesto_id, estado);

-- 2. Crear índices para mejorar las consultas de filtrado
CREATE INDEX IF NOT EXISTS idx_instalaciones_nombre_estado ON instalaciones(nombre, estado);
CREATE INDEX IF NOT EXISTS idx_instalaciones_cliente_estado ON instalaciones(cliente_id, estado);
CREATE INDEX IF NOT EXISTS idx_instalaciones_comuna_estado ON instalaciones(comuna, estado);

-- 3. Crear índices para las tablas relacionadas
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_estado ON clientes(nombre, estado);
CREATE INDEX IF NOT EXISTS idx_comunas_nombre ON comunas(nombre);

-- 4. Crear índices para mejorar las consultas de estadísticas con JOINs
CREATE INDEX IF NOT EXISTS idx_turnos_requisitos_instalacion_created ON as_turnos_requisitos(instalacion_id, created_at);
CREATE INDEX IF NOT EXISTS idx_turnos_asignaciones_estado_created ON as_turnos_asignaciones(estado, created_at);
CREATE INDEX IF NOT EXISTS idx_turnos_ppc_estado_created ON as_turnos_ppc(estado, created_at);

-- 5. Analizar las tablas para optimizar el plan de consultas
ANALYZE instalaciones;
ANALYZE clientes;
ANALYZE comunas;
ANALYZE as_turnos_requisitos;
ANALYZE as_turnos_asignaciones;
ANALYZE as_turnos_ppc;

-- 6. Verificar que los índices se crearon correctamente
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('instalaciones', 'clientes', 'comunas', 'as_turnos_requisitos', 'as_turnos_asignaciones', 'as_turnos_ppc')
ORDER BY tablename, indexname;

-- 7. Mostrar estadísticas de rendimiento
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('instalaciones', 'clientes', 'comunas')
ORDER BY tablename, attname; 