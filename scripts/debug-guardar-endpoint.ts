import { query } from '../src/lib/database';

async function debugGuardarEndpoint() {
  try {
    console.log('🔍 Debuggeando endpoint de guardar pauta mensual...\n');

    const instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84';
    const anio = 2025;
    const mes = 8;

    // 1. Obtener todos los puestos operativos 
    console.log('=== PUESTOS OPERATIVOS ===');
    const todosLosPuestos = await query(`
      SELECT po.id as puesto_id, po.guardia_id, po.nombre_puesto, po.es_ppc
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 AND po.activo = true
      ORDER BY po.nombre_puesto
    `, [instalacion_id]);

    console.log(`📋 Total puestos en instalación: ${todosLosPuestos.rows.length} (incluyendo PPCs)`);
    todosLosPuestos.rows.forEach((puesto: any, index: number) => {
      console.log(`   ${index + 1}. ${puesto.nombre_puesto}:`);
      console.log(`      - Puesto ID: ${puesto.puesto_id}`);
      console.log(`      - Guardia ID: ${puesto.guardia_id}`);
      console.log(`      - Es PPC: ${puesto.es_ppc}`);
    });

    // 2. Simular pauta del frontend
    console.log('\n=== PAUTA DEL FRONTEND ===');
    const pautaFrontend = [
      {
        "guardia_id": "2fcd5bb0-d854-47f3-aa89-c7e6cceaab3b", // PPC
        "dias": Array(31).fill('L')
      },
      {
        "guardia_id": "817d21b0-d5ef-4438-8adf-6258585b23a3", // Guardia real
        "dias": Array(31).fill(0).map((_, i) => i % 2 === 0 ? 'T' : 'L')
      }
    ];

    console.log('📤 Pauta enviada por frontend:');
    pautaFrontend.forEach((item: any, index: number) => {
      console.log(`   ${index + 1}. Guardia ID: ${item.guardia_id}`);
      console.log(`      - Días T: ${item.dias.filter((d: string) => d === 'T').length}`);
      console.log(`      - Días L: ${item.dias.filter((d: string) => d === 'L').length}`);
    });

    // 3. Crear mapa como lo hace el endpoint
    console.log('\n=== SIMULANDO LÓGICA DEL ENDPOINT ===');
    const pautaFrontendMap = new Map();
    for (const guardiaPauta of pautaFrontend) {
      if (guardiaPauta && guardiaPauta.guardia_id && Array.isArray(guardiaPauta.dias)) {
        pautaFrontendMap.set(guardiaPauta.guardia_id, guardiaPauta.dias);
        console.log(`✅ Mapeado: ${guardiaPauta.guardia_id} -> ${guardiaPauta.dias.length} días`);
      }
    }

    // 4. Procesar cada puesto como lo hace el endpoint
    console.log('\n=== PROCESANDO CADA PUESTO ===');
    let totalOperacionesSimuladas = 0;

    for (const puesto of todosLosPuestos.rows) {
      const puestoId = puesto.puesto_id;
      const esPPC = puesto.es_ppc;
      const guardiaId = puesto.guardia_id || puestoId; // Para PPCs usar el puesto_id como guardia_id
      
      console.log(`\n🔄 Procesando puesto: ${puesto.nombre_puesto} (PPC: ${esPPC})`);
      console.log(`   - Puesto ID: ${puestoId}`);
      console.log(`   - Guardia ID calculado: ${guardiaId}`);
      console.log(`   - Guardia ID original: ${puesto.guardia_id}`);
      
      // Obtener los días del frontend
      let dias = pautaFrontendMap.get(guardiaId);
      console.log(`   - ¿Encontrado en frontend? ${dias ? 'SÍ' : 'NO'}`);
      
      if (!dias) {
        if (esPPC) {
          // Para PPCs sin datos en frontend, crear días con estado 'libre'
          const diasDelMes = new Date(anio, mes, 0).getDate();
          dias = Array.from({ length: diasDelMes }, () => 'L');
          console.log(`   - Generando días para PPC: ${dias.length} días libres`);
        } else {
          console.log(`   ⚠️ No se encontraron datos para guardia ${guardiaId} - SALTANDO`);
          continue;
        }
      } else {
        console.log(`   - Días encontrados: ${dias.length} (T: ${dias.filter((d: string) => d === 'T').length}, L: ${dias.filter((d: string) => d === 'L').length})`);
      }
      
      // Contar operaciones que se harían
      for (let diaIndex = 0; diaIndex < dias.length; diaIndex++) {
        const dia = diaIndex + 1;
        const estado = dias[diaIndex];
        
        if (estado === undefined || estado === null) {
          console.log(`     ⚠️ Estado inválido día ${dia}: ${estado}`);
          continue;
        }
        
        totalOperacionesSimuladas++;
      }
      
      console.log(`   - Operaciones para este puesto: ${dias.length}`);
    }

    console.log(`\n📊 RESUMEN SIMULACIÓN:`);
    console.log(`   - Total operaciones simuladas: ${totalOperacionesSimuladas}`);
    console.log(`   - Puestos procesados: ${todosLosPuestos.rows.length}`);

    // 5. Verificar el mapa del frontend
    console.log('\n=== VERIFICACIÓN DEL MAPA FRONTEND ===');
    console.log('Claves en el mapa:');
    for (const [key, value] of pautaFrontendMap) {
      console.log(`   - ${key}: ${Array.isArray(value) ? value.length : 'Invalid'} días`);
    }

    console.log('\nGuardia IDs de los puestos:');
    todosLosPuestos.rows.forEach((puesto: any) => {
      const guardiaIdCalculado = puesto.guardia_id || puesto.puesto_id;
      const encontrado = pautaFrontendMap.has(guardiaIdCalculado);
      console.log(`   - ${puesto.nombre_puesto}: ${guardiaIdCalculado} (${encontrado ? 'ENCONTRADO' : 'NO ENCONTRADO'})`);
    });

  } catch (error) {
    console.error('❌ Error en debug:', error);
  } finally {
    process.exit(0);
  }
}

debugGuardarEndpoint();