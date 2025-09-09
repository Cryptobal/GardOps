async function testCargaSimultanea() {
  console.log('🧪 Probando carga simultánea de datos...\n');

  const endpoints = [
    'http://localhost:3000/api/instalaciones?withAllData=true',
    'http://localhost:3000/api/clientes',
    'http://localhost:3000/api/guardias'
  ];

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Simular 10 requests simultáneos para cada endpoint
  for (let round = 1; round <= 3; round++) {
    console.log(`🔄 Ronda ${round}/3 - Probando requests simultáneos...`);
    
    const promises = [];
    
    // Crear 10 requests simultáneos para cada endpoint
    for (let i = 0; i < 10; i++) {
      for (const endpoint of endpoints) {
        const promise = fetch(endpoint)
          .then(async (response) => {
            const data = await response.json();
            results.total++;
            
            if (response.ok && data.success) {
              results.success++;
              return { success: true, endpoint, data: data.data?.length || 'N/A' };
            } else {
              results.failed++;
              const error = `Error en ${endpoint}: ${response.status} - ${data.error || 'Error desconocido'}`;
              results.errors.push(error);
              return { success: false, endpoint, error };
            }
          })
          .catch((error) => {
            results.total++;
            results.failed++;
            const errorMsg = `Error de conexión en ${endpoint}: ${error.message}`;
            results.errors.push(errorMsg);
            return { success: false, endpoint, error: errorMsg };
          });
        
        promises.push(promise);
      }
    }

    // Esperar a que todos los requests terminen
    const roundResults = await Promise.all(promises);
    
    // Mostrar resultados de la ronda
    const roundSuccess = roundResults.filter(r => r.success).length;
    const roundFailed = roundResults.filter(r => !r.success).length;
    
    console.log(`   📊 Ronda ${round}: ${roundSuccess} exitosos, ${roundFailed} fallidos`);
    
    // Mostrar algunos errores si los hay
    if (roundFailed > 0) {
      const errors = roundResults.filter(r => !r.success).slice(0, 3);
      errors.forEach(error => {
        console.log(`   ❌ ${error.error}`);
      });
    }
    
    // Pausa entre rondas
    if (round < 3) {
      console.log('   ⏳ Esperando 2 segundos antes de la siguiente ronda...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Resultados finales
  console.log('\n📊 RESULTADOS FINALES:');
  console.log(`   📈 Total de requests: ${results.total}`);
  console.log(`   ✅ Requests exitosos: ${results.success}`);
  console.log(`   ❌ Requests fallidos: ${results.failed}`);
  console.log(`   📊 Tasa de éxito: ${((results.success / results.total) * 100).toFixed(1)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 ¡PROBLEMA RESUELTO! No se detectaron errores en requests simultáneos.');
  } else {
    console.log('\n⚠️  Aún se detectaron algunos errores:');
    results.errors.slice(0, 5).forEach(error => {
      console.log(`   ❌ ${error}`);
    });
  }

  // Verificar que los datos se cargan correctamente
  console.log('\n🔍 Verificando calidad de datos...');
  
  try {
    const instalacionesResponse = await fetch('http://localhost:3000/api/instalaciones?withAllData=true');
    const instalacionesData = await instalacionesResponse.json();
    
    if (instalacionesData.success && instalacionesData.data.instalaciones) {
      console.log(`   📊 Instalaciones cargadas: ${instalacionesData.data.instalaciones.length}`);
      console.log(`   📊 Clientes cargados: ${instalacionesData.data.clientes.length}`);
      console.log(`   📊 Comunas cargadas: ${instalacionesData.data.comunas.length}`);
    }
    
    const guardiasResponse = await fetch('http://localhost:3000/api/guardias');
    const guardiasData = await guardiasResponse.json();
    
    if (guardiasData.success && guardiasData.guardias) {
      console.log(`   📊 Guardias cargados: ${guardiasData.guardias.length}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error verificando datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

testCargaSimultanea().catch(console.error); 