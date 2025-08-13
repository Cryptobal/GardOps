import { query } from '@/lib/database';

async function main() {
  try {
    console.log('🔧 Asignando permiso usuarios.manage al rol platform_admin...\n');

    // 1. Obtener el rol platform_admin
    const platformAdminRole = await query(`
      SELECT id, nombre FROM roles WHERE nombre = 'Platform Admin' AND tenant_id IS NULL
    `);

    if (platformAdminRole.rows.length === 0) {
      console.log('❌ Rol platform_admin no encontrado');
      return;
    }

    const roleId = platformAdminRole.rows[0].id;
    console.log('✅ Rol platform_admin encontrado:', platformAdminRole.rows[0]);

    // 2. Obtener el permiso usuarios.manage
    const usuariosManagePerm = await query(`
      SELECT id, clave FROM permisos WHERE clave = 'usuarios.manage'
    `);

    if (usuariosManagePerm.rows.length === 0) {
      console.log('❌ Permiso usuarios.manage no encontrado');
      return;
    }

    const permId = usuariosManagePerm.rows[0].id;
    console.log('✅ Permiso usuarios.manage encontrado:', usuariosManagePerm.rows[0]);

    // 3. Asignar el permiso al rol
    await query(`
      INSERT INTO roles_permisos (rol_id, permiso_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [roleId, permId]);

    console.log('✅ Permiso usuarios.manage asignado al rol platform_admin');

    // 4. Verificar que el usuario ahora tiene el permiso
    const user = await query(`
      SELECT id FROM usuarios WHERE lower(email) = lower('carlos.irigoyen@gard.cl')
    `);

    if (user.rows.length > 0) {
      const userId = user.rows[0].id;
      const hasPerm = await query(`
        SELECT public.fn_usuario_tiene_permiso($1, $2) as allowed
      `, [userId, 'usuarios.manage']);
      
      console.log(`\n🔍 Verificación final: usuarios.manage = ${hasPerm.rows[0].allowed ? '✅' : '❌'}`);
    }

    console.log('\n🎉 Proceso completado. Recarga la página de configuración/seguridad.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
