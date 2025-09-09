import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function testEliminarPuestoDirecto() {
  console.log('🧪 PROBANDO ELIMINACIÓN DIRECTA DE PUESTO');
  console.log('=========================================\n');

  try {
    const instalacionId = '0e8ba906-e64b-4d4d-a104-ba29f21f48a9';
    const puestoId = '7898c7cc-7b2a-47e8-8834-0fe2a9091206';
    
    console.log('🔍 Probando eliminación de puesto:', puestoId);

    // Probar el endpoint directamente
    const response = await fetch(`http://localhost:3000/api/instalaciones/${instalacionId}/turnos/0e768453-97b3-4bc0-b111-4b4e421ef308/eliminar-puesto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'carlos.irigoyen@gard.cl'
      },
      body: JSON.stringify({
        puesto_id: puestoId
      })
    });

    const result = await response.json();
    console.log('📊 Resultado:', result);

    if (response.ok) {
      console.log('✅ Puesto eliminado correctamente');
      
      // Verificar que el puesto fue eliminado
      const checkResponse = await fetch(`http://localhost:3000/api/instalaciones/${instalacionId}/completa`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'carlos.irigoyen@gard.cl'
        }
      });

      const checkData = await checkResponse.json();
      console.log('📊 Datos después de eliminar:');
      console.log(`  - Turnos: ${checkData.data.turnos.length}`);
      console.log(`  - Puestos: ${checkData.data.puestos.length}`);
      console.log(`  - PPCs: ${checkData.data.ppcs.length}`);
      
      // Verificar si el puesto específico ya no existe
      const puestoEliminado = checkData.data.puestos.find((p: any) => p.id === puestoId);
      if (!puestoEliminado) {
        console.log('✅ El puesto fue eliminado completamente');
      } else {
        console.log('❌ El puesto aún existe');
      }
    } else {
      console.log('❌ Error eliminando puesto:', result.error);
    }

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testEliminarPuestoDirecto().then(() => {
    console.log('\n✅ Test completado');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { testEliminarPuestoDirecto };
