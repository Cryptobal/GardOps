import { query } from '../src/lib/database';

async function simplifyTriggers() {
  try {
    console.log('🔧 Simplificando triggers para evitar recursión...');

    // 1. Eliminar todos los triggers problemáticos
    console.log('1. Eliminando triggers problemáticos...');
    await query('DROP TRIGGER IF EXISTS calcular_ppc_automatico ON as_turnos_ppc');
    await query('DROP TRIGGER IF EXISTS actualizar_estado_ppc ON as_turnos_asignaciones');
    console.log('✅ Triggers eliminados');

    // 2. Eliminar funciones con CASCADE
    console.log('2. Eliminando funciones con CASCADE...');
    await query('DROP FUNCTION IF EXISTS calcular_ppc_automatico() CASCADE');
    await query('DROP FUNCTION IF EXISTS actualizar_estado_ppc() CASCADE');
    console.log('✅ Funciones eliminadas');

    console.log('🎉 ¡Triggers simplificados exitosamente!');
    console.log('💡 Los PPCs se calcularán manualmente desde la aplicación');
    
  } catch (error) {
    console.error('❌ Error simplificando triggers:', error);
  } finally {
    process.exit(0);
  }
}

simplifyTriggers(); 