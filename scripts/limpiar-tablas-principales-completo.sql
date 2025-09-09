-- =====================================================
-- SCRIPT DE LIMPIEZA TOTAL DE TABLAS PRINCIPALES (COMPLETO)
-- =====================================================
-- Este script elimina TODOS los registros de:
-- - guardias
-- - instalaciones  
-- - clientes
-- 
-- Incluye limpieza de tablas dependientes que no tienen CASCADE
-- =====================================================

-- 1. ELIMINAR TABLAS DEPENDIENTES QUE NO TIENEN CASCADE
-- Eliminar notificaciones de postulaciones
DELETE FROM notificaciones_postulaciones;

-- Eliminar puestos operativos
DELETE FROM as_turnos_puestos_operativos;

-- Eliminar logs de clientes
DELETE FROM logs_clientes;

-- Eliminar logs de guardias
DELETE FROM logs_guardias;

-- Eliminar logs de instalaciones
DELETE FROM logs_instalaciones;

-- Eliminar documentos de clientes
DELETE FROM documentos_clientes;

-- Eliminar documentos de guardias
DELETE FROM documentos_guardias;

-- Eliminar documentos de instalaciones
DELETE FROM documentos_instalaciones;

-- Eliminar rondas
DELETE FROM rondas;

-- Eliminar turnos extras
DELETE FROM turnos_extras;

-- Eliminar puestos por cubrir
DELETE FROM puestos_por_cubrir;

-- Eliminar asignaciones de guardias
DELETE FROM asignaciones_guardias;

-- Eliminar estructuras de servicio
DELETE FROM sueldo_estructuras_servicio;

-- Eliminar historial de estructuras
DELETE FROM sueldo_historial_estructuras;

-- Eliminar central de monitoreo
DELETE FROM central_llamados;
DELETE FROM central_incidentes;
DELETE FROM central_config_instalacion;
DELETE FROM central_logs;

-- Eliminar webhook logs
DELETE FROM webhook_logs;

-- 2. ELIMINAR TABLAS PRINCIPALES
-- Ahora sí podemos eliminar las tablas principales
DELETE FROM guardias;
DELETE FROM instalaciones;
DELETE FROM clientes;

-- 3. VERIFICAR QUE LAS TABLAS ESTÁN VACÍAS
SELECT 
    'guardias' as tabla,
    COUNT(*) as registros_restantes
FROM guardias
UNION ALL
SELECT 
    'instalaciones' as tabla,
    COUNT(*) as registros_restantes
FROM instalaciones
UNION ALL
SELECT 
    'clientes' as tabla,
    COUNT(*) as registros_restantes
FROM clientes
UNION ALL
SELECT 
    'notificaciones_postulaciones' as tabla,
    COUNT(*) as registros_restantes
FROM notificaciones_postulaciones
UNION ALL
SELECT 
    'as_turnos_puestos_operativos' as tabla,
    COUNT(*) as registros_restantes
FROM as_turnos_puestos_operativos
UNION ALL
SELECT 
    'logs_clientes' as tabla,
    COUNT(*) as registros_restantes
FROM logs_clientes;

-- Mostrar mensaje de confirmación
SELECT 'Limpieza completada exitosamente. Todas las tablas principales y dependientes están vacías.' as resultado;
