import { verificarAsistenciaGuardia } from './verificar-asistencia-guardia';

async function ejemploVerificacion() {
  try {
    console.log('🚀 Ejemplo de verificación de asistencia diaria');
    console.log('===============================================\n');
    
    // Usando un ID real de guardia de la base de datos
    const guardiaId = '7c84d4ad-dcb2-40f9-9d03-b7d1bf673220'; // A Test Guardia
    
    console.log(`📋 Verificando asistencia para guardia ID: ${guardiaId}`);
    console.log('⏳ Consultando base de datos...\n');
    
    const resultado = await verificarAsistenciaGuardia(guardiaId);
    
    console.log('\n📊 Resumen del resultado:');
    console.log(`- Tiene asistencia registrada: ${resultado.tieneAsistencia ? 'Sí' : 'No'}`);
    
    if (resultado.tieneAsistencia) {
      console.log(`- Estado: ${resultado.estado}`);
      console.log(`- Observaciones: ${resultado.observaciones || 'Sin observaciones'}`);
      console.log(`- Reemplazado por: ${resultado.reemplazoGuardiaId || 'Ninguno'}`);
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error en el ejemplo:', error);
  }
}

// Ejecutar el ejemplo
if (require.main === module) {
  ejemploVerificacion();
}
