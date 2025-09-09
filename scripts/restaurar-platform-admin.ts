import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function restaurarPlatformAdmin() {
  try {
    console.log('🔧 Restaurando rol Platform Admin...\n');

    // 1. Buscar el usuario carlos.irigoyen@gard.cl
    console.log('1. Buscando usuario carlos.irigoyen@gard.cl...');
    const usuario = await sql`
      SELECT id, email, nombre
      FROM usuarios
      WHERE email = 'carlos.irigoyen@gard.cl'
      LIMIT 1
    `;

    if (usuario.rows.length === 0) {
      console.log('❌ Usuario carlos.irigoyen@gard.cl no encontrado');
      return;
    }

    const userId = usuario.rows[0].id;
    console.log(`✅ Usuario encontrado: ${usuario.rows[0].email} (${usuario.rows[0].nombre})`);

    // 2. Buscar el rol Platform Admin
    console.log('\n2. Buscando rol Platform Admin...');
    const platformAdminRole = await sql`
      SELECT id, nombre, tenant_id
      FROM roles
      WHERE nombre = 'Platform Admin'
      LIMIT 1
    `;

    if (platformAdminRole.rows.length === 0) {
      console.log('❌ Rol Platform Admin no encontrado');
      return;
    }

    const roleId = platformAdminRole.rows[0].id;
    console.log(`✅ Rol encontrado: ${platformAdminRole.rows[0].nombre} (${platformAdminRole.rows[0].tenant_id ? 'Tenant' : 'Global'})`);

    // 3. Verificar si ya tiene el rol
    console.log('\n3. Verificando roles actuales...');
    const rolesActuales = await sql`
      SELECT r.id, r.nombre, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      ORDER BY r.nombre
    `;

    console.log(`📊 Roles actuales: ${rolesActuales.rows.length}`);
    rolesActuales.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo})`);
    });

    // 4. Verificar si ya tiene Platform Admin
    const yaTienePlatformAdmin = rolesActuales.rows.some((rol: any) => rol.nombre === 'Platform Admin');
    
    if (yaTienePlatformAdmin) {
      console.log('✅ El usuario ya tiene el rol Platform Admin');
    } else {
      console.log('➕ Asignando rol Platform Admin...');
      
      // Remover roles existentes primero
      if (rolesActuales.rows.length > 0) {
        console.log('   🧹 Removiendo roles existentes...');
        await sql`
          DELETE FROM usuarios_roles 
          WHERE usuario_id = ${userId}
        `;
        console.log(`   ✅ Removidos ${rolesActuales.rows.length} roles`);
      }
      
      // Asignar Platform Admin
      await sql`
        INSERT INTO usuarios_roles (usuario_id, rol_id)
        VALUES (${userId}, ${roleId})
      `;
      console.log('✅ Rol Platform Admin asignado exitosamente');
    }

    // 5. Verificar el resultado final
    console.log('\n4. Verificando resultado final...');
    const rolesFinales = await sql`
      SELECT r.id, r.nombre, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      ORDER BY r.nombre
    `;

    console.log(`📊 Roles finales: ${rolesFinales.rows.length}`);
    rolesFinales.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo})`);
    });

    // 6. Probar la función de permisos
    console.log('\n5. Probando función de permisos...');
    const tienePermisos = await sql`
      SELECT public.fn_usuario_tiene_permiso(${userId}, 'rbac.platform_admin') as allowed
    `;

    const resultado = tienePermisos.rows[0].allowed;
    console.log(`🔐 Permisos Platform Admin: ${resultado ? '✅ SÍ' : '❌ NO'}`);

    if (resultado) {
      console.log('✅ El usuario tiene todos los permisos necesarios');
    } else {
      console.log('⚠️  El usuario no tiene permisos Platform Admin');
    }

    console.log('\n🎉 Restauración completada!');
    console.log('\n💡 El usuario carlos.irigoyen@gard.cl ahora tiene el rol Platform Admin');

  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
    throw error;
  }
}

restaurarPlatformAdmin().then(() => {
  console.log('\n🏁 Proceso completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
