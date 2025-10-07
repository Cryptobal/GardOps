require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function testRolesAPI() {
  try {
    console.log('🧪 PROBANDO API DE ROLES');
    console.log('=========================');
    
    // Simular headers de usuario autenticado
    const headers = {
      'Content-Type': 'application/json',
      'x-user-email': 'carlos.irigoyen@gard.cl' // Usuario admin
    };
    
    console.log('\n📡 Probando GET /api/admin/rbac/roles');
    console.log('Headers:', headers);
    
    const response = await fetch('http://localhost:3000/api/admin/rbac/roles', {
      method: 'GET',
      headers: headers
    });
    
    console.log(`\n📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Respuesta exitosa:');
      console.log('Items:', data.items?.length || 0);
      
      if (data.items && data.items.length > 0) {
        console.log('\n📋 Roles obtenidos:');
        data.items.forEach((role, index) => {
          console.log(`   ${index + 1}. ${role.nombre} (ID: ${role.id})`);
          if (role.descripcion) {
            console.log(`      📝 ${role.descripcion}`);
          }
        });
        
        // Verificar si hay duplicados
        const nombres = data.items.map(r => r.nombre);
        const duplicados = nombres.filter((nombre, index) => nombres.indexOf(nombre) !== index);
        
        if (duplicados.length > 0) {
          console.log('\n⚠️  Roles duplicados encontrados:');
          duplicados.forEach(dup => {
            console.log(`   🔄 ${dup}`);
          });
        } else {
          console.log('\n✅ No hay roles duplicados en la respuesta de la API');
        }
        
      } else {
        console.log('\n⚠️  No se obtuvieron roles de la API');
      }
      
    } else {
      const errorText = await response.text();
      console.log('\n❌ Error en la respuesta:');
      console.log('Status:', response.status);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      console.log('Body:', errorText);
    }
    
    // Probar también con usuario central
    console.log('\n\n📡 Probando con usuario central@gard.cl');
    const headersCentral = {
      'Content-Type': 'application/json',
      'x-user-email': 'central@gard.cl'
    };
    
    const responseCentral = await fetch('http://localhost:3000/api/admin/rbac/roles', {
      method: 'GET',
      headers: headersCentral
    });
    
    console.log(`📊 Status: ${responseCentral.status} ${responseCentral.statusText}`);
    
    if (responseCentral.ok) {
      const dataCentral = await responseCentral.json();
      console.log('✅ Respuesta exitosa para central@gard.cl');
      console.log('Items:', dataCentral.items?.length || 0);
      
      if (dataCentral.items && dataCentral.items.length > 0) {
        console.log('\n📋 Roles disponibles para central@gard.cl:');
        dataCentral.items.forEach((role, index) => {
          console.log(`   ${index + 1}. ${role.nombre} (ID: ${role.id})`);
        });
      }
    } else {
      const errorText = await responseCentral.text();
      console.log('\n❌ Error para central@gard.cl:');
      console.log('Status:', responseCentral.status);
      console.log('Body:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRolesAPI();
