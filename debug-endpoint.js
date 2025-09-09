require('dotenv').config({ path: '.env.local' });

async function debugEndpoint() {
  try {
    console.log('🔍 Debuggeando endpoint de registro...\n');

    // 1. Obtener un llamado
    console.log('1. Obteniendo llamado...');
    const agendaRes = await fetch('http://localhost:3000/api/central-monitoring/agenda?fecha=2025-08-27', {
      headers: {
        'Authorization': 'Bearer dev-token'
      }
    });
    
    const agendaData = await agendaRes.json();
    const llamado = agendaData.data.find(l => l.estado === 'pendiente');
    
    if (!llamado) {
      console.log('❌ No hay llamados pendientes');
      return;
    }
    
    console.log('   📞 Llamado ID:', llamado.id);

    // 2. Probar con diferentes payloads
    const payloads = [
      {
        name: 'Payload básico',
        data: {
          estado: 'exitoso',
          observaciones: 'Prueba básica',
          ejecutado_en: new Date().toISOString()
        }
      },
      {
        name: 'Payload sin ejecutado_en',
        data: {
          estado: 'exitoso',
          observaciones: 'Prueba sin ejecutado_en'
        }
      },
      {
        name: 'Payload con estado inválido',
        data: {
          estado: 'estado_invalido',
          observaciones: 'Prueba estado inválido'
        }
      }
    ];

    for (const payload of payloads) {
      console.log(`\n2. Probando: ${payload.name}`);
      console.log('   📤 Payload:', JSON.stringify(payload.data, null, 2));
      
      try {
        const res = await fetch(`http://localhost:3000/api/central-monitoring/llamado/${llamado.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer dev-token'
          },
          body: JSON.stringify(payload.data)
        });
        
        console.log('   📊 Status:', res.status);
        console.log('   📊 Headers:', Object.fromEntries(res.headers.entries()));
        
        const responseText = await res.text();
        console.log('   📊 Response:', responseText);
        
        if (res.ok) {
          console.log('   ✅ Éxito');
        } else {
          console.log('   ❌ Error');
        }
      } catch (error) {
        console.log('   💥 Error de red:', error.message);
      }
    }

    console.log('\n✅ Debug completado');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugEndpoint();
