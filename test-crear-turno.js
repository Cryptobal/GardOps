require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function testCrearTurno() {
  try {
    console.log('🧪 PROBANDO CREACIÓN DE TURNO');
    console.log('==============================');
    
    // Datos de prueba
    const instalacionId = '19e4dfc1-f7de-433e-976f-4a23f1d1d47e'; // Chañaral
    const rolServicioId = 'fa94add7-fe42-41fe-9ee7-e13aa8cf1298'; // D 4x4x12 08:00 20:00
    const cantidadGuardias = 2;
    
    console.log(`📋 Datos de prueba:`);
    console.log(`   Instalación ID: ${instalacionId}`);
    console.log(`   Rol Servicio ID: ${rolServicioId}`);
    console.log(`   Cantidad Guardias: ${cantidadGuardias}`);
    
    const payload = {
      rol_servicio_id: rolServicioId,
      cantidad_guardias: cantidadGuardias
    };
    
    console.log(`\n📡 Enviando POST a /api/instalaciones/${instalacionId}/turnos_v2`);
    console.log(`Payload:`, JSON.stringify(payload, null, 2));
    
    const response = await fetch(`http://localhost:3000/api/instalaciones/${instalacionId}/turnos_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'carlos.irigoyen@gard.cl'
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`\n📊 Respuesta:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`   Body: ${responseText}`);
    
    if (response.ok) {
      console.log('\n✅ ¡Turno creado exitosamente!');
    } else {
      console.log('\n❌ Error creando turno');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCrearTurno();
