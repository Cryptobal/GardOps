import { query } from '../src/lib/database';

async function verificarLogicaTurnos() {
  const instalacionId = '15631bd6-03a9-459d-ae60-fc480f7f3e84';
  
  try {
    console.log('🔍 Verificando lógica de turnos...');
    
    // 1. Verificar configuración de turnos
    const configResult = await query(`
      SELECT * FROM as_turnos_configuracion 
      WHERE instalacion_id = $1
    `, [instalacionId]);
    
    if (configResult.rows.length === 0) {
      console.log('❌ No se encontró configuración de turnos');
      return;
    }
    
    const config = configResult.rows[0];
    console.log(`📊 Configuración: ${config.cantidad_guardias} guardias configurados`);
    
    // 2. Verificar requisitos
    const requisitosResult = await query(`
      SELECT COUNT(*) as total FROM as_turnos_requisitos 
      WHERE instalacion_id = $1
    `, [instalacionId]);
    
    const totalRequisitos = parseInt(requisitosResult.rows[0].total);
    console.log(`📋 Total de requisitos: ${totalRequisitos}`);
    
    // 3. Verificar asignaciones activas
    const asignacionesResult = await query(`
      SELECT COUNT(*) as total 
      FROM as_turnos_asignaciones ta
      JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 AND ta.estado = 'Activa'
    `, [instalacionId]);
    
    const totalAsignaciones = parseInt(asignacionesResult.rows[0].total);
    console.log(`👥 Total de asignaciones activas: ${totalAsignaciones}`);
    
    // 4. Verificar PPCs pendientes
    const ppcsPendientesResult = await query(`
      SELECT COUNT(*) as total 
      FROM as_turnos_ppc ppc
      JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 AND ppc.estado = 'Pendiente'
    `, [instalacionId]);
    
    const totalPPCsPendientes = parseInt(ppcsPendientesResult.rows[0].total);
    console.log(`⏳ Total de PPCs pendientes: ${totalPPCsPendientes}`);
    
    // 5. Verificar PPCs asignados
    const ppcsAsignadosResult = await query(`
      SELECT COUNT(*) as total 
      FROM as_turnos_ppc ppc
      JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 AND ppc.estado = 'Asignado'
    `, [instalacionId]);
    
    const totalPPCsAsignados = parseInt(ppcsAsignadosResult.rows[0].total);
    console.log(`✅ Total de PPCs asignados: ${totalPPCsAsignados}`);
    
    // 6. Calcular totales
    const totalPuestos = config.cantidad_guardias;
    const puestosAsignados = totalAsignaciones + totalPPCsAsignados;
    const puestosPendientes = totalPPCsPendientes;
    const puestosDisponibles = totalPuestos - puestosAsignados - puestosPendientes;
    
    console.log('\n📊 RESUMEN:');
    console.log(`   Total de puestos: ${totalPuestos}`);
    console.log(`   Puestos asignados: ${puestosAsignados}`);
    console.log(`   Puestos pendientes: ${puestosPendientes}`);
    console.log(`   Puestos disponibles: ${puestosDisponibles}`);
    
    // 7. Verificar consistencia
    const suma = puestosAsignados + puestosPendientes + puestosDisponibles;
    const esConsistente = suma === totalPuestos;
    
    console.log(`\n🔍 CONSISTENCIA: ${esConsistente ? '✅ CORRECTA' : '❌ INCORRECTA'}`);
    console.log(`   Suma: ${suma} vs Total: ${totalPuestos}`);
    
    if (!esConsistente) {
      console.log('⚠️ Hay una inconsistencia en los datos');
    }
    
    // 8. Simular el cálculo del frontend
    console.log('\n🖥️ SIMULACIÓN DEL FRONTEND:');
    console.log(`   Total puestos (cantidad_guardias): ${totalPuestos}`);
    console.log(`   Puestos asignados (asignaciones + PPCs asignados): ${puestosAsignados}`);
    console.log(`   Puestos pendientes (PPCs pendientes): ${puestosPendientes}`);
    
    const porcentajeCompletado = totalPuestos > 0 ? Math.round((puestosAsignados / totalPuestos) * 100) : 0;
    console.log(`   Porcentaje completado: ${porcentajeCompletado}%`);
    
  } catch (error) {
    console.error('❌ Error verificando lógica:', error);
  }
}

// Ejecutar el script
verificarLogicaTurnos()
  .then(() => {
    console.log('🏁 Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }); 