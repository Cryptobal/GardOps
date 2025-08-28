import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function testEndpointCompleta() {
  console.log('🧪 PROBANDO ENDPOINT /api/instalaciones/[id]/completa');
  console.log('==================================================\n');

  try {
    // ID de la instalación A-Test33
    const instalacionId = '0e8ba906-e64b-4d4d-a104-ba29f21f48a9';
    
    console.log('🔍 Probando instalación:', instalacionId);
    
    // Simular la llamada al endpoint
    const response = await fetch(`http://localhost:3000/api/instalaciones/${instalacionId}/completa`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Agregar headers de autenticación si es necesario
        'x-user-email': 'carlos.irigoyen@gard.cl'
      }
    });

    if (!response.ok) {
      console.error('❌ Error en la respuesta:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error body:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ Respuesta exitosa del endpoint');
    console.log('📊 Estructura de datos:');
    console.log('  - success:', data.success);
    console.log('  - instalacion:', data.data?.instalacion?.nombre);
    console.log('  - turnos:', data.data?.turnos?.length || 0);
    console.log('  - puestos:', data.data?.puestos?.length || 0);
    console.log('  - ppcs:', data.data?.ppcs?.length || 0);
    console.log('  - guardias:', data.data?.guardias?.length || 0);
    console.log('  - roles:', data.data?.roles?.length || 0);

    // Detallar turnos
    if (data.data?.turnos && data.data.turnos.length > 0) {
      console.log('\n📋 TURNOS ENCONTRADOS:');
      data.data.turnos.forEach((turno: any, index: number) => {
        console.log(`  ${index + 1}. ${turno.nombre}`);
        console.log(`     - ID: ${turno.id}`);
        console.log(`     - Puestos asignados: ${turno.puestos_asignados}`);
        console.log(`     - PPC pendientes: ${turno.ppc_pendientes}`);
        console.log(`     - Total puestos: ${turno.puestos?.length || 0}`);
        
        if (turno.puestos && turno.puestos.length > 0) {
          console.log(`     - Puestos:`);
          turno.puestos.forEach((puesto: any) => {
            console.log(`       * ${puesto.nombre_puesto} (PPC: ${puesto.es_ppc}, Guardia: ${puesto.guardia_nombre || 'Sin asignar'})`);
          });
        }
      });
    } else {
      console.log('\n❌ NO SE ENCONTRARON TURNOS');
    }

    // Detallar PPCs
    if (data.data?.ppcs && data.data.ppcs.length > 0) {
      console.log('\n📋 PPCs ENCONTRADOS:');
      data.data.ppcs.forEach((ppc: any, index: number) => {
        console.log(`  ${index + 1}. ${ppc.nombre_puesto} (${ppc.rol_servicio_nombre})`);
        console.log(`     - Estado: ${ppc.estado}`);
        console.log(`     - Motivo: ${ppc.motivo}`);
      });
    } else {
      console.log('\n❌ NO SE ENCONTRARON PPCs');
    }

  } catch (error) {
    console.error('❌ Error probando endpoint:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testEndpointCompleta().then(() => {
    console.log('\n✅ Test completado');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { testEndpointCompleta };
