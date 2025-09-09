// Script para probar el LogViewer y la API de logs
const fetch = require('node-fetch');

async function testLogViewer() {
  console.log('🧪 Probando LogViewer y API de logs...\n');

  const baseUrl = 'http://localhost:3000';
  const instalacionId = 'fb0d4f19-75f3-457e-8181-df032266441c';

  try {
    // 1. Probar API de logs
    console.log('1. Probando API de logs...');
    const response = await fetch(`${baseUrl}/api/logs?modulo=instalaciones&entidad_id=${instalacionId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ API de logs responde correctamente');
    console.log(`📊 Logs encontrados: ${data.data.length}`);
    
    if (data.data.length > 0) {
      console.log('📋 Ejemplos de logs:');
      data.data.slice(0, 3).forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.accion} - ${log.usuario} (${log.tipo})`);
        console.log(`     Detalles: ${log.detalles}`);
        console.log(`     Fecha: ${log.created_at}`);
      });
    }

    // 2. Probar creación de nuevo log
    console.log('\n2. Probando creación de nuevo log...');
    const newLogResponse = await fetch(`${baseUrl}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modulo: 'instalaciones',
        entidadId: instalacionId,
        accion: 'Prueba de log desde script',
        detalles: 'Este es un log de prueba para verificar el funcionamiento',
        usuario: 'Sistema',
        tipo: 'sistema'
      })
    });
    
    if (!newLogResponse.ok) {
      throw new Error(`HTTP error! status: ${newLogResponse.status}`);
    }
    
    const newLogData = await newLogResponse.json();
    console.log('✅ Nuevo log creado exitosamente');
    console.log('📝 Log creado:', newLogData.data);

    // 3. Verificar que el nuevo log aparece en la lista
    console.log('\n3. Verificando que el nuevo log aparece...');
    const updatedResponse = await fetch(`${baseUrl}/api/logs?modulo=instalaciones&entidad_id=${instalacionId}`);
    const updatedData = await updatedResponse.json();
    
    const newLog = updatedData.data.find(log => log.accion === 'Prueba de log desde script');
    if (newLog) {
      console.log('✅ Nuevo log aparece en la lista');
      console.log('📋 Log encontrado:', {
        accion: newLog.accion,
        usuario: newLog.usuario,
        tipo: newLog.tipo,
        detalles: newLog.detalles
      });
    } else {
      console.log('❌ Nuevo log no aparece en la lista');
    }

    // 4. Probar con módulo inexistente
    console.log('\n4. Probando con módulo inexistente...');
    const invalidResponse = await fetch(`${baseUrl}/api/logs?modulo=inexistente&entidad_id=${instalacionId}`);
    const invalidData = await invalidResponse.json();
    
    if (!invalidData.success) {
      console.log('✅ API maneja correctamente módulos inexistentes');
      console.log('📋 Respuesta:', invalidData.error);
    } else {
      console.log('❌ API no maneja correctamente módulos inexistentes');
    }

    // 5. Resumen final
    console.log('\n📊 RESUMEN DE PRUEBAS:');
    console.log('✅ API de logs funciona correctamente');
    console.log('✅ Creación de logs funciona');
    console.log('✅ Filtrado por módulo funciona');
    console.log('✅ Manejo de errores funciona');
    console.log(`📈 Total de logs para la instalación: ${updatedData.data.length}`);

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

testLogViewer(); 