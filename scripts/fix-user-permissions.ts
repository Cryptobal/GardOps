import { query } from '@/lib/database';

async function main() {
  try {
    console.log('🔍 Verificando permisos del usuario carlos.irigoyen@gard.cl...\n');

    // 1. Verificar si el usuario existe y está activo
    const user = await query(`
      SELECT id, email, activo, tenant_id, rol
      FROM usuarios 
      WHERE lower(email) = lower('carlos.irigoyen@gard.cl')
    `);

    if (user.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    const userId = user.rows[0].id;
    console.log('👤 Usuario encontrado:', user.rows[0]);

    // 2. Verificar permisos actuales
    const currentPermissions = await query(`
      SELECT p.clave, p.descripcion
      FROM usuarios u
      JOIN usuarios_roles ur ON ur.usuario_id = u.id
      JOIN roles r ON r.id = ur.rol_id
      JOIN roles_permisos rp ON rp.rol_id = r.id
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE lower(u.email) = lower('carlos.irigoyen@gard.cl')
      ORDER BY p.clave
    `);

    console.log('\n🔑 Permisos actuales:');
    if (currentPermissions.rows.length === 0) {
      console.log('   ❌ No tiene permisos asignados');
    } else {
      currentPermissions.rows.forEach((p: any) => console.log(`   ✅ ${p.clave} - ${p.descripcion}`));
    }

    // 3. Verificar permisos requeridos para la UI de seguridad
    const requiredPermissions = [
      'rbac.platform_admin',
      'usuarios.manage', 
      'rbac.roles.read',
      'rbac.permisos.read',
      'rbac.tenants.read'
    ];

    console.log('\n🎯 Permisos requeridos para UI de seguridad:');
    for (const perm of requiredPermissions) {
      const hasPerm = await query(`
        SELECT public.fn_usuario_tiene_permiso($1, $2) as allowed
      `, [userId, perm]);
      console.log(`   ${hasPerm.rows[0].allowed ? '✅' : '❌'} ${perm}`);
    }

    // 4. Verificar si existe el rol platform_admin
    const platformAdminRole = await query(`
      SELECT id, nombre FROM roles WHERE nombre = 'Platform Admin' AND tenant_id IS NULL
    `);

    if (platformAdminRole.rows.length === 0) {
      console.log('\n🔧 Creando rol platform_admin...');
      await query(`
        INSERT INTO roles (id, tenant_id, nombre, descripcion, clave)
        VALUES (gen_random_uuid(), NULL, 'Platform Admin', 'Administrador de la plataforma', 'platform_admin')
      `);
      console.log('✅ Rol platform_admin creado');
    } else {
      console.log('\n✅ Rol platform_admin ya existe');
    }

    // 5. Verificar si existen los permisos requeridos
    console.log('\n🔧 Verificando permisos requeridos...');
    for (const perm of requiredPermissions) {
      const permExists = await query(`
        SELECT id FROM permisos WHERE clave = $1
      `, [perm]);
      
      if (permExists.rows.length === 0) {
        console.log(`   ❌ Permiso ${perm} no existe`);
      } else {
        console.log(`   ✅ Permiso ${perm} existe`);
      }
    }

    // 6. Asignar rol platform_admin al usuario
    console.log('\n🔧 Asignando rol platform_admin al usuario...');
    await query(`
      INSERT INTO usuarios_roles (usuario_id, rol_id)
      SELECT u.id, r.id
      FROM usuarios u
      JOIN roles r ON r.nombre = 'Platform Admin' AND r.tenant_id IS NULL
      WHERE lower(u.email) = lower('carlos.irigoyen@gard.cl')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Rol asignado');

    // 7. Verificar permisos finales
    console.log('\n🔍 Verificando permisos finales...');
    for (const perm of requiredPermissions) {
      const hasPerm = await query(`
        SELECT public.fn_usuario_tiene_permiso($1, $2) as allowed
      `, [userId, perm]);
      console.log(`   ${hasPerm.rows[0].allowed ? '✅' : '❌'} ${perm}`);
    }

    console.log('\n🎉 Proceso completado. Recarga la página de configuración/seguridad.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
