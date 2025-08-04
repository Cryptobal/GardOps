import { query } from '../src/lib/database';

async function testFrontendFinal() {
  try {
    console.log('🎯 PRUEBA FINAL DEL FRONTEND REAL\\n');

    const instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84';
    const anio = 2025;
    const mes = 8;

    // 1. Limpiar datos existentes
    console.log('=== PASO 1: LIMPIAR DATOS EXISTENTES ===');
    await query(`
      DELETE FROM as_turnos_pauta_mensual pm
      USING as_turnos_puestos_operativos po
      WHERE pm.puesto_id = po.id 
        AND po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacion_id, anio, mes]);
    console.log('✅ Datos existentes eliminados');

    // 2. Verificar estado inicial
    const estadoInicial = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 AND pm.anio = $2 AND pm.mes = $3
    `, [instalacion_id, anio, mes]);
    
    console.log(`✅ Estado inicial: ${estadoInicial.rows[0].count} registros`);

    // 3. Llamar al endpoint de carga
    console.log('\\n=== PASO 2: CARGAR PAUTA DESDE ENDPOINT ===');
    const cargaResponse = await fetch(`http://localhost:3000/api/pauta-mensual?instalacion_id=${instalacion_id}&anio=${anio}&mes=${mes}`);
    const cargaData = await cargaResponse.json();
    
    if (!cargaData.success) {
      throw new Error('Error cargando pauta: ' + cargaData.error);
    }
    
    console.log(`✅ Pauta cargada: ${cargaData.pauta.length} puestos`);
    
    cargaData.pauta.forEach((puesto: any, index: number) => {
      console.log(`   ${index + 1}. ${puesto.nombre_puesto}:`);
      console.log(`      - ID: ${puesto.id}`);
      console.log(`      - Guardia ID: ${puesto.guardia_id || 'NULL'}`);
      console.log(`      - Es PPC: ${puesto.es_ppc}`);
      console.log(`      - Frontend usará: ${puesto.es_ppc ? puesto.id : (puesto.guardia_id || puesto.id)}`);
    });

    // 4. Simular datos del frontend con la nueva lógica
    console.log('\\n=== PASO 3: SIMULAR DATOS DEL FRONTEND (NUEVA LÓGICA) ===');
    const pautaParaGuardar = cargaData.pauta.map((guardia: any) => ({
      guardia_id: guardia.es_ppc ? guardia.id : (guardia.guardia_id || guardia.id), // Nueva lógica
      dias: Array.from({ length: 31 }, (_, i) => {
        if (guardia.es_ppc) {
          return 'L'; // PPCs siempre libres
        } else {
          return (i + 1) % 2 === 0 ? 'T' : 'L'; // Patrón alternado para guardias
        }
      })
    }));

    console.log('📤 Datos a enviar:');
    pautaParaGuardar.forEach((item: any, index: number) => {
      console.log(`   ${index + 1}. guardia_id: ${item.guardia_id}`);
      console.log(`      - Trabajados: ${item.dias.filter((d: string) => d === 'T').length}`);
      console.log(`      - Libres: ${item.dias.filter((d: string) => d === 'L').length}`);
    });

    // 5. Llamar al endpoint de guardar
    console.log('\\n=== PASO 4: GUARDAR CON NUEVA LÓGICA ===');
    const guardarResponse = await fetch('http://localhost:3000/api/pauta-mensual/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instalacion_id,
        anio,
        mes,
        pauta: pautaParaGuardar
      }),
    });

    const guardarData = await guardarResponse.json();
    
    if (!guardarData.success) {
      throw new Error('Error guardando pauta: ' + guardarData.error);
    }
    
    console.log(`✅ Guardado exitoso: ${guardarData.message}`);
    console.log(`   - Total operaciones: ${guardarData.total_operaciones || 'N/A'}`);

    // 6. Verificar resultados finales
    console.log('\\n=== PASO 5: VERIFICACIÓN FINAL ===');
    const verificacion = await query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT pm.puesto_id) as puestos_unicos,
        COUNT(DISTINCT pm.guardia_id) as guardias_unicas,
        SUM(CASE WHEN pm.estado = 'trabajado' THEN 1 ELSE 0 END) as total_trabajados,
        SUM(CASE WHEN pm.estado = 'libre' THEN 1 ELSE 0 END) as total_libres
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 AND pm.anio = $2 AND pm.mes = $3
    `, [instalacion_id, anio, mes]);

    const stats = verificacion.rows[0];
    
    console.log('📊 RESULTADOS FINALES:');
    console.log(`   ✅ Total registros: ${stats.total_registros} (esperado: 62)`);
    console.log(`   ✅ Puestos únicos: ${stats.puestos_unicos} (esperado: 2)`);
    console.log(`   ✅ Guardias únicas: ${stats.guardias_unicas} (esperado: 2)`);
    console.log(`   ✅ Total trabajados: ${stats.total_trabajados} (esperado: ~16)`);
    console.log(`   ✅ Total libres: ${stats.total_libres} (esperado: ~46)`);

    // Verificar por puesto individual
    const porPuesto = await query(`
      SELECT 
        po.nombre_puesto,
        po.es_ppc,
        COUNT(*) as total_dias,
        SUM(CASE WHEN pm.estado = 'trabajado' THEN 1 ELSE 0 END) as trabajados,
        SUM(CASE WHEN pm.estado = 'libre' THEN 1 ELSE 0 END) as libres
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 AND pm.anio = $2 AND pm.mes = $3
      GROUP BY po.nombre_puesto, po.es_ppc
      ORDER BY po.es_ppc DESC, po.nombre_puesto
    `, [instalacion_id, anio, mes]);

    console.log('\\n📋 DETALLE POR PUESTO:');
    porPuesto.rows.forEach((puesto: any, index: number) => {
      console.log(`   ${index + 1}. ${puesto.nombre_puesto} (PPC: ${puesto.es_ppc}):`);
      console.log(`      - Total días: ${puesto.total_dias}`);
      console.log(`      - Trabajados: ${puesto.trabajados}`);
      console.log(`      - Libres: ${puesto.libres}`);
    });

    if (parseInt(stats.total_registros) === 62 && parseInt(stats.puestos_unicos) === 2) {
      console.log('\\n🎉 ¡ÉXITO TOTAL! Todos los puestos se guardaron correctamente.');
    } else {
      console.log('\\n❌ Aún hay problemas en el guardado.');
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testFrontendFinal();