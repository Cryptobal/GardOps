import { sql } from '@vercel/postgres';

async function verificarEstadoActual() {
  try {
    console.log('🔍 VERIFICANDO ESTADO ACTUAL DE ROLES Y PERMISOS');
    console.log('================================================\n');

    // 1. Verificar roles existentes
    console.log('1. ROLES EXISTENTES:');
    const roles = await sql`SELECT id, nombre, descripcion FROM roles ORDER BY nombre`;
    roles.rows.forEach(rol => {
      console.log(`   ✅ ${rol.nombre} (ID: ${rol.id}) - ${rol.descripcion}`);
    });
    console.log(`   Total: ${roles.rows.length} roles\n`);

    // 2. Verificar usuarios y sus roles
    console.log('2. USUARIOS Y SUS ROLES:');
    const usuariosRoles = await sql`
      SELECT 
        u.email,
        t.nombre as tenant,
        STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles_asignados
      FROM usuarios u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      LEFT JOIN roles r ON ur.rol_id = r.id
      GROUP BY u.id, u.email, t.nombre
      ORDER BY u.email
    `;
    
    usuariosRoles.rows.forEach(usuario => {
      const roles = usuario.roles_asignados || 'SIN ROLES';
      console.log(`   👤 ${usuario.email} (${usuario.tenant}) -> ${roles}`);
    });
    console.log('');

    // 3. Verificar específicamente Carlos.Irigoyen@gard.cl
    console.log('3. VERIFICACIÓN ESPECÍFICA CARLOS.IRIGOYEN:');
    const carlos = await sql`
      SELECT 
        u.email,
        u.rol,
        t.nombre as tenant,
        STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles_asignados,
        CASE 
          WHEN COUNT(r.id) = 0 THEN 'SIN ROLES ASIGNADOS'
          ELSE 'CON ROLES'
        END as estado
      FROM usuarios u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      LEFT JOIN roles r ON ur.rol_id = r.id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
      GROUP BY u.id, u.email, u.rol, t.nombre
    `;
    
    if (carlos.rows.length > 0) {
      const carlosData = carlos.rows[0];
      console.log(`   👤 ${carlosData.email}`);
      console.log(`   🏢 Tenant: ${carlosData.tenant}`);
      console.log(`   🏷️  Rol en JWT: ${carlosData.rol}`);
      console.log(`   📋 Roles asignados: ${carlosData.roles_asignados || 'NINGUNO'}`);
      console.log(`   ⚠️  Estado: ${carlosData.estado}`);
    } else {
      console.log('   ❌ Carlos.Irigoyen@gard.cl no encontrado');
    }
    console.log('');

    // 4. Verificar permisos del Super Admin
    console.log('4. PERMISOS DEL SUPER ADMIN:');
    const superAdminPermisos = await sql`
      SELECT p.clave, p.descripcion
      FROM roles r
      JOIN roles_permisos rp ON r.id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE r.nombre = 'Super Admin'
      ORDER BY p.clave
    `;
    
    console.log(`   Total permisos Super Admin: ${superAdminPermisos.rows.length}`);
    superAdminPermisos.rows.forEach(permiso => {
      console.log(`   🔑 ${permiso.clave} - ${permiso.descripcion}`);
    });
    console.log('');

    // 5. Verificar permisos especiales del Super Admin
    console.log('5. PERMISOS ESPECIALES SUPER ADMIN:');
    const permisosEspeciales = await sql`
      SELECT p.clave, p.descripcion
      FROM roles r
      JOIN roles_permisos rp ON r.id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE r.nombre = 'Super Admin'
      AND (p.clave LIKE 'rbac.%' OR p.clave LIKE '%admin%' OR p.clave LIKE '%platform%')
      ORDER BY p.clave
    `;
    
    permisosEspeciales.rows.forEach(permiso => {
      console.log(`   ⭐ ${permiso.clave} - ${permiso.descripcion}`);
    });
    console.log('');

    // 6. Usuarios sin roles asignados
    console.log('6. USUARIOS SIN ROLES ASIGNADOS:');
    const usuariosSinRoles = await sql`
      SELECT u.email, u.rol, t.nombre as tenant
      FROM usuarios u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      WHERE ur.usuario_id IS NULL
      ORDER BY u.email
    `;
    
    if (usuariosSinRoles.rows.length > 0) {
      usuariosSinRoles.rows.forEach(usuario => {
        console.log(`   ⚠️  ${usuario.email} (${usuario.tenant}) - Rol JWT: ${usuario.rol}`);
      });
    } else {
      console.log('   ✅ Todos los usuarios tienen roles asignados');
    }
    console.log('');

    console.log('🎯 RESUMEN:');
    console.log(`   • Roles totales: ${roles.rows.length}`);
    console.log(`   • Usuarios sin roles: ${usuariosSinRoles.rows.length}`);
    console.log(`   • Permisos Super Admin: ${superAdminPermisos.rows.length}`);
    console.log(`   • Permisos especiales: ${permisosEspeciales.rows.length}`);

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

verificarEstadoActual();
