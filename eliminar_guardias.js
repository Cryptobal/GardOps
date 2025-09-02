const axios = require('axios');

// IDs de los guardias a eliminar
const guardiasAEliminar = [
  '55e48627-6dc6-4052-876e-d52f27601e2a',
  '7490d538-8549-45b2-a67b-a8cdd694c810'
];

// URL base de la API
const baseURL = 'http://localhost:3000/api/guardias';

async function eliminarGuardia(id) {
  try {
    console.log(`🗑️ Eliminando guardia con ID: ${id}`);
    
    const response = await axios.delete(`${baseURL}/${id}`);
    
    if (response.data.success) {
      console.log(`✅ Guardia ${id} eliminado exitosamente`);
      return true;
    } else {
      console.log(`❌ Error eliminando guardia ${id}:`, response.data.error);
      return false;
    }
  } catch (error) {
    if (error.response) {
      console.log(`❌ Error HTTP ${error.response.status} eliminando guardia ${id}:`, error.response.data.error);
    } else {
      console.log(`❌ Error de red eliminando guardia ${id}:`, error.message);
    }
    return false;
  }
}

async function eliminarTodosLosGuardias() {
  console.log('🚀 Iniciando eliminación de guardias...');
  console.log(`📋 Total de guardias a eliminar: ${guardiasAEliminar.length}`);
  
  let exitosos = 0;
  let fallidos = 0;
  
  for (const id of guardiasAEliminar) {
    const resultado = await eliminarGuardia(id);
    if (resultado) {
      exitosos++;
    } else {
      fallidos++;
    }
    
    // Pausa entre eliminaciones para evitar sobrecarga
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Resumen de eliminación:');
  console.log(`✅ Guardias eliminados exitosamente: ${exitosos}`);
  console.log(`❌ Guardias que fallaron: ${fallidos}`);
  
  if (fallidos === 0) {
    console.log('🎉 ¡Todos los guardias fueron eliminados exitosamente!');
  } else {
    console.log('⚠️ Algunos guardias no pudieron ser eliminados. Revisa los logs anteriores.');
  }
}

// Ejecutar el script
eliminarTodosLosGuardias().catch(console.error);
