import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function verificarSistemaRoles() {
  try {
    console.log('🔍 Verificando sistema de roles...\n');

    // 1. Verificar usuario principal
    console.log('1. Verificando usuario principal...');
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
    console.log(`✅ Usuario: ${usuario.rows[0].email} (${usuario.rows[0].nombre})`);

    // 2. Verificar roles disponibles
    console.log('\n2. Roles disponibles en el sistema:');
    const roles = await sql`
      SELECT id, nombre, descripcion, tenant_id
      FROM roles
      ORDER BY nombre
    `;

    console.log(`📊 Total roles: ${roles.rows.length}`);
    roles.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo}): ${rol.descripcion}`);
    });

    // 3. Verificar roles del usuario
    console.log('\n3. Roles del usuario:');
    const rolesUsuario = await sql`
      SELECT r.id, r.nombre, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      ORDER BY r.nombre
    `;

    console.log(`📊 Roles asignados: ${rolesUsuario.rows.length}`);
    if (rolesUsuario.rows.length === 0) {
      console.log('   ⚠️  El usuario no tiene roles asignados');
    } else {
      rolesUsuario.rows.forEach((rol: any) => {
        const tipo = rol.tenant_id ? 'Tenant' : 'Global';
        console.log(`   - ${rol.nombre} (${tipo})`);
      });
    }

    // 4. Verificar permisos
    console.log('\n4. Verificando permisos...');
    const permisos = await sql`
      SELECT 
        public.fn_usuario_tiene_permiso(${userId}, 'rbac.platform_admin') as platform_admin,
        public.fn_usuario_tiene_permiso(${userId}, 'rbac.roles.read') as roles_read,
        public.fn_usuario_tiene_permiso(${userId}, 'rbac.roles.write') as roles_write,
        public.fn_usuario_tiene_permiso(${userId}, 'usuarios.manage') as usuarios_manage
    `;

    const perm = permisos.rows[0];
    console.log(`🔐 Platform Admin: ${perm.platform_admin ? '✅ SÍ' : '❌ NO'}`);
    console.log(`🔐 Roles Read: ${perm.roles_read ? '✅ SÍ' : '❌ NO'}`);
    console.log(`🔐 Roles Write: ${perm.roles_write ? '✅ SÍ' : '❌ NO'}`);
    console.log(`🔐 Usuarios Manage: ${perm.usuarios_manage ? '✅ SÍ' : '❌ NO'}`);

    // 5. Si no tiene Platform Admin, asignarlo
    if (!perm.platform_admin) {
      console.log('\n5. Asignando rol Platform Admin...');
      
      // Buscar rol Platform Admin
      const platformAdminRole = roles.rows.find((r: any) => r.nombre === 'Platform Admin');
      
      if (platformAdminRole) {
        // Remover roles existentes
        if (rolesUsuario.rows.length > 0) {
          await sql`
            DELETE FROM usuarios_roles 
            WHERE usuario_id = ${userId}
          `;
          console.log(`   🧹 Removidos ${rolesUsuario.rows.length} roles existentes`);
        }
        
        // Asignar Platform Admin
        await sql`
          INSERT INTO usuarios_roles (usuario_id, rol_id)
          VALUES (${userId}, ${platformAdminRole.id})
        `;
        console.log('   ✅ Rol Platform Admin asignado');
      } else {
        console.log('   ❌ No se encontró el rol Platform Admin');
      }
    } else {
      console.log('\n5. ✅ El usuario ya tiene rol Platform Admin');
    }

    // 6. Verificar estado final
    console.log('\n6. Estado final del sistema:');
    
    // Verificar roles finales
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

    // Verificar permisos finales
    const permisosFinales = await sql`
      SELECT public.fn_usuario_tiene_permiso(${userId}, 'rbac.platform_admin') as platform_admin
    `;

    const tienePermisos = permisosFinales.rows[0].platform_admin;
    console.log(`🔐 Permisos Platform Admin: ${tienePermisos ? '✅ SÍ' : '❌ NO'}`);

    // 7. Estadísticas del sistema
    console.log('\n7. Estadísticas del sistema:');
    const totalUsuarios = await sql`SELECT COUNT(*) as total FROM usuarios`;
    const totalRoles = await sql`SELECT COUNT(*) as total FROM roles`;
    const totalAsignaciones = await sql`SELECT COUNT(*) as total FROM usuarios_roles`;
    const usuariosConRoles = await sql`
      SELECT COUNT(DISTINCT usuario_id) as total 
      FROM usuarios_roles
    `;

    console.log(`   📊 Total usuarios: ${totalUsuarios.rows[0].total}`);
    console.log(`   📊 Total roles: ${totalRoles.rows[0].total}`);
    console.log(`   📊 Total asignaciones: ${totalAsignaciones.rows[0].total}`);
    console.log(`   📊 Usuarios con roles: ${usuariosConRoles.rows[0].total}`);

    // 8. Verificar usuarios con múltiples roles
    const usuariosMultiples = await sql`
      SELECT 
        u.email,
        COUNT(ur.rol_id) as total_roles
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      GROUP BY u.id, u.email
      HAVING COUNT(ur.rol_id) > 1
      ORDER BY u.email
    `;

    if (usuariosMultiples.rows.length > 0) {
      console.log(`\n⚠️  Usuarios con múltiples roles: ${usuariosMultiples.rows.length}`);
      usuariosMultiples.rows.forEach((usuario: any) => {
        console.log(`   - ${usuario.email}: ${usuario.total_roles} roles`);
      });
    } else {
      console.log('\n✅ Todos los usuarios tienen máximo 1 rol');
    }

    // 9. Resumen final
    console.log('\n🎉 VERIFICACIÓN COMPLETADA');
    
    if (tienePermisos) {
      console.log('\n✅ El sistema está funcionando correctamente:');
      console.log('   - Usuario tiene rol Platform Admin');
      console.log('   - Permisos funcionando correctamente');
      console.log('   - Sistema de roles operativo');
      console.log('\n💡 Puedes usar la interfaz de asignación de roles');
    } else {
      console.log('\n❌ El sistema necesita corrección:');
      console.log('   - Usuario no tiene permisos Platform Admin');
      console.log('   - Revisar asignación de roles');
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    throw error;
  }
}

verificarSistemaRoles().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
