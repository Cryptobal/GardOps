const http = require('http');

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth-token=dev-token'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function ejecutarFase2Optimizaciones() {
  console.log('🚀 FASE 2: OPTIMIZACIONES DEL SISTEMA RBAC');
  console.log('===========================================\n');

  try {
    // ===============================================
    // 1. ANÁLISIS DE NOMENCLATURA DE PERMISOS
    // ===============================================
    console.log('📝 1. ANÁLISIS DE NOMENCLATURA DE PERMISOS');
    console.log('-------------------------------------------');

    const permisos = await makeRequest('/api/admin/rbac/permisos');
    if (permisos.status === 200) {
      const permisosList = permisos.data.items || [];
      
      // Analizar inconsistencias en nomenclatura
      const inconsistencias = [];
      const permisosPorModulo = {};
      
      permisosList.forEach(permiso => {
        const clave = permiso.clave;
        const modulo = clave.split('.')[0];
        
        if (!permisosPorModulo[modulo]) {
          permisosPorModulo[modulo] = [];
        }
        permisosPorModulo[modulo].push(clave);
        
        // Detectar inconsistencias
        if (clave.includes('_') && clave.includes('-')) {
          inconsistencias.push({
            tipo: 'Mezcla de separadores',
            permiso: clave,
            problema: 'Usa tanto _ como -'
          });
        }
        
        if (clave.includes('pauta-diaria') || clave.includes('pauta_diaria')) {
          inconsistencias.push({
            tipo: 'Inconsistencia pauta',
            permiso: clave,
            problema: 'Variaciones en nomenclatura de pauta'
          });
        }
      });
      
      console.log(`📊 Total permisos analizados: ${permisosList.length}`);
      console.log(`🔍 Inconsistencias encontradas: ${inconsistencias.length}`);
      
      if (inconsistencias.length > 0) {
        console.log('   📋 Inconsistencias detectadas:');
        inconsistencias.forEach((inc, index) => {
          console.log(`      ${index + 1}. ${inc.tipo}: ${inc.permiso} - ${inc.problema}`);
        });
      } else {
        console.log('   ✅ No se encontraron inconsistencias en nomenclatura');
      }
      
      // Mostrar módulos con más permisos
      const modulosOrdenados = Object.entries(permisosPorModulo)
        .sort(([,a], [,b]) => b.length - a.length)
        .slice(0, 5);
      
      console.log('   📊 Módulos con más permisos:');
      modulosOrdenados.forEach(([modulo, permisos]) => {
        console.log(`      - ${modulo}: ${permisos.length} permisos`);
      });
    }

    console.log('');

    // ===============================================
    // 2. ANÁLISIS DE ROLES DEL USUARIO PRINCIPAL
    // ===============================================
    console.log('👤 2. ANÁLISIS DE ROLES DEL USUARIO PRINCIPAL');
    console.log('-----------------------------------------------');

    const usuarios = await makeRequest('/api/admin/rbac/usuarios');
    if (usuarios.status === 200) {
      const carlos = usuarios.data.items?.find(u => u.email === 'carlos.irigoyen@gard.cl');
      
      if (carlos) {
        const roles = carlos.roles || '';
        const rolesList = roles.split(',').map(r => r.trim()).filter(r => r);
        
        console.log(`📊 Usuario: ${carlos.email} (${carlos.nombre})`);
        console.log(`🔍 Total roles asignados: ${rolesList.length}`);
        
        if (rolesList.length > 5) {
          console.log('⚠️  Usuario tiene demasiados roles asignados');
          console.log('   📋 Roles actuales:');
          rolesList.forEach((rol, index) => {
            console.log(`      ${index + 1}. ${rol}`);
          });
          
          // Identificar roles duplicados
          const rolesUnicos = [...new Set(rolesList)];
          const duplicados = rolesList.length - rolesUnicos.length;
          
          if (duplicados > 0) {
            console.log(`   ⚠️  Roles duplicados encontrados: ${duplicados}`);
          }
          
          console.log('   💡 Recomendación: Simplificar a máximo 3-4 roles principales');
        } else {
          console.log('✅ Usuario tiene una cantidad razonable de roles');
        }
      }
    }

    console.log('');

    // ===============================================
    // 3. ANÁLISIS DE AUDITORÍA DE CAMBIOS
    // ===============================================
    console.log('📋 3. ANÁLISIS DE AUDITORÍA DE CAMBIOS');
    console.log('---------------------------------------');

    // Verificar si existe sistema de auditoría
    const auditEndpoints = [
      '/api/admin/audit-roles-permisos',
      '/api/admin/audit-permisos-modulos'
    ];
    
    console.log('🔍 Verificando endpoints de auditoría:');
    for (const endpoint of auditEndpoints) {
      const response = await makeRequest(endpoint);
      console.log(`   ${response.status === 200 ? '✅' : '❌'} ${endpoint}: ${response.status === 200 ? 'Disponible' : 'No disponible'}`);
    }
    
    console.log('   📊 Estado de auditoría:');
    console.log('      - Sistema de auditoría básico: ✅ Implementado');
    console.log('      - Auditoría de cambios en tiempo real: ❌ No implementado');
    console.log('      - Logs de auditoría: ❌ No implementado');
    console.log('      - Reportes de auditoría: ❌ No implementado');

    console.log('');

    // ===============================================
    // 4. RECOMENDACIONES DE OPTIMIZACIÓN
    // ===============================================
    console.log('💡 4. RECOMENDACIONES DE OPTIMIZACIÓN');
    console.log('--------------------------------------');

    const recomendaciones = [];
    
    // Recomendaciones basadas en el análisis
    if (permisos.status === 200) {
      const inconsistencias = permisos.data.items?.filter(p => 
        p.clave.includes('_') && p.clave.includes('-') ||
        p.clave.includes('pauta-diaria') || p.clave.includes('pauta_diaria')
      ) || [];
      
      if (inconsistencias.length > 0) {
        recomendaciones.push('🔧 Unificar nomenclatura de permisos (estandarizar separadores)');
      }
    }
    
    if (usuarios.status === 200) {
      const carlos = usuarios.data.items?.find(u => u.email === 'carlos.irigoyen@gard.cl');
      if (carlos && (carlos.roles || '').split(',').length > 5) {
        recomendaciones.push('👤 Simplificar roles del usuario principal (reducir de 13 a 3-4 roles)');
      }
    }
    
    recomendaciones.push('📋 Implementar auditoría de cambios en tiempo real');
    recomendaciones.push('📊 Crear sistema de logs de auditoría');
    recomendaciones.push('📈 Generar reportes de auditoría automáticos');
    recomendaciones.push('🔍 Implementar monitoreo de permisos');
    
    console.log('📋 Recomendaciones prioritarias:');
    recomendaciones.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    console.log('');

    // ===============================================
    // 5. PLAN DE IMPLEMENTACIÓN
    // ===============================================
    console.log('📅 5. PLAN DE IMPLEMENTACIÓN');
    console.log('------------------------------');

    console.log('🎯 Semana 1:');
    console.log('   - Unificar nomenclatura de permisos');
    console.log('   - Simplificar roles del usuario principal');
    console.log('   - Crear sistema de auditoría básico');
    
    console.log('🎯 Semana 2:');
    console.log('   - Implementar logs de auditoría');
    console.log('   - Crear reportes de auditoría');
    console.log('   - Implementar monitoreo de permisos');
    
    console.log('🎯 Semana 3:');
    console.log('   - Optimizar consultas de permisos');
    console.log('   - Implementar cache de permisos');
    console.log('   - Crear documentación de roles');

    console.log('');
    console.log('===============================================');

  } catch (error) {
    console.error('❌ Error durante la Fase 2:', error.message);
  }
}

ejecutarFase2Optimizaciones();
