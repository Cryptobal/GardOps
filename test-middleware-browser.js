// Script para probar el middleware desde el navegador
console.log('🧪 Probando middleware desde el navegador...');

// Función para probar la API
async function testMiddleware() {
  try {
    console.log('📡 Haciendo petición a /api/test-middleware...');
    
    const response = await fetch('/api/test-middleware', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Status:', response.status);
    console.log('📊 Headers recibidos:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`Error en la respuesta: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📊 Respuesta:', result);

    if (result.userEmail) {
      console.log('✅ Middleware funcionando correctamente');
      console.log(`   Email del usuario: ${result.userEmail}`);
    } else {
      console.log('❌ Middleware no está agregando el header x-user-email');
    }

    return result;
  } catch (error) {
    console.error('❌ Error probando middleware:', error);
    throw error;
  }
}

// Función para probar la API de roles
async function testRolesAPI() {
  try {
    console.log('\n📡 Haciendo petición a /api/roles-servicio...');
    
    const response = await fetch('/api/roles-servicio', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Status:', response.status);
    console.log('📊 Headers recibidos:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`Error en la respuesta: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📊 Respuesta:', result);

    if (result.success && result.data) {
      console.log('✅ API de roles funcionando correctamente');
      console.log(`   Roles encontrados: ${result.data.length}`);
      result.data.forEach((rol, index) => {
        console.log(`   ${index + 1}. ${rol.nombre} (${rol.estado})`);
      });
    } else {
      console.log('❌ API de roles no está devolviendo datos correctamente');
      console.log('   Error:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ Error probando API de roles:', error);
    throw error;
  }
}

// Ejecutar las pruebas
console.log('🚀 Iniciando pruebas...\n');

testMiddleware()
  .then(() => testRolesAPI())
  .then(() => console.log('\n✅ Todas las pruebas completadas'))
  .catch(error => console.error('\n❌ Error en las pruebas:', error));
