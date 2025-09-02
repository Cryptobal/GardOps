// Script para verificar que la API de guardias funcione en producción
const https = require('https');
const http = require('http');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js Test Script',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function verificarAPIGuardias() {
  console.log('🔍 Verificando API de guardias en producción...\n');
  
  // Obtener la URL base desde variables de entorno o usar localhost para desarrollo
  const baseURL = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.BASE_URL || 'http://localhost:3000';
  
  console.log(`📡 Base URL: ${baseURL}`);
  
  const endpoints = [
    { 
      name: 'Lista de guardias', 
      url: `${baseURL}/api/guardias`,
      expectedStatus: [200, 401, 403] // Puede ser 401/403 si no hay auth
    },
    { 
      name: 'Permisos RBAC', 
      url: `${baseURL}/api/rbac/can?perm=guardias.view`,
      expectedStatus: [200, 401, 403, 500]
    },
    { 
      name: 'Permisos Legacy', 
      url: `${baseURL}/api/me/permissions?perm=guardias.view`,
      expectedStatus: [200, 401, 403, 500]
    },
    {
      name: 'Estado de la base de datos',
      url: `${baseURL}/api/database-status`,
      expectedStatus: [200, 500]
    }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🧪 Probando: ${endpoint.name}`);
      console.log(`   URL: ${endpoint.url}`);
      
      const result = await makeRequest(endpoint.url);
      
      console.log(`   Status: ${result.status}`);
      
      if (endpoint.expectedStatus.includes(result.status)) {
        console.log(`   ✅ Status esperado`);
      } else {
        console.log(`   ⚠️  Status inesperado (esperado: ${endpoint.expectedStatus.join(', ')})`);
      }
      
      if (typeof result.data === 'object') {
        console.log(`   Respuesta: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`);
      } else {
        console.log(`   Respuesta: ${result.data.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n📋 Resumen de verificación:');
  console.log('   - Si todos los endpoints devuelven 401/403: Problema de autenticación');
  console.log('   - Si /api/guardias devuelve 500: Problema en la base de datos o permisos');
  console.log('   - Si /api/rbac/can devuelve 500: Problema con la función de permisos');
  console.log('   - Si /api/database-status devuelve 500: Problema de conexión a BD');
}

async function verificarVariablesEntorno() {
  console.log('\n🔧 Verificando variables de entorno críticas:');
  
  const variables = [
    'DATABASE_URL',
    'POSTGRES_URL', 
    'JWT_SECRET',
    'NODE_ENV',
    'VERCEL',
    'VERCEL_ENV',
    'VERCEL_URL'
  ];
  
  variables.forEach(variable => {
    const valor = process.env[variable];
    if (valor) {
      // Ocultar valores sensibles
      const esSensible = ['DATABASE_URL', 'POSTGRES_URL', 'JWT_SECRET'].includes(variable);
      const valorMostrar = esSensible ? `${valor.substring(0, 10)}...` : valor;
      console.log(`   ${variable}: ✅ ${valorMostrar}`);
    } else {
      console.log(`   ${variable}: ❌ No configurada`);
    }
  });
}

async function generarSolucionesRecomendadas() {
  console.log('\n💡 Soluciones recomendadas:');
  
  console.log('\n1️⃣ Verificar configuración en Vercel:');
  console.log('   - Ir a dashboard de Vercel → Settings → Environment Variables');
  console.log('   - Verificar que DATABASE_URL esté configurada');
  console.log('   - Verificar que JWT_SECRET esté configurada');
  
  console.log('\n2️⃣ Verificar base de datos:');
  console.log('   - Conectarse a la BD y verificar que existan las tablas:');
  console.log('     * usuarios, roles, permisos, roles_permisos');
  console.log('     * guardias o rrhh_guardias');
  console.log('   - Verificar que exista la función fn_usuario_tiene_permiso');
  
  console.log('\n3️⃣ Verificar logs de Vercel:');
  console.log('   - Ir a dashboard de Vercel → Functions → Ver logs');
  console.log('   - Buscar errores relacionados con permisos o base de datos');
  
  console.log('\n4️⃣ Aplicar bypass temporal:');
  console.log('   - El archivo src/lib/permissions.ts ya tiene un bypass para guardias');
  console.log('   - Esto debería permitir acceso temporal mientras se arreglan los permisos');
  
  console.log('\n5️⃣ Ejecutar migración de permisos:');
  console.log('   - Usar el script fix-guardias-produccion.js para generar la migración SQL');
  console.log('   - Ejecutar la migración en la base de datos de producción');
}

// Ejecutar verificación completa
if (require.main === module) {
  (async () => {
    try {
      await verificarVariablesEntorno();
      await verificarAPIGuardias();
      await generarSolucionesRecomendadas();
      
      console.log('\n✅ Verificación completada');
      
    } catch (error) {
      console.error('❌ Error durante la verificación:', error);
    }
  })();
}

module.exports = {
  verificarAPIGuardias,
  verificarVariablesEntorno,
  generarSolucionesRecomendadas
};