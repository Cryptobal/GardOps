// Usar fetch nativo de Node.js (disponible desde Node.js 18+)

async function testAPIs() {
  console.log('🔍 Probando APIs de UF y UTM desde la CMF...\n');

  // URLs de las APIs de la CMF
  const ufUrl = 'https://api.cmfchile.cl/api-sbifv3/recursos_api/uf?apikey=9c84db4d447c80f3c8b5c8b5c8b5c8b5&formato=json';
  const utmUrl = 'https://api.cmfchile.cl/api-sbifv3/recursos_api/utm?apikey=9c84db4d447c80f3c8b5c8b5c8b5c8b5&formato=json';

  try {
    // Probar API UF
    console.log('📊 Probando API UF...');
    const ufResponse = await fetch(ufUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000
    });

    if (ufResponse.ok) {
      const ufData = await ufResponse.json();
      console.log('✅ API UF - Respuesta exitosa:');
      console.log('   URL:', ufUrl);
      console.log('   Status:', ufResponse.status);
      console.log('   Datos:', JSON.stringify(ufData, null, 2));
    } else {
      console.log('❌ API UF - Error HTTP:', ufResponse.status);
      console.log('   URL:', ufUrl);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Probar API UTM
    console.log('📈 Probando API UTM...');
    const utmResponse = await fetch(utmUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000
    });

    if (utmResponse.ok) {
      const utmData = await utmResponse.json();
      console.log('✅ API UTM - Respuesta exitosa:');
      console.log('   URL:', utmUrl);
      console.log('   Status:', utmResponse.status);
      console.log('   Datos:', JSON.stringify(utmData, null, 2));
    } else {
      console.log('❌ API UTM - Error HTTP:', utmResponse.status);
      console.log('   URL:', utmUrl);
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar la prueba
testAPIs();
