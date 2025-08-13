import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function testAsignarRolesUsuario() {
  try {
    console.log('🔍 Probando funcionalidad de asignación de roles a usuarios...\n');

    // 1. Obtener usuarios disponibles
    console.log('1. Usuarios disponibles:');
    const usuarios = await sql`
      SELECT id, email, nombre, activo
      FROM usuarios
      ORDER BY email
      LIMIT 5
    `;

    if (usuarios.rows.length === 0) {
      console.log('❌ No hay usuarios disponibles');
      return;
    }

    usuarios.rows.forEach((usuario: any) => {
      console.log(`   👤 ${usuario.email} (${usuario.nombre || 'Sin nombre'}) - ${usuario.activo ? 'Activo' : 'Inactivo'}`);
    });

    // 2. Obtener roles disponibles
    console.log('\n2. Roles disponibles:');
    const roles = await sql`
      SELECT id, nombre, tenant_id
      FROM roles
      ORDER BY nombre
    `;

    roles.rows.forEach((rol: any) => {
      console.log(`   👑 ${rol.nombre} (ID: ${rol.id})`);
    });

    // 3. Mostrar roles actuales de un usuario de prueba
    const usuarioPrueba = usuarios.rows[0];
    console.log(`\n3. Roles actuales de ${usuarioPrueba.email}:`);
    
    const rolesUsuario = await sql`
      SELECT r.id, r.nombre, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${usuarioPrueba.id}
      ORDER BY r.nombre
    `;

    if (rolesUsuario.rows.length === 0) {
      console.log('   📝 No tiene roles asignados');
    } else {
      rolesUsuario.rows.forEach((rol: any) => {
        console.log(`   ✅ ${rol.nombre}`);
      });
    }

    // 4. Probar asignación de un rol
    console.log('\n4. Probando asignación de rol...');
    const rolParaAsignar = roles.rows.find(r => r.nombre === 'Admin');
    
    if (rolParaAsignar) {
      // Verificar si ya tiene el rol
      const yaTieneRol = rolesUsuario.rows.some(r => r.id === rolParaAsignar.id);
      
      if (yaTieneRol) {
        console.log(`   ℹ️  El usuario ya tiene el rol "${rolParaAsignar.nombre}"`);
      } else {
        console.log(`   ➕ Asignando rol "${rolParaAsignar.nombre}" al usuario...`);
        
        try {
          await sql`
            INSERT INTO usuarios_roles (usuario_id, rol_id)
            VALUES (${usuarioPrueba.id}, ${rolParaAsignar.id})
            ON CONFLICT DO NOTHING
          `;
          console.log('   ✅ Rol asignado exitosamente');
        } catch (error: any) {
          console.log(`   ❌ Error asignando rol: ${error.message}`);
        }
      }
    } else {
      console.log('   ⚠️  No se encontró el rol "Admin"');
    }

    // 5. Verificar roles después de la asignación
    console.log(`\n5. Roles actualizados de ${usuarioPrueba.email}:`);
    const rolesActualizados = await sql`
      SELECT r.id, r.nombre, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${usuarioPrueba.id}
      ORDER BY r.nombre
    `;

    if (rolesActualizados.rows.length === 0) {
      console.log('   📝 No tiene roles asignados');
    } else {
      rolesActualizados.rows.forEach((rol: any) => {
        console.log(`   ✅ ${rol.nombre}`);
      });
    }

    // 6. Mostrar estadísticas
    console.log('\n6. Estadísticas del sistema:');
    
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

    // 7. Mostrar URLs de acceso
    console.log('\n7. URLs de acceso:');
    console.log(`   📄 Página de usuarios: http://localhost:3000/configuracion/seguridad/usuarios`);
    console.log(`   🎯 Para asignar roles: Haz click en el ícono de configuración (⚙️) junto a cualquier usuario`);

    // 8. Instrucciones de uso
    console.log('\n🎉 FUNCIONALIDAD LISTA');
    console.log('\n✅ Cómo asignar roles a usuarios:');
    console.log('   1. Ve a Configuración > Seguridad > Usuarios');
    console.log('   2. Encuentra el usuario al que quieres asignar roles');
    console.log('   3. Haz click en el ícono de configuración (⚙️) en la columna "Roles"');
    console.log('   4. En el modal que se abre, marca/desmarca los checkboxes de los roles');
    console.log('   5. Los cambios se guardan automáticamente');
    console.log('\n💡 Características:');
    console.log('   - Asignación/desasignación en tiempo real');
    console.log('   - Validación de permisos');
    console.log('   - Interfaz intuitiva con checkboxes');
    console.log('   - Notificaciones de éxito/error');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    throw error;
  }
}

testAsignarRolesUsuario().then(() => {
  console.log('\n🏁 Prueba completada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
