// Usar fetch nativo de Node.js

async function testAPIs() {
  console.log('🧪 Probando APIs de Asignaciones...\n');

  const baseUrl = 'http://localhost:3000';
  const tenantId = 'default-tenant-id'; // Usar el tenant por defecto

  try {
    // Probar API de guardias
    console.log('📋 Probando API de guardias...');
    const guardiasResponse = await fetch(`${baseUrl}/api/guardias-con-coordenadas?tenantId=${tenantId}`);
    const guardiasData = await guardiasResponse.json();
    
    console.log('Status:', guardiasResponse.status);
    console.log('Success:', guardiasData.success);
    console.log('Guardias encontrados:', guardiasData.data?.length || 0);
    
    if (guardiasData.data && guardiasData.data.length > 0) {
      console.log('Ejemplo guardia:', {
        id: guardiasData.data[0].id,
        nombre: guardiasData.data[0].nombre,
        rut: guardiasData.data[0].rut,
        direccion: guardiasData.data[0].direccion
      });
    }
    console.log('');

    // Probar API de instalaciones
    console.log('🏢 Probando API de instalaciones...');
    const instalacionesResponse = await fetch(`${baseUrl}/api/instalaciones-con-coordenadas?tenantId=${tenantId}`);
    const instalacionesData = await instalacionesResponse.json();
    
    console.log('Status:', instalacionesResponse.status);
    console.log('Success:', instalacionesData.success);
    console.log('Instalaciones encontradas:', instalacionesData.data?.length || 0);
    
    if (instalacionesData.data && instalacionesData.data.length > 0) {
      console.log('Ejemplo instalación:', {
        id: instalacionesData.data[0].id,
        nombre: instalacionesData.data[0].nombre,
        direccion: instalacionesData.data[0].direccion,
        cliente_nombre: instalacionesData.data[0].cliente_nombre
      });
    }
    console.log('');

    // Resumen
    console.log('📊 RESUMEN:');
    console.log(`✅ Guardias: ${guardiasData.data?.length || 0}`);
    console.log(`✅ Instalaciones: ${instalacionesData.data?.length || 0}`);
    
    if ((guardiasData.data?.length || 0) === 0) {
      console.log('⚠️  No se encontraron guardias. Verificar:');
      console.log('   - Que existan guardias en la base de datos');
      console.log('   - Que tengan coordenadas (latitud/longitud)');
      console.log('   - Que estén activos');
      console.log('   - Que tengan dirección');
    }
    
    if ((instalacionesData.data?.length || 0) === 0) {
      console.log('⚠️  No se encontraron instalaciones. Verificar:');
      console.log('   - Que existan instalaciones en la base de datos');
      console.log('   - Que tengan coordenadas (latitud/longitud)');
      console.log('   - Que estén activas');
      console.log('   - Que tengan dirección');
    }

  } catch (error) {
    console.error('❌ Error probando APIs:', error.message);
  }
}

// Ejecutar la prueba
testAPIs(); 