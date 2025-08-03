import { query } from '../src/lib/database';

async function eliminarDataPautaMensual() {
  try {
    console.log('🔄 Iniciando eliminación de data de as_turnos_pauta_mensual...');
    
    // Verificar si hay datos en la tabla
    const checkResult = await query(`
      SELECT COUNT(*) as count 
      FROM as_turnos_pauta_mensual
    `);
    
    const count = parseInt(checkResult.rows[0]?.count || '0');
    console.log(`📊 Registros encontrados en as_turnos_pauta_mensual: ${count}`);
    
    if (count === 0) {
      console.log('✅ La tabla as_turnos_pauta_mensual ya está vacía');
      return;
    }
    
    // Eliminar todos los registros
    const deleteResult = await query(`
      DELETE FROM as_turnos_pauta_mensual
    `);
    
    console.log(`🗑️ Eliminados ${deleteResult.rowCount} registros de as_turnos_pauta_mensual`);
    
    // Verificar que la tabla esté vacía
    const verifyResult = await query(`
      SELECT COUNT(*) as count 
      FROM as_turnos_pauta_mensual
    `);
    
    const finalCount = parseInt(verifyResult.rows[0]?.count || '0');
    console.log(`✅ Verificación final: ${finalCount} registros restantes`);
    
    if (finalCount === 0) {
      console.log('🎉 Eliminación completada exitosamente');
    } else {
      console.log('⚠️ Algunos registros no pudieron ser eliminados');
    }
    
  } catch (error) {
    console.error('❌ Error al eliminar data de as_turnos_pauta_mensual:', error);
    throw error;
  }
}

// Ejecutar el script
eliminarDataPautaMensual()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falló:', error);
    process.exit(1);
  }); 