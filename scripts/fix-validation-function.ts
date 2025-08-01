import { query } from '../src/lib/database';

async function fixValidationFunction() {
  try {
    console.log('🔧 Corrigiendo función de validación de asignaciones únicas...');

    // 1. Eliminar la función problemática
    console.log('1. Eliminando función problemática...');
    await query('DROP FUNCTION IF EXISTS validar_asignacion_unica() CASCADE');
    console.log('✅ Función eliminada');

    // 2. Crear la función corregida
    console.log('2. Creando función corregida...');
    await query(`
      CREATE OR REPLACE FUNCTION validar_asignacion_unica()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Verificar que el guardia no tenga otra asignación activa
        IF EXISTS (
          SELECT 1 
          FROM as_turnos_asignaciones
          WHERE guardia_id = NEW.guardia_id
            AND estado = 'Activa'
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) THEN
          RAISE EXCEPTION 'El guardia ya tiene una asignación activa';
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Función corregida creada');

    // 3. Crear el trigger
    console.log('3. Creando trigger...');
    await query(`
      CREATE TRIGGER trigger_validar_asignacion_unica
        BEFORE INSERT OR UPDATE ON as_turnos_asignaciones
        FOR EACH ROW
        EXECUTE FUNCTION validar_asignacion_unica();
    `);
    console.log('✅ Trigger creado');

    console.log('🎉 ¡Función de validación corregida exitosamente!');
    console.log('💡 Ahora solo los guardias sin asignaciones activas podrán ser asignados');

  } catch (error) {
    console.error('❌ Error corrigiendo función:', error);
  }
}

fixValidationFunction(); 