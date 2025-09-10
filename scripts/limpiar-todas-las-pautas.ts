#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function limpiarTodasLasPautas() {
  console.log('🧹 LIMPIANDO TODAS LAS PAUTAS PARA EMPEZAR DE CERO\n');

  try {
    console.log('⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de pautas');
    console.log('📋 Tablas que se limpiarán:');
    console.log('   - as_turnos_pauta_mensual');
    console.log('   - as_turnos_pauta_diaria');
    console.log('   - TE_turnos_extras');
    console.log('   - historial_asignaciones_guardias');
    console.log('');

    // Mostrar conteo actual antes de limpiar
    console.log('1️⃣ Contando registros actuales...');
    
    const conteoPautaMensual = await query('SELECT COUNT(*) as count FROM as_turnos_pauta_mensual');
    const conteoPautaDiaria = await query('SELECT COUNT(*) as count FROM as_turnos_pauta_diaria');
    const conteoTurnosExtras = await query('SELECT COUNT(*) as count FROM TE_turnos_extras');
    const conteoHistorial = await query('SELECT COUNT(*) as count FROM historial_asignaciones_guardias');
    
    console.log(`📊 Registros actuales:`);
    console.log(`   - as_turnos_pauta_mensual: ${conteoPautaMensual.rows[0].count}`);
    console.log(`   - as_turnos_pauta_diaria: ${conteoPautaDiaria.rows[0].count}`);
    console.log(`   - TE_turnos_extras: ${conteoTurnosExtras.rows[0].count}`);
    console.log(`   - historial_asignaciones_guardias: ${conteoHistorial.rows[0].count}`);
    console.log('');

    // Limpiar en orden correcto (respetando foreign keys)
    console.log('2️⃣ Limpiando tablas en orden correcto...');
    
    // 1. Limpiar turnos extras (puede referenciar pauta_mensual)
    console.log('🧹 Limpiando TE_turnos_extras...');
    await query('DELETE FROM TE_turnos_extras');
    console.log('✅ TE_turnos_extras limpiada');
    
    // 2. Limpiar historial de asignaciones
    console.log('🧹 Limpiando historial_asignaciones_guardias...');
    await query('DELETE FROM historial_asignaciones_guardias');
    console.log('✅ historial_asignaciones_guardias limpiada');
    
    // 3. Limpiar pauta diaria
    console.log('🧹 Limpiando as_turnos_pauta_diaria...');
    await query('DELETE FROM as_turnos_pauta_diaria');
    console.log('✅ as_turnos_pauta_diaria limpiada');
    
    // 4. Limpiar pauta mensual (última porque puede ser referenciada)
    console.log('🧹 Limpiando as_turnos_pauta_mensual...');
    await query('DELETE FROM as_turnos_pauta_mensual');
    console.log('✅ as_turnos_pauta_mensual limpiada');
    
    // Verificar que todo esté limpio
    console.log('\n3️⃣ Verificando limpieza...');
    
    const conteoFinalPautaMensual = await query('SELECT COUNT(*) as count FROM as_turnos_pauta_mensual');
    const conteoFinalPautaDiaria = await query('SELECT COUNT(*) as count FROM as_turnos_pauta_diaria');
    const conteoFinalTurnosExtras = await query('SELECT COUNT(*) as count FROM TE_turnos_extras');
    const conteoFinalHistorial = await query('SELECT COUNT(*) as count FROM historial_asignaciones_guardias');
    
    console.log(`📊 Registros después de limpieza:`);
    console.log(`   - as_turnos_pauta_mensual: ${conteoFinalPautaMensual.rows[0].count}`);
    console.log(`   - as_turnos_pauta_diaria: ${conteoFinalPautaDiaria.rows[0].count}`);
    console.log(`   - TE_turnos_extras: ${conteoFinalTurnosExtras.rows[0].count}`);
    console.log(`   - historial_asignaciones_guardias: ${conteoFinalHistorial.rows[0].count}`);
    
    // Verificar que las tablas de configuración siguen intactas
    console.log('\n4️⃣ Verificando que las tablas de configuración siguen intactas...');
    
    const conteoPuestos = await query('SELECT COUNT(*) as count FROM as_turnos_puestos_operativos');
    const conteoInstalaciones = await query('SELECT COUNT(*) as count FROM instalaciones');
    const conteoGuardias = await query('SELECT COUNT(*) as count FROM guardias');
    const conteoRoles = await query('SELECT COUNT(*) as count FROM as_turnos_roles_servicio');
    
    console.log(`✅ Tablas de configuración intactas:`);
    console.log(`   - as_turnos_puestos_operativos: ${conteoPuestos.rows[0].count}`);
    console.log(`   - instalaciones: ${conteoInstalaciones.rows[0].count}`);
    console.log(`   - guardias: ${conteoGuardias.rows[0].count}`);
    console.log(`   - as_turnos_roles_servicio: ${conteoRoles.rows[0].count}`);
    
    console.log('\n🎉 ¡LIMPIEZA COMPLETADA EXITOSAMENTE!');
    console.log('📝 Ahora puedes empezar a testear desde cero sin datos fantasma');
    console.log('💡 Las tablas de configuración (puestos, instalaciones, guardias, roles) siguen intactas');
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  limpiarTodasLasPautas()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { limpiarTodasLasPautas };
