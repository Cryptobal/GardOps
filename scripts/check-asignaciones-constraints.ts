import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function checkAsignacionesConstraints() {
  console.log('🔍 Verificando restricciones de asignaciones_guardias...\n');

  try {
    // Verificar las restricciones de la tabla
    const constraints = await query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'asignaciones_guardias'::regclass
      AND contype = 'c'
    `);

    console.log('📋 RESTRICCIONES DE VERIFICACIÓN:');
    console.log('='.repeat(80));

    if (constraints.rows.length === 0) {
      console.log('No hay restricciones de verificación');
    } else {
      constraints.rows.forEach((constraint: any) => {
        console.log(`• ${constraint.constraint_name}:`);
        console.log(`  ${constraint.constraint_definition}`);
        console.log('');
      });
    }

    // Verificar valores únicos en tipo_asignacion
    const tiposAsignacion = await query(`
      SELECT DISTINCT tipo_asignacion 
      FROM asignaciones_guardias 
      ORDER BY tipo_asignacion
    `);

    console.log('📊 VALORES ÚNICOS EN tipo_asignacion:');
    console.log('='.repeat(80));
    
    if (tiposAsignacion.rows.length === 0) {
      console.log('No hay datos en la tabla');
    } else {
      tiposAsignacion.rows.forEach((row: any) => {
        console.log(`• ${row.tipo_asignacion}`);
      });
    }

  } catch (error) {
    console.error('❌ Error verificando restricciones:', error);
  }
}

// Ejecutar la verificación
checkAsignacionesConstraints()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 