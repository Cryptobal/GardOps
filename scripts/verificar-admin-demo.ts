import { sql } from '@vercel/postgres';

async function verificarAdminDemo() {
  try {
    console.log('🔍 Verificando estado de admin@demo.com...\n');

    // 1. Verificar si existe el usuario admin@demo.com
    const usuarioResult = await sql`
      SELECT id, email, nombre, tenant_id, rol 
      FROM usuarios 
      WHERE email = 'admin@demo.com'
    `;
    
    if (usuarioResult.rows.length === 0) {
      console.log('❌ Usuario admin@demo.com no encontrado');
      return;
    }
    
    const usuario = usuarioResult.rows[0];
    console.log('✅ Usuario encontrado:', {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      tenant_id: usuario.tenant_id,
      rol: usuario.rol
    });

    // 2. Verificar el tenant "Tenant Demo"
    const tenantResult = await sql`
      SELECT id, nombre 
      FROM tenants 
      WHERE nombre = 'Tenant Demo'
    `;
    
    if (tenantResult.rows.length === 0) {
      console.log('❌ Tenant "Tenant Demo" no encontrado');
      return;
    }
    
    const tenant = tenantResult.rows[0];
    console.log('✅ Tenant encontrado:', {
      id: tenant.id,
      nombre: tenant.nombre
    });

    // 3. Verificar si existen roles para el tenant
    const rolesResult = await sql`
      SELECT id, nombre, descripcion, tenant_id 
      FROM roles 
      WHERE tenant_id = ${tenant.id}
      ORDER BY nombre
    `;
    
    console.log('\n📋 Roles del Tenant Demo:');
    rolesResult.rows.forEach(rol => {
      console.log(`  - ${rol.nombre}: ${rol.descripcion}`);
    });

    // 4. Verificar si admin@demo.com tiene roles asignados
    const rolesUsuarioResult = await sql`
      SELECT r.id, r.nombre, r.descripcion, ur.rol_id
      FROM usuarios_roles ur
      JOIN roles r ON ur.rol_id = r.id
      WHERE ur.usuario_id = ${usuario.id}
    `;
    
    console.log('\n👤 Roles asignados a admin@demo.com:');
    if (rolesUsuarioResult.rows.length === 0) {
      console.log('  ❌ No tiene roles asignados');
    } else {
      rolesUsuarioResult.rows.forEach(rol => {
        console.log(`  ✅ ${rol.nombre}: ${rol.descripcion}`);
      });
    }

    // 5. Buscar el rol "Tenant Admin" del tenant
    const tenantAdminResult = await sql`
      SELECT id, nombre, descripcion 
      FROM roles 
      WHERE nombre = 'Tenant Admin' AND tenant_id = ${tenant.id}
    `;
    
    if (tenantAdminResult.rows.length === 0) {
      console.log('\n❌ Rol "Tenant Admin" no encontrado para Tenant Demo');
      return;
    }
    
    const tenantAdmin = tenantAdminResult.rows[0];
    console.log('\n✅ Rol Tenant Admin encontrado:', {
      id: tenantAdmin.id,
      nombre: tenantAdmin.nombre,
      descripcion: tenantAdmin.descripcion
    });

    // 6. Verificar permisos del rol Tenant Admin
    const permisosResult = await sql`
      SELECT p.id, p.clave, p.descripcion
      FROM roles_permisos rp
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE rp.rol_id = ${tenantAdmin.id}
      ORDER BY p.clave
    `;
    
    console.log('\n🔑 Permisos del rol Tenant Admin:');
    permisosResult.rows.forEach(permiso => {
      console.log(`  ✅ ${permiso.clave}: ${permiso.descripcion}`);
    });

    // 7. Asignar el rol Tenant Admin a admin@demo.com si no lo tiene
    const tieneRol = rolesUsuarioResult.rows.some(r => r.id === tenantAdmin.id);
    
    if (!tieneRol) {
      console.log('\n🔄 Asignando rol Tenant Admin a admin@demo.com...');
      
      await sql`
        INSERT INTO usuarios_roles (usuario_id, rol_id)
        VALUES (${usuario.id}, ${tenantAdmin.id})
        ON CONFLICT (usuario_id, rol_id) DO NOTHING
      `;
      
      console.log('✅ Rol asignado correctamente');
    } else {
      console.log('\n✅ admin@demo.com ya tiene el rol Tenant Admin asignado');
    }

    console.log('\n🎯 Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarAdminDemo();
