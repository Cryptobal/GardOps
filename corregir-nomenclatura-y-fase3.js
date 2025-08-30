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

async function corregirNomenclaturaYFase3() {
  console.log('🚀 CORRIGIENDO NOMENCLATURA Y EJECUTANDO FASE 3');
  console.log('================================================\n');

  try {
    // ===============================================
    // 1. CORREGIR NOMENCLATURA DE PERMISOS
    // ===============================================
    console.log('🔧 1. CORRIGIENDO NOMENCLATURA DE PERMISOS');
    console.log('-------------------------------------------');

    const corregirNomenclatura = await makeRequest('/api/admin/optimizaciones-rbac/corregir-nomenclatura', 'POST');

    if (corregirNomenclatura.status === 200) {
      const resultado = corregirNomenclatura.data;
      console.log(`✅ ${resultado.message}`);
      console.log(`   📊 Permisos actualizados: ${resultado.data.permisosActualizados}`);
      console.log(`   📊 Total procesados: ${resultado.data.totalProcesados}`);
      console.log(`   📊 Inconsistencias restantes: ${resultado.data.inconsistenciasRestantes}`);
      
      if (resultado.data.errores.length > 0) {
        console.log(`   ⚠️  Errores encontrados: ${resultado.data.errores.length}`);
        resultado.data.errores.forEach(error => {
          console.log(`      - ${error}`);
        });
      }
    } else {
      console.log('❌ Error corrigiendo nomenclatura:', corregirNomenclatura.data);
    }

    console.log('');

    // ===============================================
    // 2. FASE 3: OPTIMIZACIONES DE ESCALABILIDAD
    // ===============================================
    console.log('📈 2. FASE 3: OPTIMIZACIONES DE ESCALABILIDAD');
    console.log('==============================================');

    // 2.1 Optimizar consultas de permisos
    console.log('🔍 2.1 OPTIMIZANDO CONSULTAS DE PERMISOS');
    console.log('----------------------------------------');

    const optimizarConsultas = await makeRequest('/api/admin/optimizaciones-rbac', 'POST', {
      action: 'optimizar-consultas'
    });

    if (optimizarConsultas.status === 200) {
      const resultado = optimizarConsultas.data;
      console.log(`✅ ${resultado.message}`);
      console.log(`   📊 Índices creados: ${resultado.data.indicesCreados}`);
      console.log(`   📊 Consultas optimizadas: ${resultado.data.consultasOptimizadas}`);
    } else {
      console.log('❌ Error optimizando consultas:', optimizarConsultas.data);
    }

    console.log('');

    // 2.2 Implementar cache de permisos
    console.log('⚡ 2.2 IMPLEMENTANDO CACHE DE PERMISOS');
    console.log('---------------------------------------');

    const implementarCache = await makeRequest('/api/admin/optimizaciones-rbac', 'POST', {
      action: 'implementar-cache'
    });

    if (implementarCache.status === 200) {
      const resultado = implementarCache.data;
      console.log(`✅ ${resultado.message}`);
      console.log(`   📊 Cache implementado: ${resultado.data.cacheImplementado}`);
      console.log(`   📊 TTL configurado: ${resultado.data.ttlConfigurado}`);
    } else {
      console.log('❌ Error implementando cache:', implementarCache.data);
    }

    console.log('');

    // 2.3 Crear documentación de roles
    console.log('📚 2.3 CREANDO DOCUMENTACIÓN DE ROLES');
    console.log('--------------------------------------');

    const crearDocumentacion = await makeRequest('/api/admin/optimizaciones-rbac', 'POST', {
      action: 'crear-documentacion'
    });

    if (crearDocumentacion.status === 200) {
      const resultado = crearDocumentacion.data;
      console.log(`✅ ${resultado.message}`);
      console.log(`   📊 Documentación creada: ${resultado.data.documentacionCreada}`);
      console.log(`   📊 Roles documentados: ${resultado.data.rolesDocumentados}`);
    } else {
      console.log('❌ Error creando documentación:', crearDocumentacion.data);
    }

    console.log('');

    // ===============================================
    // 3. VERIFICACIÓN FINAL COMPLETA
    // ===============================================
    console.log('🔍 3. VERIFICACIÓN FINAL COMPLETA');
    console.log('----------------------------------');

    // Verificar estado de optimizaciones
    const estadoOptimizaciones = await makeRequest('/api/admin/optimizaciones-rbac');
    
    if (estadoOptimizaciones.status === 200) {
      const estado = estadoOptimizaciones.data.estado;
      console.log('📊 Estado final del sistema RBAC:');
      console.log(`   📋 Inconsistencias en nomenclatura: ${estado.inconsistenciasNomenclatura}`);
      console.log(`   👤 Roles del usuario principal: ${estado.rolesUsuarioPrincipal}`);
      console.log(`   📋 Sistema de auditoría: ${estado.sistemaAuditoria ? 'SÍ' : 'NO'}`);
    }

    // Verificar estado general del sistema
    const usuarios = await makeRequest('/api/admin/rbac/usuarios');
    const roles = await makeRequest('/api/admin/rbac/roles');
    const permisos = await makeRequest('/api/admin/rbac/permisos');

    if (usuarios.status === 200 && roles.status === 200 && permisos.status === 200) {
      const usuariosSinRoles = usuarios.data.items?.filter(u => !u.roles || u.roles === '') || [];
      const totalUsuarios = usuarios.data.items?.length || 0;
      const totalRoles = roles.data.items?.length || 0;
      const totalPermisos = permisos.data.items?.length || 0;

      console.log('📊 Estado general del sistema:');
      console.log(`   👥 Total usuarios: ${totalUsuarios}`);
      console.log(`   👥 Usuarios sin roles: ${usuariosSinRoles.length}`);
      console.log(`   👑 Total roles: ${totalRoles}`);
      console.log(`   🔐 Total permisos: ${totalPermisos}`);

      // Calificar el sistema final
      const calificacionFinal = calcularCalificacionFinal({
        usuariosSinRoles: usuariosSinRoles.length,
        totalUsuarios,
        totalRoles,
        totalPermisos,
        estadoOptimizaciones: estadoOptimizaciones.status === 200 ? estadoOptimizaciones.data.estado : null
      });

      console.log('');
      console.log(`🎯 CALIFICACIÓN FINAL DEL SISTEMA RBAC: ${calificacionFinal.calificacion}`);
      console.log(`📝 ${calificacionFinal.mensaje}`);
      
      if (calificacionFinal.recomendaciones.length > 0) {
        console.log('💡 Recomendaciones finales:');
        calificacionFinal.recomendaciones.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
    }

    console.log('');
    console.log('===============================================');

  } catch (error) {
    console.error('❌ Error durante la corrección y Fase 3:', error.message);
  }
}

function calcularCalificacionFinal(estado) {
  let puntuacion = 100;
  const recomendaciones = [];

  // Verificar usuarios sin roles
  if (estado.usuariosSinRoles > 0) {
    puntuacion -= 20;
    recomendaciones.push(`Asignar roles a ${estado.usuariosSinRoles} usuarios sin roles`);
  }

  // Verificar optimizaciones
  if (estado.estadoOptimizaciones) {
    if (estado.estadoOptimizaciones.inconsistenciasNomenclatura > 0) {
      puntuacion -= 10;
      recomendaciones.push(`Corregir ${estado.estadoOptimizaciones.inconsistenciasNomenclatura} inconsistencias en nomenclatura`);
    }
    
    if (estado.estadoOptimizaciones.rolesUsuarioPrincipal > 3) {
      puntuacion -= 5;
      recomendaciones.push(`Simplificar roles del usuario principal (actual: ${estado.estadoOptimizaciones.rolesUsuarioPrincipal})`);
    }
    
    if (!estado.estadoOptimizaciones.sistemaAuditoria) {
      puntuacion -= 10;
      recomendaciones.push('Implementar sistema de auditoría completo');
    }
  }

  // Verificar escalabilidad
  if (estado.totalUsuarios > 100 && estado.totalRoles < 10) {
    puntuacion += 5;
  }

  if (estado.totalPermisos > 200) {
    puntuacion += 5;
  }

  // Determinar calificación
  let calificacion = 'A';
  let mensaje = 'Sistema RBAC excelente y completamente funcional';

  if (puntuacion < 60) {
    calificacion = 'D';
    mensaje = 'Sistema RBAC con problemas críticos que requieren atención inmediata';
  } else if (puntuacion < 75) {
    calificacion = 'C';
    mensaje = 'Sistema RBAC funcional pero con problemas importantes';
  } else if (puntuacion < 90) {
    calificacion = 'B';
    mensaje = 'Sistema RBAC bien estructurado con algunas mejoras pendientes';
  }

  return {
    calificacion,
    mensaje,
    puntuacion,
    recomendaciones
  };
}

corregirNomenclaturaYFase3();
