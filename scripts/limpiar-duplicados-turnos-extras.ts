import { query } from '../src/lib/database';

async function limpiarDuplicadosTurnosExtras() {
  try {
    console.log('🔍 Verificando duplicados en turnos extras...');

    // Encontrar duplicados
    const { rows: duplicados } = await query(`
      SELECT guardia_id, fecha, COUNT(*) as total
      FROM te_turnos_extras
      GROUP BY guardia_id, fecha
      HAVING COUNT(*) > 1
      ORDER BY fecha DESC, total DESC
    `);

    if (duplicados.length === 0) {
      console.log('✅ No se encontraron duplicados');
      return;
    }

    console.log(`📋 Se encontraron ${duplicados.length} combinaciones con duplicados:`);
    duplicados.forEach((dup: any) => {
      console.log(`  - Guardia ${dup.guardia_id} en fecha ${dup.fecha}: ${dup.total} registros`);
    });

    // Para cada duplicado, mantener solo el más reciente
    for (const duplicado of duplicados) {
      console.log(`\n🔄 Procesando duplicados para guardia ${duplicado.guardia_id} en fecha ${duplicado.fecha}...`);
      
      // Obtener todos los registros duplicados ordenados por created_at
      const { rows: registros } = await query(`
        SELECT id, created_at, pagado, preservado, valor, estado
        FROM te_turnos_extras
        WHERE guardia_id = $1 AND fecha = $2
        ORDER BY created_at DESC
      `, [duplicado.guardia_id, duplicado.fecha]);

      console.log(`  📊 Encontrados ${registros.length} registros:`);
      registros.forEach((reg: any, index: number) => {
        console.log(`    ${index + 1}. ID: ${reg.id}, Creado: ${reg.created_at}, Pagado: ${reg.pagado}, Preservado: ${reg.preservado}, Valor: $${reg.valor}, Estado: ${reg.estado}`);
      });

      // Mantener el registro más reciente (primero en la lista)
      const registroAMantener = registros[0];
      const registrosAEliminar = registros.slice(1);

      console.log(`  ✅ Manteniendo registro ID: ${registroAMantener.id}`);
      console.log(`  🗑️ Eliminando ${registrosAEliminar.length} registros duplicados...`);

      // Eliminar registros duplicados
      for (const registro of registrosAEliminar) {
        await query(`
          DELETE FROM te_turnos_extras
          WHERE id = $1
        `, [registro.id]);
        
        console.log(`    🗑️ Eliminado registro ID: ${registro.id}`);
      }
    }

    // Verificar que no queden duplicados
    const { rows: verificacion } = await query(`
      SELECT guardia_id, fecha, COUNT(*) as total
      FROM te_turnos_extras
      GROUP BY guardia_id, fecha
      HAVING COUNT(*) > 1
    `);

    if (verificacion.length === 0) {
      console.log('\n✅ Limpieza completada. No quedan duplicados.');
    } else {
      console.log('\n⚠️ Aún quedan duplicados después de la limpieza:');
      verificacion.forEach((dup: any) => {
        console.log(`  - Guardia ${dup.guardia_id} en fecha ${dup.fecha}: ${dup.total} registros`);
      });
    }

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  limpiarDuplicadosTurnosExtras()
    .then(() => {
      console.log('✅ Limpieza completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { limpiarDuplicadosTurnosExtras };
