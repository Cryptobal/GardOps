-- Primero respaldamos los datos por si acaso
CREATE TABLE IF NOT EXISTS backup_sueldo_estructuras_roles AS 
SELECT * FROM sueldo_estructuras_roles;

-- Eliminar triggers y funciones asociadas
DROP TRIGGER IF EXISTS trigger_crear_estructura_sueldo ON as_turnos_roles_servicio;
DROP TRIGGER IF EXISTS trigger_inactivar_estructura_cascada ON as_turnos_roles_servicio;
DROP FUNCTION IF EXISTS crear_estructura_sueldo_automatica();
DROP FUNCTION IF EXISTS inactivar_estructura_sueldo_cascada();

-- Eliminar la tabla
DROP TABLE IF EXISTS sueldo_estructuras_roles;
