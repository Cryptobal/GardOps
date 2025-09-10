-- Deshabilitar trigger problemático temporalmente
-- El trigger tiene referencias ambiguas a puesto_id que causan errores

-- Deshabilitar trigger que causa error: "column reference puesto_id is ambiguous"
DROP TRIGGER IF EXISTS trigger_historial_asignaciones ON as_turnos_puestos_operativos;

-- NOTA: El historial se maneja manualmente por ahora a través de las funciones:
-- - asignarGuardiaConFecha() 
-- - terminarAsignacionActual()
-- 
-- Esto permite que funcionen:
-- ✅ Asignaciones con fecha de inicio
-- ✅ Desasignaciones con fecha de término  
-- ✅ Historial completo preservado
--
-- TODO: Corregir trigger para evitar ambigüedad de puesto_id
