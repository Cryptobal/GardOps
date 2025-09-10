-- Corregir trigger de historial de asignaciones
-- El campo se llama 'id' no 'puesto_id' en la tabla as_turnos_puestos_operativos

-- Eliminar trigger y función incorrectos
DROP TRIGGER IF EXISTS trigger_historial_asignaciones ON as_turnos_puestos_operativos;
DROP FUNCTION IF EXISTS registrar_cambio_asignacion();

-- Crear función corregida
CREATE OR REPLACE FUNCTION registrar_cambio_asignacion()
RETURNS TRIGGER AS $$
DECLARE
    old_guardia_id UUID;
    new_guardia_id UUID;
    instalacion_id UUID;
    puesto_id UUID;
BEGIN
    -- Obtener datos del puesto - CORREGIDO: usar NEW.id en lugar de NEW.puesto_id
    SELECT po.instalacion_id, po.id INTO instalacion_id, puesto_id
    FROM as_turnos_puestos_operativos po 
    WHERE po.id = COALESCE(NEW.id, OLD.id);
    
    -- En UPDATE: detectar cambios de guardia_id
    IF TG_OP = 'UPDATE' THEN
        old_guardia_id := OLD.guardia_id;
        new_guardia_id := NEW.guardia_id;
        
        -- Si cambió el guardia_id
        IF old_guardia_id IS DISTINCT FROM new_guardia_id THEN
            
            -- Terminar asignación anterior si había guardia
            IF old_guardia_id IS NOT NULL THEN
                UPDATE historial_asignaciones_guardias 
                SET 
                    fecha_termino = CURRENT_DATE,
                    estado = 'finalizada',
                    motivo_termino = 'reasignacion',
                    updated_at = NOW()
                WHERE guardia_id = old_guardia_id 
                  AND puesto_id = NEW.id
                  AND estado = 'activa'
                  AND fecha_termino IS NULL;
                  
                RAISE NOTICE 'Terminada asignación de guardia % en puesto %', old_guardia_id, NEW.id;
            END IF;
            
            -- Crear nueva asignación si hay nuevo guardia
            IF new_guardia_id IS NOT NULL THEN
                INSERT INTO historial_asignaciones_guardias (
                    guardia_id,
                    instalacion_id, 
                    puesto_id,
                    fecha_inicio,
                    tipo_asignacion,
                    motivo_inicio,
                    estado,
                    observaciones
                ) VALUES (
                    new_guardia_id,
                    instalacion_id,
                    NEW.id,
                    CURRENT_DATE, -- Por defecto hoy, se puede actualizar manualmente
                    'fija',
                    'asignacion_automatica',
                    'activa',
                    'Asignación registrada automáticamente por trigger'
                );
                
                RAISE NOTICE 'Creada nueva asignación para guardia % en puesto %', new_guardia_id, NEW.id;
            END IF;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear trigger corregido
CREATE TRIGGER trigger_historial_asignaciones
    AFTER UPDATE OF guardia_id ON as_turnos_puestos_operativos
    FOR EACH ROW
    WHEN (OLD.guardia_id IS DISTINCT FROM NEW.guardia_id)
    EXECUTE FUNCTION registrar_cambio_asignacion();
