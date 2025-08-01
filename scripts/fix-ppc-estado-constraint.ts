import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function fixPPCEstadoConstraint() {
  console.log('🔧 Arreglando restricción del campo estado en puestos_por_cubrir...\n');

  try {
    // Eliminar la restricción actual
    console.log('🗑️ Eliminando restricción actual...');
    await query(`
      ALTER TABLE puestos_por_cubrir 
      DROP CONSTRAINT IF EXISTS puestos_por_cubrir_estado_check
    `);
    console.log('✅ Restricción eliminada');

    // Crear nueva restricción con 'Asignado' incluido
    console.log('➕ Creando nueva restricción con "Asignado"...');
    await query(`
      ALTER TABLE puestos_por_cubrir 
      ADD CONSTRAINT puestos_por_cubrir_estado_check 
      CHECK (estado = ANY (ARRAY['Pendiente', 'En_Proceso', 'Cubierto', 'Cancelado', 'Asignado']))
    `);
    console.log('✅ Nueva restricción creada');

    // Verificar que la restricción se aplicó correctamente
    console.log('\n🔍 Verificando nueva restricción...');
    const constraints = await query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'puestos_por_cubrir'::regclass
      AND contype = 'c'
      AND conname = 'puestos_por_cubrir_estado_check'
    `);

    if (constraints.rows.length > 0) {
      console.log('✅ Restricción verificada:');
      console.log(`   ${constraints.rows[0].constraint_definition}`);
    } else {
      console.log('❌ No se pudo verificar la restricción');
    }

    // Probar que ahora acepta 'Asignado'
    console.log('\n🧪 Probando que acepta "Asignado"...');
    try {
      await query(`
        UPDATE puestos_por_cubrir 
        SET estado = 'Asignado' 
        WHERE id = (SELECT id FROM puestos_por_cubrir LIMIT 1)
      `);
      console.log('✅ Prueba exitosa: ahora acepta "Asignado"');
      
      // Revertir el cambio de prueba
      await query(`
        UPDATE puestos_por_cubrir 
        SET estado = 'Pendiente' 
        WHERE estado = 'Asignado'
      `);
      console.log('✅ Cambio de prueba revertido');
    } catch (error) {
      console.log('❌ Error en la prueba:', error);
    }

  } catch (error) {
    console.error('❌ Error arreglando restricción:', error);
  }
}

// Ejecutar la corrección
fixPPCEstadoConstraint()
  .then(() => {
    console.log('\n✅ Corrección completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 