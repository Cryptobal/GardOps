-- Script para optimizar índices de la base de datos
-- Ejecutar este script para mejorar el rendimiento de las queries complejas

-- Índices para la tabla as_turnos_requisitos
CREATE INDEX IF NOT EXISTS idx_as_turnos_requisitos_instalacion_id 
ON as_turnos_requisitos(instalacion_id);

CREATE INDEX IF NOT EXISTS idx_as_turnos_requisitos_rol_servicio_id 
ON as_turnos_requisitos(rol_servicio_id);

-- Índices para la tabla as_turnos_asignaciones
CREATE INDEX IF NOT EXISTS idx_as_turnos_asignaciones_requisito_puesto_id 
ON as_turnos_asignaciones(requisito_puesto_id);

CREATE INDEX IF NOT EXISTS idx_as_turnos_asignaciones_estado 
ON as_turnos_asignaciones(estado);

CREATE INDEX IF NOT EXISTS idx_as_turnos_asignaciones_guardia_id 
ON as_turnos_asignaciones(guardia_id);

-- Índices compuestos para mejorar JOINs
CREATE INDEX IF NOT EXISTS idx_as_turnos_asignaciones_estado_requisito 
ON as_turnos_asignaciones(estado, requisito_puesto_id);

-- Índices para instalaciones
CREATE INDEX IF NOT EXISTS idx_instalaciones_cliente_id 
ON instalaciones(cliente_id);

CREATE INDEX IF NOT EXISTS idx_instalaciones_estado 
ON instalaciones(estado);

CREATE INDEX IF NOT EXISTS idx_instalaciones_nombre 
ON instalaciones(nombre);

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_estado 
ON clientes(estado);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre 
ON clientes(nombre);

-- Índices para guardias
CREATE INDEX IF NOT EXISTS idx_guardias_activo 
ON guardias(activo);

CREATE INDEX IF NOT EXISTS idx_guardias_instalacion_id 
ON guardias(instalacion_id);

-- Índices para as_turnos_roles_servicio
CREATE INDEX IF NOT EXISTS idx_as_turnos_roles_servicio_nombre 
ON as_turnos_roles_servicio(nombre);

-- Analizar las tablas para optimizar el planificador de consultas
ANALYZE as_turnos_requisitos;
ANALYZE as_turnos_asignaciones;
ANALYZE instalaciones;
ANALYZE clientes;
ANALYZE guardias;
ANALYZE as_turnos_roles_servicio;

-- Verificar que los índices se crearon correctamente
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN (
    'as_turnos_requisitos',
    'as_turnos_asignaciones', 
    'instalaciones',
    'clientes',
    'guardias',
    'as_turnos_roles_servicio'
)
ORDER BY tablename, indexname; 