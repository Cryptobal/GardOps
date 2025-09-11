// ===============================================
// SCRIPT DE TESTING PARA VERIFICAR RESPUESTA DE API
// ===============================================

const fetch = require('node-fetch');

async function testAPIResponse() {
  try {
    console.log('🔍 Probando API de pauta mensual...');
    
    const response = await fetch('http://localhost:3000/api/pauta-mensual?instalacion_id=903edee6-6964-42b8-bcc4-14d23d4bbe1b&anio=2025&mes=9');
    
    if (!response.ok) {
      console.log('❌ Error en la API:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.length > 0) {
      const firstPuesto = data.data[0];
      console.log('✅ API responde correctamente');
      console.log('📊 Campos disponibles en el primer puesto:');
      console.log(Object.keys(firstPuesto));
      
      if (firstPuesto.estados_detallados) {
        console.log('✅ Campo estados_detallados está presente');
        console.log('📋 Primeros 3 estados detallados:');
        console.log(firstPuesto.estados_detallados.slice(0, 3));
      } else {
        console.log('❌ Campo estados_detallados NO está presente');
      }
      
      if (firstPuesto.dias) {
        console.log('✅ Campo dias está presente');
        console.log('📋 Primeros 5 días:', firstPuesto.dias.slice(0, 5));
      }
    } else {
      console.log('❌ API no devuelve datos válidos');
    }
    
  } catch (error) {
    console.log('❌ Error al probar API:', error.message);
  }
}

testAPIResponse();
