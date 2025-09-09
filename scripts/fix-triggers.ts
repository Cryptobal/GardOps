import { query } from '../src/lib/database';

async function fixTriggers() {
  try {
    console.log('🔧 Corrigiendo triggers de la base de datos...');

    // 1. Eliminar trigger problemático
    console.log('1. Eliminando trigger problemático...');
    await query('DROP TRIGGER IF EXISTS calcular_ppc_automatico ON as_turnos_ppc');
    console.log('✅ Trigger eliminado');

    // 2. Crear función corregida
    console.log('2. Creando función corregida...');
    await query(`
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
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ Función creada');

    // 3. Crear trigger corregido
    console.log('3. Creando trigger corregido...');
    await query(`
      CREATE TRIGGER calcular_ppc_automatico
        AFTER INSERT OR UPDATE OR DELETE ON as_turnos_ppc
        FOR EACH ROW
        EXECUTE FUNCTION calcular_ppc_automatico()
    `);
    console.log('✅ Trigger creado');

    // 4. Corregir trigger de asignaciones
    console.log('4. Corrigiendo trigger de asignaciones...');
    await query('DROP TRIGGER IF EXISTS actualizar_estado_ppc ON as_turnos_asignaciones');
    
    await query(`
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
          AND estado = 'Pendiente';
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
      $$ LANGUAGE plpgsql
    `);

    await query(`
      CREATE TRIGGER actualizar_estado_ppc
        AFTER INSERT OR UPDATE ON as_turnos_asignaciones
        FOR EACH ROW
        EXECUTE FUNCTION actualizar_estado_ppc()
    `);
    console.log('✅ Trigger de asignaciones corregido');

    console.log('🎉 ¡Triggers corregidos exitosamente!');
    
  } catch (error) {
    console.error('❌ Error corrigiendo triggers:', error);
  } finally {
    process.exit(0);
  }
}

fixTriggers(); 