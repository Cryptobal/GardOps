-- Script para optimizar el rendimiento de las páginas individuales de instalaciones
-- Ejecutar este script para mejorar significativamente la velocidad de carga de páginas individuales

-- 1. Índices para consultas de turnos de instalación
CREATE INDEX IF NOT EXISTS idx_turnos_configuracion_instalacion_rol ON as_turnos_configuracion(instalacion_id, rol_servicio_id);
CREATE INDEX IF NOT EXISTS idx_turnos_configuracion_estado ON as_turnos_configuracion(estado);
CREATE INDEX IF NOT EXISTS idx_turnos_roles_servicio_estado ON as_turnos_roles_servicio(estado);

-- 2. Índices para consultas de PPCs optimizadas
CREATE INDEX IF NOT EXISTS idx_turnos_ppc_requisito_estado ON as_turnos_ppc(requisito_puesto_id, estado);
CREATE INDEX IF NOT EXISTS idx_turnos_ppc_guardia_asignado ON as_turnos_ppc(guardia_asignado_id);
CREATE INDEX IF NOT EXISTS idx_turnos_ppc_created_at ON as_turnos_ppc(created_at);

-- 3. Índices para consultas de guardias disponibles
CREATE INDEX IF NOT EXISTS idx_guardias_activo ON guardias(activo);
CREATE INDEX IF NOT EXISTS idx_guardias_nombre_apellidos ON guardias(apellido_paterno, apellido_materno, nombre);
CREATE INDEX IF NOT EXISTS idx_turnos_asignaciones_guardia_estado ON as_turnos_asignaciones(guardia_id, estado);

-- 4. Índices compuestos para consultas complejas de turnos
CREATE INDEX IF NOT EXISTS idx_turnos_requisitos_instalacion_rol ON as_turnos_requisitos(instalacion_id, rol_servicio_id);
CREATE INDEX IF NOT EXISTS idx_turnos_asignaciones_requisito_estado_activa ON as_turnos_asignaciones(requisito_puesto_id, estado) WHERE estado = 'Activa';

-- 5. Índices para consultas de estadísticas
CREATE INDEX IF NOT EXISTS idx_turnos_ppc_estado_pendiente ON as_turnos_ppc(estado) WHERE estado = 'Pendiente';
CREATE INDEX IF NOT EXISTS idx_turnos_ppc_estado_asignado ON as_turnos_ppc(estado) WHERE estado = 'Asignado';

-- 6. Índices para consultas de roles de servicio
CREATE INDEX IF NOT EXISTS idx_turnos_roles_servicio_nombre_estado ON as_turnos_roles_servicio(nombre, estado);

-- 7. Analizar las tablas para optimizar el plan de consultas
ANALYZE as_turnos_configuracion;
ANALYZE as_turnos_roles_servicio;
ANALYZE as_turnos_ppc;
ANALYZE as_turnos_requisitos;
ANALYZE as_turnos_asignaciones;
ANALYZE guardias;

-- 8. Verificar que los índices se crearon correctamente
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('as_turnos_configuracion', 'as_turnos_roles_servicio', 'as_turnos_ppc', 'as_turnos_requisitos', 'as_turnos_asignaciones', 'guardias')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 9. Mostrar estadísticas de rendimiento para las tablas principales
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('as_turnos_configuracion', 'as_turnos_roles_servicio', 'as_turnos_ppc', 'guardias')
ORDER BY tablename, attname; 