import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function fixAsignacionesTipoConstraint() {
  console.log('🔧 Arreglando restricción del campo tipo_asignacion...\n');

  try {
    // Eliminar la restricción actual
    console.log('🗑️ Eliminando restricción actual...');
    await query(`
      ALTER TABLE asignaciones_guardias 
      DROP CONSTRAINT IF EXISTS asignaciones_guardias_tipo_asignacion_check
    `);
    console.log('✅ Restricción eliminada');

    // Crear nueva restricción con 'PPC' incluido
    console.log('➕ Creando nueva restricción con "PPC"...');
    await query(`
      ALTER TABLE asignaciones_guardias 
      ADD CONSTRAINT asignaciones_guardias_tipo_asignacion_check 
      CHECK (tipo_asignacion IN ('contrato_directo', 'reemplazo', 'cobertura', 'refuerzo', 'PPC'))
    `);
    console.log('✅ Nueva restricción creada');

    // Verificar que se aplicó correctamente
    const constraints = await query(`
      SELECT pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'asignaciones_guardias'::regclass
      AND conname = 'asignaciones_guardias_tipo_asignacion_check'
    `);

    if (constraints.rows.length > 0) {
      console.log('\n✅ Restricción actualizada:');
      console.log(constraints.rows[0].constraint_definition);
    }

  } catch (error) {
    console.error('❌ Error arreglando restricción:', error);
  }
}

// Ejecutar la corrección
fixAsignacionesTipoConstraint()
  .then(() => {
    console.log('\n✅ Corrección completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 