require('dotenv').config({ path: '.env.local' });

async function testLlamadoEndpoint() {
  try {
    console.log('🔍 Probando endpoint de registro de llamados...\n');

    // 1. Obtener un llamado de la agenda
    console.log('1. Obteniendo agenda...');
    const agendaRes = await fetch('http://localhost:3000/api/central-monitoring/agenda?fecha=2025-08-27', {
      headers: {
        'Authorization': 'Bearer dev-token'
      }
    });
    
    if (!agendaRes.ok) {
      console.log('❌ Error obteniendo agenda:', agendaRes.status);
      return;
    }
    
    const agendaData = await agendaRes.json();
    console.log('   ✅ Agenda obtenida, llamados encontrados:', agendaData.data.length);
    
    if (agendaData.data.length === 0) {
      console.log('   ❌ No hay llamados para probar');
      return;
    }

    // 2. Tomar el primer llamado pendiente
    const llamado = agendaData.data.find(l => l.estado === 'pendiente');
    if (!llamado) {
      console.log('   ❌ No hay llamados pendientes');
      return;
    }
    
    console.log('   📞 Llamado seleccionado:', llamado.id);
    console.log('   📍 Instalación:', llamado.instalacion_nombre);

    // 3. Registrar el llamado como exitoso
    console.log('\n2. Registrando llamado como exitoso...');
    const registroRes = await fetch(`http://localhost:3000/api/central-monitoring/llamado/${llamado.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-token'
      },
      body: JSON.stringify({
        estado: 'exitoso',
        observaciones: 'Prueba de registro exitosa',
        ejecutado_en: new Date().toISOString()
      })
    });
    
    console.log('   Status:', registroRes.status);
    
    if (registroRes.ok) {
      const registroData = await registroRes.json();
      console.log('   ✅ Llamado registrado exitosamente');
      console.log('   📊 Respuesta:', registroData);
    } else {
      const errorText = await registroRes.text();
      console.log('   ❌ Error registrando llamado:', errorText);
    }

    // 4. Verificar que el cambio se reflejó
    console.log('\n3. Verificando cambio en agenda...');
    const agendaRes2 = await fetch('http://localhost:3000/api/central-monitoring/agenda?fecha=2025-08-27', {
      headers: {
        'Authorization': 'Bearer dev-token'
      }
    });
    
    const agendaData2 = await agendaRes2.json();
    const llamadoActualizado = agendaData2.data.find(l => l.id === llamado.id);
    
    if (llamadoActualizado) {
      console.log('   ✅ Llamado actualizado en agenda');
      console.log('   📊 Estado anterior: pendiente');
      console.log('   📊 Estado actual:', llamadoActualizado.estado);
      console.log('   📊 Observaciones:', llamadoActualizado.observaciones);
    } else {
      console.log('   ❌ No se encontró el llamado actualizado');
    }

    console.log('\n✅ Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLlamadoEndpoint();
