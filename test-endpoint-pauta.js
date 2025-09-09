const fetch = require('node-fetch');

async function testEndpointPauta() {
  console.log('🧪 Probando endpoint de pauta mensual...');
  
  try {
    const actualizaciones = [
      {
        puesto_id: "909eda4a-e2d7-4ac4-8b66-6f82b276345d",
        guardia_id: null,
        anio: 2025,
        mes: 8,
        dia: 1,
        estado: "planificado"
      },
      {
        puesto_id: "909eda4a-e2d7-4ac4-8b66-6f82b276345d",
        guardia_id: null,
        anio: 2025,
        mes: 8,
        dia: 2,
        estado: "libre"
      }
    ];

    const response = await fetch('http://localhost:3002/api/pauta-mensual/guardar', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instalacion_id: "7e05a55d-8db6-4c20-b51c-509f09d69f74",
        anio: 2025,
        mes: 8,
        actualizaciones: actualizaciones
      }),
    });

    const result = await response.json();
    
    console.log('📊 Respuesta del endpoint:');
    console.log('Status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testEndpointPauta();
