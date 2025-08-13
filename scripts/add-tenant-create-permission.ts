import { query } from '@/lib/database';

async function main() {
  try {
    console.log('🔧 Agregando permiso rbac.tenants.create al rol platform_admin...\n');

    // 1. Verificar si existe el permiso rbac.tenants.create
    const permExists = await query(`
      SELECT id, clave FROM permisos WHERE clave = 'rbac.tenants.create'
    `);

    if (permExists.rows.length === 0) {
      console.log('🔧 Creando permiso rbac.tenants.create...');
      await query(`
        INSERT INTO permisos (id, clave, descripcion)
        VALUES (gen_random_uuid(), 'rbac.tenants.create', 'Crear nuevos tenants en la plataforma')
      `);
      console.log('✅ Permiso rbac.tenants.create creado');
    } else {
      console.log('✅ Permiso rbac.tenants.create ya existe');
    }

    // 2. Obtener el rol platform_admin
    const platformAdminRole = await query(`
      SELECT id, nombre FROM roles WHERE nombre = 'Platform Admin' AND tenant_id IS NULL
    `);

    if (platformAdminRole.rows.length === 0) {
      console.log('❌ Rol platform_admin no encontrado');
      return;
    }

    const roleId = platformAdminRole.rows[0].id;
    console.log('✅ Rol platform_admin encontrado:', platformAdminRole.rows[0]);

    // 3. Obtener el permiso rbac.tenants.create
    const tenantCreatePerm = await query(`
      SELECT id, clave FROM permisos WHERE clave = 'rbac.tenants.create'
    `);

    if (tenantCreatePerm.rows.length === 0) {
      console.log('❌ Permiso rbac.tenants.create no encontrado');
      return;
    }

    const permId = tenantCreatePerm.rows[0].id;
    console.log('✅ Permiso rbac.tenants.create encontrado:', tenantCreatePerm.rows[0]);

    // 4. Asignar el permiso al rol
    await query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [roleId, permId]);

    console.log('✅ Permiso rbac.tenants.create asignado al rol platform_admin');

    // 5. Verificar que el usuario ahora tiene el permiso
    const user = await query(`
      SELECT id FROM usuarios WHERE lower(email) = lower('carlos.irigoyen@gard.cl')
    `);

    if (user.rows.length > 0) {
      const userId = user.rows[0].id;
      const hasPerm = await query(`
        SELECT public.fn_usuario_tiene_permiso($1, $2) as allowed
      `, [userId, 'rbac.tenants.create']);
      
      console.log(`\n🔍 Verificación final: rbac.tenants.create = ${hasPerm.rows[0].allowed ? '✅' : '❌'}`);
    }

    console.log('\n🎉 Proceso completado. Ahora puedes crear tenants.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
