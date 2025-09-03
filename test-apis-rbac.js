#!/usr/bin/env node

/**
 * Script para probar las APIs RBAC y verificar que funcionen correctamente
 * Ejecutar: node test-apis-rbac.js
 */

const https = require('https');

const BASE_URL = 'https://ops.gard.cl/api';
const USER_EMAIL = 'carlos.irigoyen@gard.cl';

// Función para hacer peticiones HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Función para probar una API
async function testAPI(endpoint, method = 'GET', body = null) {
  console.log(`\n🔍 Probando ${method} ${endpoint}...`);
  
  try {
    const options = {
      method: method,
      headers: {
        'x-user-email': USER_EMAIL,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await makeRequest(`${BASE_URL}${endpoint}`, options);
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      if (response.data.ok) {
        console.log(`   📊 Datos recibidos: ${response.data.items ? response.data.items.length : 'N/A'} items`);
      }
    } else {
      console.log(`❌ ${endpoint} - Status: ${response.status}`);
      console.log(`   📝 Error: ${response.data.error || 'Error desconocido'}`);
      if (response.data.debug) {
        console.log(`   🐛 Debug: ${JSON.stringify(response.data.debug)}`);
      }
    }
    
    return response;
  } catch (error) {
    console.log(`❌ ${endpoint} - Error de conexión: ${error.message}`);
    return null;
  }
}

// Función principal
async function main() {
  console.log('🧪 PROBANDO APIS RBAC');
  console.log('========================');
  console.log(`📧 Usuario: ${USER_EMAIL}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  
  // Probar APIs RBAC
  await testAPI('/admin/rbac/usuarios');
  await testAPI('/admin/rbac/roles');
  await testAPI('/admin/rbac/permisos');
  await testAPI('/admin/tenants');
  
  // Probar API de verificación de Carlos
  await testAPI('/admin/verificar-carlos');
  
  console.log('\n🎯 PRUEBAS COMPLETADAS');
  console.log('========================');
  console.log('Si todas las APIs devuelven 200/201, el sistema RBAC está funcionando correctamente.');
  console.log('Si alguna devuelve 401, verifica que Carlos tenga el rol Super Admin asignado.');
  console.log('Si alguna devuelve 403, verifica los permisos del rol Super Admin.');
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAPI, makeRequest };
