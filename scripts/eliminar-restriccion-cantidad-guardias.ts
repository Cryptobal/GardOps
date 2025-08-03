import { query } from '../src/lib/database';

async function eliminarRestriccionCantidadGuardias() {
  console.log('🔧 Eliminando restricción problemática de cantidad_guardias...\n');

  try {
    // 1. Verificar si la restricción existe
    console.log('1️⃣ Verificando restricción existente...');
    const constraintCheck = await query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'turnos_instalacion_cantidad_guardias_check'
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('✅ Restricción encontrada:', constraintCheck.rows[0]);
      
      // 2. Eliminar la restricción
      console.log('\n2️⃣ Eliminando restricción...');
      await query(`
        ALTER TABLE as_turnos_configuracion 
        DROP CONSTRAINT turnos_instalacion_cantidad_guardias_check
      `);
      
      console.log('✅ Restricción eliminada correctamente');
    } else {
      console.log('ℹ️ Restricción no encontrada, verificando otras posibles...');
      
      // Buscar otras restricciones relacionadas
      const otherConstraints = await query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%cantidad_guardias%'
      `);
      
      if (otherConstraints.rows.length > 0) {
        console.log('📋 Otras restricciones encontradas:');
        otherConstraints.rows.forEach((constraint: any) => {
          console.log(`   - ${constraint.constraint_name}: ${constraint.check_clause}`);
        });
      } else {
        console.log('ℹ️ No se encontraron restricciones relacionadas con cantidad_guardias');
      }
    }

    // 3. Verificar que la tabla permite valores 0
    console.log('\n3️⃣ Verificando que la tabla permite cantidad_guardias = 0...');
    try {
      // Intentar actualizar un registro a 0 para verificar
      const testUpdate = await query(`
        UPDATE as_turnos_configuracion 
        SET cantidad_guardias = 0
        WHERE id = (SELECT id FROM as_turnos_configuracion LIMIT 1)
      `);
      
      console.log('✅ La tabla ahora permite cantidad_guardias = 0');
      
      // Revertir el cambio de prueba
      await query(`
        UPDATE as_turnos_configuracion 
        SET cantidad_guardias = 1
        WHERE cantidad_guardias = 0
      `);
      
    } catch (error) {
      console.log('❌ Error al verificar:', error);
    }

    console.log('\n✅ Proceso completado');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  eliminarRestriccionCantidadGuardias()
    .then(() => {
      console.log('\n🎉 Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en script:', error);
      process.exit(1);
    });
}

export { eliminarRestriccionCantidadGuardias }; 