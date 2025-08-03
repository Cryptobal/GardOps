import { query } from '../src/lib/database';

async function verificarLogicaFinal() {
  const instalacionId = '15631bd6-03a9-459d-ae60-fc480f7f3e84';
  
  try {
    console.log('🔍 Verificando lógica final según tu criterio...');
    
    // 1. Total de puestos (configuración)
    const configResult = await query(`
      SELECT cantidad_guardias FROM as_turnos_configuracion 
      WHERE instalacion_id = $1
    `, [instalacionId]);
    
    const totalPuestos = configResult.rows[0]?.cantidad_guardias || 0;
    console.log(`📊 Total de puestos configurados: ${totalPuestos}`);
    
    // 2. Puestos cubiertos (asignaciones activas)
    const asignacionesResult = await query(`
      SELECT COUNT(*) as total 
      FROM as_turnos_asignaciones ta
      JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 AND ta.estado = 'Activa'
    `, [instalacionId]);
    
    const puestosCubiertos = parseInt(asignacionesResult.rows[0].total);
    console.log(`✅ Puestos cubiertos (asignaciones): ${puestosCubiertos}`);
    
    // 3. PPCs pendientes (puestos no cubiertos)
    const ppcsPendientesResult = await query(`
      SELECT COUNT(*) as total 
      FROM as_turnos_ppc ppc
      JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 AND ppc.estado = 'Pendiente'
    `, [instalacionId]);
    
    const ppcsPendientes = parseInt(ppcsPendientesResult.rows[0].total);
    console.log(`⏳ PPCs pendientes: ${ppcsPendientes}`);
    
    // 4. Verificar que la suma sea correcta
    const suma = puestosCubiertos + ppcsPendientes;
    const esCorrecto = suma === totalPuestos;
    
    console.log('\n📊 RESUMEN SEGÚN TU LÓGICA:');
    console.log(`   Total de puestos: ${totalPuestos}`);
    console.log(`   Puestos cubiertos: ${puestosCubiertos}`);
    console.log(`   PPCs pendientes: ${ppcsPendientes}`);
    console.log(`   Suma: ${suma}`);
    
    console.log(`\n🔍 VERIFICACIÓN: ${esCorrecto ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
    
    if (esCorrecto) {
      console.log('🎉 ¡La lógica está funcionando correctamente!');
      console.log(`📈 Porcentaje completado: ${Math.round((puestosCubiertos / totalPuestos) * 100)}%`);
    } else {
      console.log('⚠️ Hay una inconsistencia en los datos');
    }
    
    // 5. Verificar que no haya requisitos sin cobertura
    const requisitosSinCobertura = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_requisitos tr
      WHERE tr.instalacion_id = $1 
      AND tr.id NOT IN (
        SELECT DISTINCT ta.requisito_puesto_id 
        FROM as_turnos_asignaciones ta 
        WHERE ta.estado = 'Activa'
      ) 
      AND tr.id NOT IN (
        SELECT DISTINCT ppc.requisito_puesto_id 
        FROM as_turnos_ppc ppc 
        WHERE ppc.estado = 'Pendiente'
      )
    `, [instalacionId]);
    
    const requisitosSinCoberturaCount = parseInt(requisitosSinCobertura.rows[0].total);
    console.log(`\n🔍 Requisitos sin cobertura: ${requisitosSinCoberturaCount}`);
    
    if (requisitosSinCoberturaCount === 0) {
      console.log('✅ Todos los requisitos tienen cobertura (asignación o PPC)');
    } else {
      console.log('❌ Hay requisitos sin cobertura');
    }
    
  } catch (error) {
    console.error('❌ Error verificando lógica final:', error);
  }
}

// Ejecutar el script
verificarLogicaFinal()
  .then(() => {
    console.log('🏁 Verificación final completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }); 