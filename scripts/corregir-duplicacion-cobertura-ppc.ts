import { query } from '../src/lib/database';

async function corregirDuplicacionCoberturaPPC() {
  console.log('🔧 Corrigiendo duplicación de cobertura PPC...');

  try {
    // 1. Verificar coberturas duplicadas
    const coberturasDuplicadas = await query(`
      SELECT 
        pm.id as pauta_id,
        pm.puesto_id,
        pm.estado,
        po.es_ppc,
        te.guardia_id as cobertura_guardia_id,
        g.nombre as cobertura_nombre,
        te.fecha,
        te.created_at
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN turnos_extras te ON pm.id = te.pauta_id
      LEFT JOIN guardias g ON te.guardia_id = g.id
      WHERE po.es_ppc = true 
        AND (pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 5)
      ORDER BY pm.puesto_id, te.created_at
    `);

    console.log('\n📊 Coberturas PPC actuales:');
    console.table(coberturasDuplicadas.rows);

    // 2. Identificar duplicados por puesto_id
    const duplicados = await query(`
      SELECT 
        pm.puesto_id,
        COUNT(te.id) as total_coberturas,
        STRING_AGG(te.guardia_id::text, ', ') as guardias_ids
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN turnos_extras te ON pm.id = te.pauta_id
      WHERE po.es_ppc = true 
        AND (pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 5)
        AND te.id IS NOT NULL
      GROUP BY pm.puesto_id
      HAVING COUNT(te.id) > 1
    `);

    console.log('\n🚨 Puestos con coberturas duplicadas:');
    console.table(duplicados.rows);

    // 3. Eliminar coberturas duplicadas (mantener solo la más reciente)
    for (const duplicado of duplicados.rows) {
      console.log(`\n🔧 Procesando puesto ${duplicado.puesto_id} con ${duplicado.total_coberturas} coberturas...`);
      
      // Obtener todas las coberturas para este puesto
      const coberturasPuesto = await query(`
        SELECT 
          te.id as turno_extra_id,
          te.guardia_id,
          te.created_at,
          ROW_NUMBER() OVER (ORDER BY te.created_at DESC) as rn
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        LEFT JOIN turnos_extras te ON pm.id = te.pauta_id
        WHERE po.es_ppc = true 
          AND pm.puesto_id = $1
          AND (pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 5)
          AND te.id IS NOT NULL
        ORDER BY te.created_at DESC
      `, [duplicado.puesto_id]);

      // Eliminar todas las coberturas excepto la más reciente
      const coberturasAEliminar = coberturasPuesto.rows.filter(row => row.rn > 1);
      
      for (const cobertura of coberturasAEliminar) {
        console.log(`  🗑️ Eliminando cobertura ${cobertura.turno_extra_id} (guardia ${cobertura.guardia_id})`);
        await query(`
          DELETE FROM turnos_extras 
          WHERE id = $1
        `, [cobertura.turno_extra_id]);
      }
    }

    // 4. Verificar el resultado
    const verificacion = await query(`
      SELECT 
        pm.puesto_id,
        pm.estado,
        po.es_ppc,
        COUNT(te.id) as total_coberturas,
        STRING_AGG(g.nombre, ', ') as coberturas_nombres
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN turnos_extras te ON pm.id = te.pauta_id
      LEFT JOIN guardias g ON te.guardia_id = g.id
      WHERE po.es_ppc = true 
        AND (pm.anio = 2025 AND pm.mes = 8 AND pm.dia = 5)
      GROUP BY pm.puesto_id, pm.estado, po.es_ppc
      ORDER BY pm.puesto_id
    `);

    console.log('\n📊 Verificación después de corrección:');
    console.table(verificacion.rows);

    console.log('\n✅ Corrección de duplicación de cobertura PPC completada');
    console.log('\n📝 Resumen de cambios:');
    console.log('- Eliminadas coberturas duplicadas');
    console.log('- Mantenida solo la cobertura más reciente por PPC');
    console.log('- Ahora cada PPC tiene máximo una cobertura');

  } catch (error) {
    console.error('❌ Error al corregir duplicación de cobertura PPC:', error);
    throw error;
  }
}

// Ejecutar el script
corregirDuplicacionCoberturaPPC()
  .then(() => {
    console.log('\n🎉 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error en el script:', error);
    process.exit(1);
  }); 