import { query } from '../src/lib/database';

async function debugPauta() {
  const instalacion_id = '15631bd6-03a9-459d-ae60-fc480f7f3e84'; // A Test 1
  const anio = 2025;
  const mes = 8;
  
  console.log('🔍 DEBUG: Verificando datos de pauta...\n');
  
  try {
    // 1. Verificar registros en la tabla de pauta
    console.log('=' .repeat(60));
    console.log('1. REGISTROS EN TABLA PAUTA MENSUAL');
    console.log('=' .repeat(60));
    
    const pautaRegistros = await query(`
      SELECT 
        guardia_id,
        dia,
        estado,
        created_at,
        updated_at
      FROM as_turnos_pauta_mensual
      WHERE instalacion_id = $1 
        AND anio = $2 
        AND mes = $3
      ORDER BY guardia_id, dia
    `, [instalacion_id, anio, mes]);
    
    console.log(`📊 Total registros en pauta: ${pautaRegistros.rows.length}`);
    
    // Agrupar por guardia
    const registrosPorGuardia: any = {};
    pautaRegistros.rows.forEach((row: any) => {
      if (!registrosPorGuardia[row.guardia_id]) {
        registrosPorGuardia[row.guardia_id] = [];
      }
      registrosPorGuardia[row.guardia_id].push(row);
    });
    
    Object.keys(registrosPorGuardia).forEach(guardiaId => {
      const registros = registrosPorGuardia[guardiaId];
      console.log(`\n👤 Guardia ${guardiaId}: ${registros.length} días`);
      registros.slice(0, 5).forEach((r: any) => {
        console.log(`   - Día ${r.dia}: ${r.estado}`);
      });
      if (registros.length > 5) {
        console.log(`   ... y ${registros.length - 5} días más`);
      }
    });
    
    // 2. Verificar guardias asignados
    console.log('\n' + '=' .repeat(60));
    console.log('2. GUARDIAS ASIGNADOS');
    console.log('=' .repeat(60));
    
    const guardiasAsignados = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo
      FROM guardias g
      INNER JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 
        AND g.activo = true
        AND ta.estado = 'Activa'
    `, [instalacion_id]);
    
    console.log(`👥 Guardias asignados: ${guardiasAsignados.rows.length}`);
    guardiasAsignados.rows.forEach((guardia: any) => {
      console.log(`   - ${guardia.nombre_completo} (${guardia.id})`);
    });
    
    // 3. Verificar PPCs
    console.log('\n' + '=' .repeat(60));
    console.log('3. PPCs');
    console.log('=' .repeat(60));
    
    const ppcs = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        ppc.cantidad_faltante
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1
    `, [instalacion_id]);
    
    console.log(`📋 PPCs totales: ${ppcs.rows.length}`);
    ppcs.rows.forEach((ppc: any) => {
      console.log(`   - PPC ${ppc.id}: ${ppc.estado} (${ppc.cantidad_faltante} faltantes)`);
    });
    
    // 4. Verificar qué guardias deberían estar en la pauta
    console.log('\n' + '=' .repeat(60));
    console.log('4. GUARDIAS QUE DEBERÍAN ESTAR EN PAUTA');
    console.log('=' .repeat(60));
    
    const guardiasCompletos = [
      ...guardiasAsignados.rows,
      ...ppcs.rows.flatMap((ppc: any) => 
        Array.from({ length: ppc.cantidad_faltante }, (_, i) => ({
          id: `${ppc.id}_${i + 1}`,
          nombre_completo: `PPC ${ppc.id.substring(0, 2)}XX${ppc.id.substring(35, 37)} #${i + 1}`,
          tipo: 'ppc'
        }))
      )
    ];
    
    console.log(`📊 Total guardias que deberían estar: ${guardiasCompletos.length}`);
    guardiasCompletos.forEach((guardia: any) => {
      const tieneRegistros = registrosPorGuardia[guardia.id]?.length > 0;
      console.log(`   - ${guardia.nombre_completo} (${guardia.id}): ${tieneRegistros ? '✅' : '❌'} ${registrosPorGuardia[guardia.id]?.length || 0} registros`);
    });
    
    // 5. Verificar discrepancias
    console.log('\n' + '=' .repeat(60));
    console.log('5. DISCREPANCIAS');
    console.log('=' .repeat(60));
    
    const guardiasEnPauta = Object.keys(registrosPorGuardia);
    const guardiasEsperados = guardiasCompletos.map(g => g.id);
    
    const faltantes = guardiasEsperados.filter(id => !guardiasEnPauta.includes(id));
    const extra = guardiasEnPauta.filter(id => !guardiasEsperados.includes(id));
    
    if (faltantes.length > 0) {
      console.log(`❌ Guardias faltantes en pauta: ${faltantes.length}`);
      faltantes.forEach(id => console.log(`   - ${id}`));
    }
    
    if (extra.length > 0) {
      console.log(`⚠️ Guardias extra en pauta: ${extra.length}`);
      extra.forEach(id => console.log(`   - ${id}`));
    }
    
    if (faltantes.length === 0 && extra.length === 0) {
      console.log('✅ No hay discrepancias en guardias');
    }
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
}

// Ejecutar
debugPauta()
  .then(() => {
    console.log('\n✅ Debug completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }); 