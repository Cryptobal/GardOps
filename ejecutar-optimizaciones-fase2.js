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

async function ejecutarOptimizacionesFase2() {
  console.log('🚀 EJECUTANDO FASE 2: OPTIMIZACIONES DEL SISTEMA RBAC');
  console.log('=====================================================\n');

  try {
    // ===============================================
    // 1. VERIFICAR ESTADO ACTUAL
    // ===============================================
    console.log('📊 1. VERIFICANDO ESTADO ACTUAL');
    console.log('--------------------------------');

    const estadoActual = await makeRequest('/api/admin/optimizaciones-rbac');
    
    if (estadoActual.status === 200) {
      const estado = estadoActual.data.estado;
      console.log(`📋 Inconsistencias en nomenclatura: ${estado.inconsistenciasNomenclatura}`);
      console.log(`👤 Roles del usuario principal: ${estado.rolesUsuarioPrincipal}`);
      console.log(`📋 Sistema de auditoría: ${estado.sistemaAuditoria ? 'SÍ' : 'NO'}`);
    } else {
      console.log('❌ Error verificando estado actual:', estadoActual.data);
      return;
    }

    console.log('');

    // ===============================================
    // 2. UNIFICAR NOMENCLATURA DE PERMISOS
    // ===============================================
    console.log('🔧 2. UNIFICANDO NOMENCLATURA DE PERMISOS');
    console.log('------------------------------------------');

    const unificarNomenclatura = await makeRequest('/api/admin/optimizaciones-rbac', 'POST', {
      action: 'unificar-nomenclatura'
    });

    if (unificarNomenclatura.status === 200) {
      const resultado = unificarNomenclatura.data;
      console.log(`✅ ${resultado.message}`);
      console.log(`   📊 Permisos de pauta estandarizados: ${resultado.data.permisosPautaEstandarizados}`);
      console.log(`   📊 Permisos con separadores estandarizados: ${resultado.data.permisosSeparadoresEstandarizados}`);
      console.log(`   📊 Inconsistencias restantes: ${resultado.data.inconsistenciasRestantes}`);
    } else {
      console.log('❌ Error unificando nomenclatura:', unificarNomenclatura.data);
    }

    console.log('');

    // ===============================================
    // 3. SIMPLIFICAR ROLES DEL USUARIO PRINCIPAL
    // ===============================================
    console.log('👤 3. SIMPLIFICANDO ROLES DEL USUARIO PRINCIPAL');
    console.log('------------------------------------------------');

    const simplificarRoles = await makeRequest('/api/admin/optimizaciones-rbac', 'POST', {
      action: 'simplificar-roles-usuario'
    });

    if (simplificarRoles.status === 200) {
      const resultado = simplificarRoles.data;
      console.log(`✅ ${resultado.message}`);
      console.log(`   📊 Roles eliminados: ${resultado.data.rolesEliminados}`);
      console.log(`   📊 Roles finales: ${resultado.data.rolesFinales.join(', ')}`);
      console.log(`   📊 Total roles finales: ${resultado.data.totalRolesFinales}`);
    } else {
      console.log('❌ Error simplificando roles:', simplificarRoles.data);
    }

    console.log('');

    // ===============================================
    // 4. CREAR SISTEMA DE AUDITORÍA
    // ===============================================
    console.log('📋 4. CREANDO SISTEMA DE AUDITORÍA');
    console.log('------------------------------------');

    const crearAuditoria = await makeRequest('/api/admin/optimizaciones-rbac', 'POST', {
      action: 'crear-auditoria'
    });

    if (crearAuditoria.status === 200) {
      const resultado = crearAuditoria.data;
      console.log(`✅ ${resultado.message}`);
      console.log(`   📊 Tabla de auditoría: ${resultado.data.tablaAuditoria}`);
      console.log(`   📊 Función de auditoría: ${resultado.data.funcionAuditoria}`);
      console.log(`   📊 Triggers creados: ${resultado.data.triggersCreados.join(', ')}`);
    } else {
      console.log('❌ Error creando auditoría:', crearAuditoria.data);
    }

    console.log('');

    // ===============================================
    // 5. VERIFICACIÓN FINAL
    // ===============================================
    console.log('🔍 5. VERIFICACIÓN FINAL');
    console.log('------------------------');

    const estadoFinal = await makeRequest('/api/admin/optimizaciones-rbac');
    
    if (estadoFinal.status === 200) {
      const estado = estadoFinal.data.estado;
      console.log('📊 Estado después de las optimizaciones:');
      console.log(`   📋 Inconsistencias en nomenclatura: ${estado.inconsistenciasNomenclatura}`);
      console.log(`   👤 Roles del usuario principal: ${estado.rolesUsuarioPrincipal}`);
      console.log(`   📋 Sistema de auditoría: ${estado.sistemaAuditoria ? 'SÍ' : 'NO'}`);
      
      // Calificar el resultado
      const optimizacionesCompletadas = 
        estado.inconsistenciasNomenclatura === 0 && 
        estado.rolesUsuarioPrincipal <= 3 && 
        estado.sistemaAuditoria;
      
      console.log('');
      if (optimizacionesCompletadas) {
        console.log('🎉 ¡ÉXITO! TODAS LAS OPTIMIZACIONES DE LA FASE 2 COMPLETADAS');
        console.log('✅ FASE 2 COMPLETADA');
      } else {
        console.log('⚠️  ALGUNAS OPTIMIZACIONES PENDIENTES');
        if (estado.inconsistenciasNomenclatura > 0) {
          console.log(`   - Aún hay ${estado.inconsistenciasNomenclatura} inconsistencias en nomenclatura`);
        }
        if (estado.rolesUsuarioPrincipal > 3) {
          console.log(`   - Usuario principal aún tiene ${estado.rolesUsuarioPrincipal} roles`);
        }
        if (!estado.sistemaAuditoria) {
          console.log('   - Sistema de auditoría no implementado');
        }
      }
    }

    console.log('');
    console.log('===============================================');

  } catch (error) {
    console.error('❌ Error durante la Fase 2:', error.message);
  }
}

ejecutarOptimizacionesFase2();
