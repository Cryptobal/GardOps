import { query } from '../src/lib/database';

async function testFrontendSimulation() {
  try {
    console.log('🧪 Simulando flujo completo del frontend...\n');

    const instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84';
    const anio = 2025;
    const mes = 8;

    // 1. PASO 1: Simular la carga inicial de la pauta (GET)
    console.log('=== PASO 1: CARGA INICIAL DE PAUTA ===');
    
    const pautaResponse = await fetch(`http://localhost:3000/api/pauta-mensual?instalacion_id=${instalacion_id}&anio=${anio}&mes=${mes}`);
    const pautaData = await pautaResponse.json();
    
    console.log('✅ Respuesta del endpoint de carga:');
    console.log(`   - Success: ${pautaData.success}`);
    console.log(`   - Total puestos: ${pautaData.pauta?.length || 0}`);
    
    if (pautaData.pauta) {
      pautaData.pauta.forEach((puesto: any, index: number) => {
        console.log(`   - Puesto ${index + 1}: ${puesto.nombre} (PPC: ${puesto.es_ppc})`);
        console.log(`     * ID: ${puesto.id}`);
        console.log(`     * Guardia ID: ${puesto.guardia_id}`);
        console.log(`     * Tipo: ${puesto.tipo}`);
        console.log(`     * Días no vacíos: ${puesto.dias.filter((d: string) => d !== '').length}`);
      });
    }

    if (!pautaData.success || !pautaData.pauta) {
      console.log('❌ Error en la carga inicial');
      return;
    }

    // 2. PASO 2: Simular modificaciones del usuario (como si editara la tabla)
    console.log('\n=== PASO 2: SIMULANDO MODIFICACIONES DEL USUARIO ===');
    
    const pautaModificada = pautaData.pauta.map((puesto: any) => {
      // Simular que el usuario modifica algunos días
      const diasModificados = puesto.dias.map((dia: string, index: number) => {
        if (puesto.es_ppc) {
          // Para PPCs, algunos días libres
          return 'L';
        } else {
          // Para guardias normales, alternar T/L
          return index % 2 === 0 ? 'T' : 'L';
        }
      });

      return {
        guardia_id: puesto.guardia_id || puesto.id, // Usar ID del puesto si no hay guardia asignada
        dias: diasModificados
      };
    });

    console.log('✅ Pauta modificada preparada:');
    pautaModificada.forEach((item: any, index: number) => {
      const totalT = item.dias.filter((d: string) => d === 'T').length;
      const totalL = item.dias.filter((d: string) => d === 'L').length;
      console.log(`   - Guardia ${index + 1} (${item.guardia_id}): ${totalT} trabajados, ${totalL} libres`);
    });

    // 3. PASO 3: Simular el guardado (POST)
    console.log('\n=== PASO 3: GUARDADO DE PAUTA ===');
    
    const bodyGuardar = {
      instalacion_id: instalacion_id,
      anio: anio,
      mes: mes,
      pauta: pautaModificada
    };

    console.log('📤 Body a enviar:');
    console.log(JSON.stringify(bodyGuardar, null, 2));

    const guardarResponse = await fetch('http://localhost:3000/api/pauta-mensual/guardar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyGuardar)
    });

    const guardarData = await guardarResponse.json();
    
    console.log('\n✅ Respuesta del guardado:');
    console.log(`   - Success: ${guardarData.success}`);
    console.log(`   - Message: ${guardarData.message}`);
    if (guardarData.metadata) {
      console.log(`   - Total guardias: ${guardarData.metadata.total_guardias}`);
      console.log(`   - Total operaciones: ${guardarData.metadata.total_operaciones}`);
      console.log(`   - Tiempo: ${guardarData.metadata.tiempo_procesamiento_ms}ms`);
    }

    // 4. PASO 4: Verificar en la base de datos
    console.log('\n=== PASO 4: VERIFICACIÓN EN BASE DE DATOS ===');
    
    const verificacion = await query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT pm.puesto_id) as puestos_unicos,
        COUNT(DISTINCT pm.guardia_id) as guardias_unicas,
        COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as registros_ppc,
        COUNT(CASE WHEN po.es_ppc = false THEN 1 END) as registros_guardias,
        COUNT(CASE WHEN pm.estado = 'trabajado' THEN 1 END) as total_trabajados,
        COUNT(CASE WHEN pm.estado = 'libre' THEN 1 END) as total_libres
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacion_id, anio, mes]);

    const result = verificacion.rows[0];
    console.log('📊 Resultados en base de datos:');
    console.log(`   - Total registros: ${result.total_registros}`);
    console.log(`   - Puestos únicos: ${result.puestos_unicos}`);
    console.log(`   - Guardias únicas: ${result.guardias_unicas}`);
    console.log(`   - Registros PPC: ${result.registros_ppc}`);
    console.log(`   - Registros guardias: ${result.registros_guardias}`);
    console.log(`   - Total trabajados: ${result.total_trabajados}`);
    console.log(`   - Total libres: ${result.total_libres}`);

    // 5. PASO 5: Verificación detallada por puesto
    console.log('\n=== PASO 5: VERIFICACIÓN DETALLADA POR PUESTO ===');
    
    const detalle = await query(`
      SELECT 
        po.nombre_puesto,
        po.es_ppc,
        po.guardia_id as puesto_guardia_id,
        pm.guardia_id as pauta_guardia_id,
        COUNT(*) as total_dias,
        COUNT(CASE WHEN pm.estado = 'trabajado' THEN 1 END) as dias_trabajados,
        COUNT(CASE WHEN pm.estado = 'libre' THEN 1 END) as dias_libres,
        COUNT(CASE WHEN pm.estado = 'permiso' THEN 1 END) as dias_permiso
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
      GROUP BY po.nombre_puesto, po.es_ppc, po.guardia_id, pm.guardia_id
      ORDER BY po.nombre_puesto
    `, [instalacion_id, anio, mes]);

    detalle.rows.forEach((puesto: any, index: number) => {
      console.log(`\n   📋 ${puesto.nombre_puesto}:`);
      console.log(`      - Es PPC: ${puesto.es_ppc}`);
      console.log(`      - Puesto Guardia ID: ${puesto.puesto_guardia_id}`);
      console.log(`      - Pauta Guardia ID: ${puesto.pauta_guardia_id}`);
      console.log(`      - Total días: ${puesto.total_dias}`);
      console.log(`      - Trabajados: ${puesto.dias_trabajados}`);
      console.log(`      - Libres: ${puesto.dias_libres}`);
      console.log(`      - Permisos: ${puesto.dias_permiso}`);
    });

    console.log('\n✅ Simulación del frontend completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la simulación:', error);
  } finally {
    process.exit(0);
  }
}

testFrontendSimulation();