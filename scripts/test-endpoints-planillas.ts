const BASE_URL = 'http://localhost:3000';

async function login() {
  console.log('🔐 Haciendo login...');
  
  // Intentar con diferentes credenciales
  const credentials = [
    { email: 'admin@gardops.com', password: 'admin123' },
    { email: 'carlos.irigoyen@gard.cl', password: 'admin123' },
    { email: 'admin@demo.cl', password: 'demo123' }
  ];

  for (const cred of credentials) {
    console.log(`🔑 Probando con: ${cred.email}`);
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cred),
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login exitoso con:', cred.email);
      
      // Obtener las cookies de la respuesta
      const cookies = loginResponse.headers.get('set-cookie');
      console.log('🍪 Cookies recibidas:', cookies ? 'SÍ' : 'NO');
      
      return cookies;
    } else {
      const error = await loginResponse.json();
      console.log('❌ Error con', cred.email, ':', error.error);
    }
  }
  
  console.log('❌ No se pudo hacer login con ninguna credencial');
  return null;
}

async function testEndpoints() {
  console.log('🧪 Probando endpoints de planillas...\n');

  try {
    // 1. Hacer login primero
    const cookies = await login();
    if (!cookies) {
      console.log('❌ No se pudo hacer login, abortando pruebas');
      return;
    }

    // 2. Obtener planillas con autenticación
    console.log('\n1️⃣ Probando GET /api/pauta-diaria/turno-extra/planillas');
    const response1 = await fetch(`${BASE_URL}/api/pauta-diaria/turno-extra/planillas`, {
      headers: {
        'Cookie': cookies
      }
    });
    console.log('Status:', response1.status);
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Planillas obtenidas:', data1.planillas?.length || 0, 'planillas');
      
      if (data1.planillas && data1.planillas.length > 0) {
        const planilla = data1.planillas[0];
        console.log('📋 Primera planilla:', {
          id: planilla.id,
          codigo: planilla.codigo,
          estado: planilla.estado,
          monto_total: planilla.monto_total
        });

        // 3. Probar descargar planilla
        console.log('\n2️⃣ Probando GET /api/pauta-diaria/turno-extra/planillas/' + planilla.id + '/descargar');
        const response2 = await fetch(`${BASE_URL}/api/pauta-diaria/turno-extra/planillas/${planilla.id}/descargar`, {
          headers: {
            'Cookie': cookies
          }
        });
        console.log('Status:', response2.status);
        if (response2.ok) {
          console.log('✅ Descarga exitosa');
          console.log('Content-Type:', response2.headers.get('content-type'));
          console.log('Content-Disposition:', response2.headers.get('content-disposition'));
        } else {
          const error2 = await response2.json();
          console.log('❌ Error descargando:', error2);
        }

        // 4. Probar marcar como pagada (solo si está pendiente)
        if (planilla.estado === 'pendiente') {
          console.log('\n3️⃣ Probando POST /api/pauta-diaria/turno-extra/planillas/' + planilla.id + '/marcar-pagada');
          const response3 = await fetch(`${BASE_URL}/api/pauta-diaria/turno-extra/planillas/${planilla.id}/marcar-pagada`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': cookies
            },
          });
          console.log('Status:', response3.status);
          if (response3.ok) {
            const data3 = await response3.json();
            console.log('✅ Marcada como pagada:', data3);
          } else {
            const error3 = await response3.json();
            console.log('❌ Error marcando como pagada:', error3);
          }
        } else {
          console.log('\n3️⃣ Saltando prueba de marcar como pagada (planilla ya está pagada)');
        }
      } else {
        console.log('⚠️ No hay planillas para probar');
      }
    } else {
      const error1 = await response1.json();
      console.log('❌ Error obteniendo planillas:', error1);
    }

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

testEndpoints();
