import { query } from '../src/lib/database';

async function corregirBotonesEliminar() {
  console.log('🔧 Corrigiendo botones de eliminar en pauta diaria...');

  try {
    // 1. Verificar estados actuales
    const estadosActuales = await query(`
      SELECT 
        pm.id as puesto_id,
        pm.estado,
        po.es_ppc,
        pm.guardia_id,
        te.guardia_id as cobertura_guardia_id
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN TE_turnos_extras te ON pm.id = te.pauta_id
      WHERE (pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 5)
      ORDER BY pm.id
      LIMIT 10
    `);

    console.log('\n📊 Estados actuales:');
    console.table(estadosActuales.rows);

    // 2. Corregir estados de guardias para que aparezcan los botones eliminar
    // Los guardias con estado 'T' y guardia asignado deben tener estado 'trabajado'
    const resultGuardias = await query(`
      UPDATE as_turnos_pauta_mensual 
      SET estado = 'trabajado' 
      WHERE estado = 'T' 
        AND guardia_id IS NOT NULL
        AND (anio = 2025 AND mes = 8 AND dia = 5)
    `);

    console.log(`✅ Guardias corregidos: ${resultGuardias.rowCount}`);

    // 3. Corregir estados de PPCs para que aparezcan los botones eliminar
    // Los PPCs con estado 'T' y cobertura deben tener estado 'reemplazo'
    const resultPPCs = await query(`
      UPDATE as_turnos_pauta_mensual pm
      SET estado = 'reemplazo' 
      FROM as_turnos_puestos_operativos po
      WHERE pm.puesto_id = po.id
        AND pm.estado = 'T' 
        AND po.es_ppc = true 
        AND EXISTS (
          SELECT 1 FROM TE_turnos_extras te 
          WHERE te.pauta_id = pm.id
        )
        AND (pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 5)
    `);

    console.log(`✅ PPCs corregidos: ${resultPPCs.rowCount}`);

    // 4. Verificar los cambios
    const verificacion = await query(`
      SELECT 
        pm.id as puesto_id,
        pm.estado,
        po.es_ppc,
        CASE 
          WHEN pm.guardia_id IS NOT NULL THEN 'Tiene guardia'
          ELSE 'Sin guardia'
        END as tiene_guardia,
        CASE 
          WHEN te.guardia_id IS NOT NULL THEN 'Tiene cobertura'
          ELSE 'Sin cobertura'
        END as tiene_cobertura
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN TE_turnos_extras te ON pm.id = te.pauta_id
      WHERE (pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 5)
      ORDER BY pm.id
      LIMIT 10
    `);

    console.log('\n📊 Verificación de estados después de corrección:');
    console.table(verificacion.rows);

    console.log('\n✅ Corrección de botones eliminar completada');
    console.log('\n📝 Resumen de cambios:');
    console.log('- Guardias con estado "T" cambiados a "trabajado"');
    console.log('- PPCs con estado "T" y cobertura cambiados a "reemplazo"');
    console.log('- Ahora los botones eliminar deberían aparecer correctamente');

  } catch (error) {
    console.error('❌ Error al corregir botones eliminar:', error);
    throw error;
  }
}

// Ejecutar el script
corregirBotonesEliminar()
  .then(() => {
    console.log('\n🎉 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error en el script:', error);
    process.exit(1);
  }); 