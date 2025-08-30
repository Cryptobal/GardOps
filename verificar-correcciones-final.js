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

async function verificarCorreccionesFinal() {
  console.log('🔍 VERIFICACIÓN FINAL DE CORRECCIONES CRÍTICAS');
  console.log('=============================================\n');

  try {
    // ===============================================
    // 1. VERIFICAR USUARIOS Y ROLES
    // ===============================================
    console.log('👥 1. VERIFICANDO USUARIOS Y ROLES');
    console.log('----------------------------------');

    const usuarios = await makeRequest('/api/admin/rbac/usuarios');
    if (usuarios.status === 200) {
      const usuariosSinRoles = usuarios.data.items?.filter(u => !u.roles || u.roles === '') || [];
      const usuariosConRoles = usuarios.data.items?.filter(u => u.roles && u.roles !== '') || [];
      
      console.log(`📊 Total usuarios: ${usuarios.data.items?.length || 0}`);
      console.log(`✅ Usuarios con roles: ${usuariosConRoles.length}`);
      console.log(`⚠️  Usuarios sin roles: ${usuariosSinRoles.length}`);
      
      if (usuariosSinRoles.length > 0) {
        console.log('   📋 Usuarios sin roles:');
        usuariosSinRoles.forEach(usuario => {
          console.log(`      - ${usuario.email} (${usuario.nombre || 'Sin nombre'})`);
        });
      }
    }

    // ===============================================
    // 2. VERIFICAR ROLES
    // ===============================================
    console.log('\n👑 2. VERIFICANDO ROLES');
    console.log('------------------------');

    const roles = await makeRequest('/api/admin/rbac/roles');
    if (roles.status === 200) {
      const rolesExistentes = roles.data.items?.map(r => r.nombre) || [];
      const tienePlatformAdmin = rolesExistentes.some(r => r.toLowerCase().includes('platform admin'));
      
      console.log(`📊 Total roles: ${roles.data.items?.length || 0}`);
      console.log(`🔍 Rol Platform Admin existe: ${tienePlatformAdmin ? 'SÍ' : 'NO'}`);
      console.log('   📋 Roles disponibles:');
      rolesExistentes.forEach(rol => {
        console.log(`      - ${rol}`);
      });
    }

    // ===============================================
    // 3. VERIFICAR PERMISOS
    // ===============================================
    console.log('\n🔐 3. VERIFICANDO PERMISOS');
    console.log('---------------------------');

    const permisos = await makeRequest('/api/admin/rbac/permisos');
    if (permisos.status === 200) {
      const permisosExistentes = permisos.data.items?.map(p => p.clave) || [];
      const tieneUsuariosWrite = permisosExistentes.includes('rbac.usuarios.write');
      const tienePlatformAdmin = permisosExistentes.includes('rbac.platform_admin');
      
      console.log(`📊 Total permisos: ${permisos.data.items?.length || 0}`);
      console.log(`🔍 Permiso rbac.usuarios.write existe: ${tieneUsuariosWrite ? 'SÍ' : 'NO'}`);
      console.log(`🔍 Permiso rbac.platform_admin existe: ${tienePlatformAdmin ? 'SÍ' : 'NO'}`);
      
      // Mostrar permisos RBAC
      const permisosRBAC = permisosExistentes.filter(p => p.startsWith('rbac.'));
      if (permisosRBAC.length > 0) {
        console.log('   📋 Permisos RBAC disponibles:');
        permisosRBAC.forEach(permiso => {
          console.log(`      - ${permiso}`);
        });
      }
    }

    // ===============================================
    // 4. VERIFICAR ASIGNACIONES
    // ===============================================
    console.log('\n🔗 4. VERIFICANDO ASIGNACIONES');
    console.log('-------------------------------');

    if (usuarios.status === 200 && roles.status === 200) {
      const usuariosConRoles = usuarios.data.items?.filter(u => u.roles && u.roles !== '') || [];
      
      console.log('📋 Usuarios con roles asignados:');
      usuariosConRoles.forEach(usuario => {
        const roles = usuario.roles || 'Sin roles';
        console.log(`   👤 ${usuario.email} (${usuario.nombre || 'Sin nombre'})`);
        console.log(`      Roles: ${roles}`);
      });
    }

    // ===============================================
    // 5. CALIFICACIÓN FINAL
    // ===============================================
    console.log('\n🎯 5. CALIFICACIÓN FINAL');
    console.log('------------------------');

    // Obtener datos para calificación
    const usuariosSinRoles = usuarios.status === 200 ? 
      usuarios.data.items?.filter(u => !u.roles || u.roles === '').length || 0 : 999;
    
    const tienePlatformAdmin = roles.status === 200 && 
      roles.data.items?.some(r => r.nombre.toLowerCase().includes('platform admin'));
    
    const tieneUsuariosWrite = permisos.status === 200 && 
      permisos.data.items?.some(p => p.clave === 'rbac.usuarios.write');

    // Calificar el sistema
    let calificacion = 'A';
    let problemas = [];

    if (usuariosSinRoles > 0) {
      calificacion = 'C';
      problemas.push(`${usuariosSinRoles} usuarios sin roles`);
    }
    
    if (!tienePlatformAdmin) {
      calificacion = 'C';
      problemas.push('Rol Platform Admin faltante');
    }
    
    if (!tieneUsuariosWrite) {
      calificacion = 'C';
      problemas.push('Permiso rbac.usuarios.write faltante');
    }

    console.log(`📊 Calificación del sistema RBAC: ${calificacion}`);
    
    if (calificacion === 'A') {
      console.log('✅ El sistema RBAC está completamente funcional');
      console.log('🎯 Todas las correcciones críticas aplicadas exitosamente');
    } else {
      console.log('⚠️  El sistema RBAC tiene problemas que requieren atención:');
      problemas.forEach(problema => {
        console.log(`   - ${problema}`);
      });
    }

    // ===============================================
    // 6. RESUMEN EJECUTIVO
    // ===============================================
    console.log('\n📋 6. RESUMEN EJECUTIVO');
    console.log('------------------------');

    console.log('📊 Estado del sistema RBAC:');
    console.log(`   👥 Usuarios totales: ${usuarios.status === 200 ? usuarios.data.items?.length || 0 : 'Error'}`);
    console.log(`   👥 Usuarios sin roles: ${usuariosSinRoles}`);
    console.log(`   👑 Roles totales: ${roles.status === 200 ? roles.data.items?.length || 0 : 'Error'}`);
    console.log(`   👑 Rol Platform Admin: ${tienePlatformAdmin ? 'SÍ' : 'NO'}`);
    console.log(`   🔐 Permisos totales: ${permisos.status === 200 ? permisos.data.items?.length || 0 : 'Error'}`);
    console.log(`   🔐 Permiso rbac.usuarios.write: ${tieneUsuariosWrite ? 'SÍ' : 'NO'}`);
    console.log(`   🎯 Calificación: ${calificacion}`);

    // ===============================================
    // 7. PRÓXIMOS PASOS
    // ===============================================
    console.log('\n🚀 7. PRÓXIMOS PASOS');
    console.log('--------------------');

    if (calificacion === 'A') {
      console.log('✅ FASE 1 COMPLETADA - CORRECCIONES CRÍTICAS APLICADAS');
      console.log('');
      console.log('🔄 Próximas fases:');
      console.log('   📅 FASE 2: Optimizaciones (Próximas 2 semanas)');
      console.log('      - Unificar nomenclatura de permisos');
      console.log('      - Simplificar roles del usuario principal');
      console.log('      - Implementar auditoría de cambios');
      console.log('');
      console.log('   📅 FASE 3: Escalabilidad (Próximo mes)');
      console.log('      - Optimizar consultas de permisos');
      console.log('      - Implementar cache de permisos');
      console.log('      - Crear documentación de roles');
    } else {
      console.log('⚠️  FASE 1 INCOMPLETA - CORRECCIONES PENDIENTES');
      console.log('');
      console.log('🔧 Acciones requeridas:');
      if (usuariosSinRoles > 0) {
        console.log(`   - Asignar roles a ${usuariosSinRoles} usuarios sin roles`);
      }
      if (!tienePlatformAdmin) {
        console.log('   - Crear rol Platform Admin');
      }
      if (!tieneUsuariosWrite) {
        console.log('   - Crear permiso rbac.usuarios.write');
      }
      console.log('');
      console.log('📝 SQL para ejecutar manualmente:');
      console.log('   - Ver archivo correcciones-sql-manuales.sql');
    }

    console.log('\n===============================================');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
  }
}

verificarCorreccionesFinal();
