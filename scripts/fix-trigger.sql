-- Script para corregir el trigger que hace referencia a tabla antigua
-- Primero eliminamos el trigger problemático
DROP TRIGGER IF EXISTS calcular_ppc_automatico ON as_turnos_ppc;

-- Luego creamos el trigger corregido
CREATE OR REPLACE FUNCTION calcular_ppc_automatico()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar cantidad_faltante basado en requisitos
  UPDATE as_turnos_ppc 
  SET cantidad_faltante = (
    SELECT cantidad_guardias 
    FROM as_turnos_requisitos 
    WHERE id = COALESCE(NEW.requisito_puesto_id, OLD.requisito_puesto_id)
  ) - (
    SELECT COUNT(*) 
    FROM as_turnos_asignaciones 
    WHERE requisito_puesto_id = COALESCE(NEW.requisito_puesto_id, OLD.requisito_puesto_id)
    AND estado = 'Activa'
  )
  WHERE requisito_puesto_id = COALESCE(NEW.requisito_puesto_id, OLD.requisito_puesto_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
CREATE TRIGGER calcular_ppc_automatico
  AFTER INSERT OR UPDATE OR DELETE ON as_turnos_ppc
  FOR EACH ROW
  EXECUTE FUNCTION calcular_ppc_automatico();

-- También corregir cualquier otro trigger que pueda estar causando problemas
DROP TRIGGER IF EXISTS actualizar_estado_ppc ON as_turnos_asignaciones;

CREATE OR REPLACE FUNCTION actualizar_estado_ppc()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar estado de PPC cuando se asigna o desasigna un guardia
  IF TG_OP = 'INSERT' THEN
    UPDATE as_turnos_ppc 
    SET estado = 'Asignado', 
        guardia_asignado_id = NEW.guardia_id,
        fecha_asignacion = NOW()
    WHERE requisito_puesto_id = NEW.requisito_puesto_id 
    AND estado = 'Pendiente'
    LIMIT 1;
  ELSIF TG_OP = 'UPDATE' AND OLD.estado = 'Activa' AND NEW.estado = 'Finalizada' THEN
    UPDATE as_turnos_ppc 
    SET estado = 'Pendiente', 
        guardia_asignado_id = NULL,
        fecha_asignacion = NULL
    WHERE requisito_puesto_id = NEW.requisito_puesto_id 
    AND guardia_asignado_id = NEW.guardia_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER actualizar_estado_ppc
  AFTER INSERT OR UPDATE ON as_turnos_asignaciones
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_estado_ppc(); 