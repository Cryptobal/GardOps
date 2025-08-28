require('dotenv').config({ path: '.env.local' });

async function testAPIEndpoints() {
  try {
    console.log('🔍 Probando endpoints de Central Monitoring...\n');
    
    // 1. Probar endpoint de contactos disponibles
    console.log('1. Probando /api/central-monitoring/contactos-disponibles...');
    try {
      const contactosRes = await fetch('http://localhost:3000/api/central-monitoring/contactos-disponibles?fecha=2025-08-27', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dev-token'
        }
      });
      
      console.log('   Status:', contactosRes.status);
      if (contactosRes.ok) {
        const data = await contactosRes.json();
        console.log('   ✅ Éxito:', data.success ? 'Sí' : 'No');
        if (data.success) {
          console.log('   📊 Contactos encontrados:', data.data?.length || 0);
        } else {
          console.log('   ❌ Error:', data.error);
        }
      } else {
        const errorText = await contactosRes.text();
        console.log('   ❌ Error HTTP:', errorText);
      }
    } catch (error) {
      console.log('   💥 Error de red:', error.message);
    }
    
    console.log('');
    
    // 2. Probar endpoint de agenda
    console.log('2. Probando /api/central-monitoring/agenda...');
    try {
      const agendaRes = await fetch('http://localhost:3000/api/central-monitoring/agenda?fecha=2025-08-27', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dev-token'
        }
      });
      
      console.log('   Status:', agendaRes.status);
      if (agendaRes.ok) {
        const data = await agendaRes.json();
        console.log('   ✅ Éxito:', data.success ? 'Sí' : 'No');
        if (data.success) {
          console.log('   📊 Llamados encontrados:', data.data?.length || 0);
        } else {
          console.log('   ❌ Error:', data.error);
        }
      } else {
        const errorText = await agendaRes.text();
        console.log('   ❌ Error HTTP:', errorText);
      }
    } catch (error) {
      console.log('   💥 Error de red:', error.message);
    }
    
    console.log('');
    
    // 3. Probar endpoint de flags (si existe)
    console.log('3. Probando /api/flags...');
    try {
      const flagsRes = await fetch('http://localhost:3000/api/flags', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   Status:', flagsRes.status);
      if (flagsRes.ok) {
        const data = await flagsRes.json();
        console.log('   ✅ Éxito:', data.success ? 'Sí' : 'No');
      } else {
        const errorText = await flagsRes.text();
        console.log('   ❌ Error HTTP:', errorText);
      }
    } catch (error) {
      console.log('   💥 Error de red:', error.message);
    }
    
    console.log('\n✅ Pruebas completadas');
    
  } catch (error) {
    console.error('💥 Error general:', error.message);
  }
}

testAPIEndpoints();
