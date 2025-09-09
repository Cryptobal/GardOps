import { query } from '../src/lib/database';

async function corregirEstadosPautaPayroll() {
  try {
    console.log('🔧 Iniciando corrección de estados de pauta para payroll...\n');

    // 1. Verificar estados actuales
    console.log('1️⃣ Verificando estados actuales...');
    const estadosActuales = await query(`
      SELECT 
        estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual 
      GROUP BY estado
      ORDER BY cantidad DESC
    `);

    console.log('📊 Estados actuales:');
    estadosActuales.rows.forEach((row: any) => {
      console.log(`  - ${row.estado}: ${row.cantidad} registros`);
    });

    // 2. Corregir estados 'T' a 'planificado'
    console.log('\n2️⃣ Corrigiendo estados "T" a "planificado"...');
    const resultadoT = await query(`
      UPDATE as_turnos_pauta_mensual
      SET estado = 'planificado',
          updated_at = NOW()
      WHERE estado = 'T'
    `);

    console.log(`✅ Actualizados ${resultadoT.rowCount} registros de 'T' a 'planificado'`);

    // 3. Verificar que no hay estados 'trabajado' sin confirmación
    console.log('\n3️⃣ Verificando registros con estado "trabajado"...');
    const registrosTrabajado = await query(`
      SELECT 
        id,
        guardia_id,
        puesto_id,
        anio,
        mes,
        dia,
        estado,
        created_at
      FROM as_turnos_pauta_mensual 
      WHERE estado = 'trabajado'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`📊 Encontrados ${registrosTrabajado.rows.length} registros con estado 'trabajado'`);
    
    if (registrosTrabajado.rows.length > 0) {
      console.log('⚠️  Algunos registros tienen estado "trabajado" sin confirmación manual');
      console.log('   Estos deberían ser revisados manualmente para confirmar si realmente asistieron');
    }

    // 4. Verificar integridad de datos
    console.log('\n4️⃣ Verificando integridad de datos...');
    const integridad = await query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as con_guardia,
        COUNT(CASE WHEN guardia_id IS NULL THEN 1 END) as sin_guardia,
        COUNT(CASE WHEN estado IN ('trabajado', 'planificado', 'libre', 'permiso', 'licencia', 'vacaciones', 'inasistencia') THEN 1 END) as estados_validos,
        COUNT(CASE WHEN estado NOT IN ('trabajado', 'planificado', 'libre', 'permiso', 'licencia', 'vacaciones', 'inasistencia') THEN 1 END) as estados_invalidos
      FROM as_turnos_pauta_mensual
    `);

    const stats = integridad.rows[0];
    console.log('📊 Estadísticas de integridad:');
    console.log(`  - Total registros: ${stats.total_registros}`);
    console.log(`  - Con guardia asignado: ${stats.con_guardia}`);
    console.log(`  - Sin guardia asignado: ${stats.sin_guardia}`);
    console.log(`  - Estados válidos: ${stats.estados_validos}`);
    console.log(`  - Estados inválidos: ${stats.estados_invalidos}`);

    // 5. Verificar estados finales
    console.log('\n5️⃣ Verificando estados finales...');
    const estadosFinales = await query(`
      SELECT 
        estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual 
      GROUP BY estado
      ORDER BY cantidad DESC
    `);

    console.log('📊 Estados finales:');
    estadosFinales.rows.forEach((row: any) => {
      console.log(`  - ${row.estado}: ${row.cantidad} registros`);
    });

    // 6. Recomendaciones
    console.log('\n6️⃣ Recomendaciones para payroll:');
    console.log('✅ Estados corregidos para cálculo de sueldos:');
    console.log('   - "planificado": Días asignados pero no confirmados (no se pagan)');
    console.log('   - "trabajado": Días confirmados como asistidos (se pagan)');
    console.log('   - "inasistencia": Días no asistidos (se descuentan del sueldo)');
    console.log('   - "libre": Días libres del turno (no se pagan)');
    console.log('   - "vacaciones": Días de vacaciones (se pagan aunque no asiste)');
    console.log('   - "licencia": Días de licencia médica (no se pagan)');
    console.log('   - "permiso_con_goce": Permisos con goce (se pagan aunque no asiste)');
    console.log('   - "permiso_sin_goce": Permisos sin goce (no se pagan)');
    
    console.log('\n📊 Lógica de cálculo de sueldo:');
    console.log('   - DÍAS PAGABLES: trabajado + vacaciones + permiso_con_goce');
    console.log('   - DÍAS NO PAGABLES: libre + licencia + permiso_sin_goce + planificado');
    console.log('   - DÍAS DESCONTABLES: inasistencia (se descuentan del sueldo)');
    
    console.log('\n⚠️  Acciones recomendadas:');
    console.log('   1. Revisar manualmente registros con estado "trabajado"');
    console.log('   2. Confirmar asistencias desde pauta diaria');
    console.log('   3. Ejecutar cálculo de sueldos con datos corregidos');

    console.log('\n✅ Corrección de estados completada exitosamente');

  } catch (error) {
    console.error('❌ Error en corrección de estados:', error);
    throw error;
  }
}

// Función para ejecutar el script
async function main() {
  try {
    await corregirEstadosPautaPayroll();
    console.log('\n🎉 Script completado exitosamente');
  } catch (error) {
    console.error('\n💥 Error ejecutando script:', error);
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main();
}

export { corregirEstadosPautaPayroll };
