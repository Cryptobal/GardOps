#!/usr/bin/env node

/**
 * Script para verificar que el fix del frontend esté funcionando
 * Ejecutar: node verificar-fix-frontend.js
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
        if (response.data.items) {
          console.log(`   📊 Datos recibidos: ${response.data.items.length} items`);
        } else if (response.data.data) {
          console.log(`   📊 Datos recibidos: ${response.data.data.length || 'N/A'} items`);
        }
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

// Función para verificar el estado de Carlos
async function verificarCarlos() {
  console.log('\n👤 Verificando estado de Carlos Irigoyen...');
  
  try {
    const response = await testAPI('/admin/verificar-carlos');
    
    if (response && response.status === 200) {
      if (response.data.necesitaRol) {
        console.log('⚠️  Carlos necesita rol asignado. Asignando...');
        
        // Asignar rol Super Admin
        const asignacionResponse = await makeRequest(`${BASE_URL}/admin/verificar-carlos`, {
          method: 'POST',
          headers: {
            'x-user-email': USER_EMAIL,
            'Content-Type': 'application/json'
          }
        });
        
        if (asignacionResponse.status === 200) {
          console.log('✅ Rol Super Admin asignado exitosamente');
        } else {
          console.log('❌ Error asignando rol');
        }
      } else {
        console.log('✅ Carlos ya tiene rol asignado');
      }
    }
  } catch (error) {
    console.log('❌ Error verificando estado de Carlos:', error.message);
  }
}

// Función principal
async function main() {
  console.log('🚀 VERIFICANDO FIX DEL FRONTEND');
  console.log('=================================');
  console.log(`📧 Usuario: ${USER_EMAIL}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`⏰ Fecha: ${new Date().toLocaleString('es-CL')}`);
  
  // Verificar estado de Carlos primero
  await verificarCarlos();
  
  // Probar todas las APIs RBAC
  console.log('\n🧪 PROBANDO APIS RBAC DESPUÉS DEL FIX');
  console.log('========================================');
  
  await testAPI('/admin/rbac/usuarios');
  await testAPI('/admin/rbac/roles');
  await testAPI('/admin/rbac/permisos');
  await testAPI('/admin/tenants');
  
  console.log('\n🎯 VERIFICACIÓN COMPLETADA');
  console.log('============================');
  console.log('✅ Si todas las APIs devuelven 200/201: El fix del frontend está funcionando');
  console.log('❌ Si alguna devuelve 401: El problema persiste, revisar logs del frontend');
  console.log('❌ Si alguna devuelve 403: Verificar permisos del rol Super Admin');
  console.log('❌ Si alguna devuelve 500: Error interno, revisar logs del backend');
  
  console.log('\n🔍 PARA VERIFICAR EN EL FRONTEND:');
  console.log('1. Ir a https://ops.gard.cl/configuracion/seguridad');
  console.log('2. Verificar que se muestren usuarios, roles, permisos y tenants');
  console.log('3. Revisar consola del navegador para confirmar que no hay errores 401');
  console.log('4. Si persisten errores, ejecutar el script debug-auth-frontend.js en la consola del navegador');
  
  console.log('\n📋 CAMBIOS IMPLEMENTADOS:');
  console.log('- rbacClient ahora obtiene x-user-email del usuario autenticado en producción');
  console.log('- apiClient ahora obtiene x-user-email del usuario autenticado en producción');
  console.log('- Fallbacks para cookies, localStorage y JWT tokens');
  console.log('- Logging detallado para debugging');
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAPI, makeRequest, verificarCarlos };
