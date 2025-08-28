-- Script para limpiar todas las estructuras existentes
-- Ejecutar con precaución - esto eliminará TODAS las estructuras

-- Eliminar estructuras de servicio
DELETE FROM sueldo_estructuras_servicio;

-- Eliminar estructuras de guardia (primero los items, luego las estructuras)
DELETE FROM sueldo_estructura_guardia_item;
DELETE FROM sueldo_estructura_guardia;

-- Verificar que se eliminaron todas
SELECT 'Estructuras de servicio restantes:' as mensaje, COUNT(*) as cantidad FROM sueldo_estructuras_servicio
UNION ALL
SELECT 'Estructuras de guardia restantes:', COUNT(*) FROM sueldo_estructura_guardia;

