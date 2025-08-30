const fetch = require('node-fetch');

async function testApiGuardias() {
  console.log('🔍 TEST: Probando API de guardias\n');
  
  try {
    // Probar con diferentes headers de autenticación
    const headers = {
      'x-user-email': 'carlos.irigoyen@gard.cl',
      'Content-Type': 'application/json'
    };

    console.log('1️⃣ Probando con headers:', headers);
    
    const response = await fetch('http://localhost:3000/api/guardias', {
      method: 'GET',
      headers: headers
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.text();
    console.log('Response:', data.substring(0, 500));

    if (response.ok) {
      const jsonData = JSON.parse(data);
      console.log('\n✅ Datos recibidos:');
      if (jsonData.items && jsonData.items.length > 0) {
        jsonData.items.slice(0, 3).forEach((guardia, index) => {
          console.log(`  ${index + 1}. ${guardia.nombre} - ${guardia.instalacion_asignada || 'Sin asignar'} - ${guardia.rol_actual || 'Sin rol'}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testApiGuardias();
