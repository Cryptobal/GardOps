-- Agregar restricciones de clave foránea

-- 1. sueldo_estructuras_servicio
ALTER TABLE sueldo_estructuras_servicio
  ADD CONSTRAINT fk_sueldo_estructuras_instalacion
  FOREIGN KEY (instalacion_id) 
  REFERENCES instalaciones(id) ON DELETE CASCADE;

ALTER TABLE sueldo_estructuras_servicio
  ADD CONSTRAINT fk_sueldo_estructuras_rol
  FOREIGN KEY (rol_servicio_id) 
  REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE;

ALTER TABLE sueldo_estructuras_servicio
  ADD CONSTRAINT fk_sueldo_estructuras_bono
  FOREIGN KEY (bono_id) 
  REFERENCES sueldo_bonos_globales(id) ON DELETE CASCADE;

-- 2. sueldo_historial_estructuras
ALTER TABLE sueldo_historial_estructuras
  ADD CONSTRAINT fk_sueldo_historial_estructura
  FOREIGN KEY (estructura_id) 
  REFERENCES sueldo_estructuras_servicio(id) ON DELETE CASCADE;

ALTER TABLE sueldo_historial_estructuras
  ADD CONSTRAINT fk_sueldo_historial_rol
  FOREIGN KEY (rol_servicio_id) 
  REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE;

ALTER TABLE sueldo_historial_estructuras
  ADD CONSTRAINT fk_sueldo_historial_usuario
  FOREIGN KEY (usuario_id) 
  REFERENCES usuarios(id) ON DELETE SET NULL;
