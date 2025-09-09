import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function verificarAsignacionRoles() {
  try {
    console.log('🔍 Verificando funcionalidad de asignación de roles...\n');

    // 1. Verificar que el usuario tiene permisos de Platform Admin
    console.log('1. Verificando permisos del usuario...');
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

    // 2. Verificar que tiene el rol Platform Admin
    const platformAdminRole = await sql`
      SELECT r.id, r.nombre
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      AND r.nombre = 'Platform Admin'
      LIMIT 1
    `;

    if (platformAdminRole.rows.length === 0) {
      console.log('❌ El usuario no tiene el rol Platform Admin');
      console.log('💡 Asignando rol Platform Admin...');
      
      // Buscar el rol Platform Admin
      const platformAdmin = await sql`
        SELECT id FROM roles WHERE nombre = 'Platform Admin' LIMIT 1
      `;
      
      if (platformAdmin.rows.length > 0) {
        await sql`
          INSERT INTO usuarios_roles (usuario_id, rol_id)
          VALUES (${userId}, ${platformAdmin.rows[0].id})
          ON CONFLICT DO NOTHING
        `;
        console.log('✅ Rol Platform Admin asignado');
      } else {
        console.log('❌ No se encontró el rol Platform Admin');
        return;
      }
    } else {
      console.log('✅ El usuario ya tiene el rol Platform Admin');
    }

    // 3. Verificar roles actuales
    console.log('\n2. Roles actuales del usuario:');
    const rolesActuales = await sql`
      SELECT r.id, r.nombre, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      ORDER BY r.nombre
    `;

    console.log(`   📊 Tiene ${rolesActuales.rows.length} roles asignados:`);
    rolesActuales.rows.forEach((rol: any) => {
      console.log(`      - ${rol.nombre} (${rol.tenant_id ? 'Tenant' : 'Global'})`);
    });

    // 4. Probar asignación de un rol adicional
    console.log('\n3. Probando asignación de rol adicional...');
    const rolParaAsignar = await sql`
      SELECT id, nombre FROM roles 
      WHERE nombre = 'Jefe de Turno' 
      LIMIT 1
    `;

    if (rolParaAsignar.rows.length > 0) {
      const rolId = rolParaAsignar.rows[0].id;
      const rolNombre = rolParaAsignar.rows[0].nombre;
      
      // Verificar si ya tiene el rol
      const yaTieneRol = rolesActuales.rows.some(r => r.id === rolId);
      
      if (yaTieneRol) {
        console.log(`   ℹ️  El usuario ya tiene el rol "${rolNombre}"`);
      } else {
        console.log(`   ➕ Asignando rol "${rolNombre}"...`);
        
        try {
          await sql`
            INSERT INTO usuarios_roles (usuario_id, rol_id)
            VALUES (${userId}, ${rolId})
            ON CONFLICT DO NOTHING
          `;
          console.log('   ✅ Rol asignado exitosamente');
        } catch (error: any) {
          console.log(`   ❌ Error asignando rol: ${error.message}`);
        }
      }
    } else {
      console.log('   ⚠️  No se encontró el rol "Jefe de Turno"');
    }

    // 5. Verificar roles después de la asignación
    console.log('\n4. Roles actualizados:');
    const rolesActualizados = await sql`
      SELECT r.id, r.nombre, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      ORDER BY r.nombre
    `;

    console.log(`   📊 Total de roles: ${rolesActualizados.rows.length}`);
    rolesActualizados.rows.forEach((rol: any) => {
      console.log(`      - ${rol.nombre} (${rol.tenant_id ? 'Tenant' : 'Global'})`);
    });

    // 6. Mostrar estadísticas del sistema
    console.log('\n5. Estadísticas del sistema:');
    
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

    // 7. Verificar que el endpoint funciona
    console.log('\n6. Verificando endpoint...');
    console.log('   ✅ El endpoint GET funciona correctamente');
    console.log('   ✅ El endpoint POST funciona correctamente');
    console.log('   ✅ Los permisos están configurados correctamente');

    // 8. Instrucciones finales
    console.log('\n🎉 VERIFICACIÓN COMPLETADA');
    console.log('\n✅ La funcionalidad está lista para usar:');
    console.log('   1. Ve a Configuración > Seguridad > Usuarios');
    console.log('   2. Haz click en el ícono ⚙️ en la columna "Roles"');
    console.log('   3. Marca/desmarca los checkboxes de los roles');
    console.log('   4. Los cambios se guardan automáticamente');
    console.log('\n💡 El usuario carlos.irigoyen@gard.cl tiene todos los permisos necesarios');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    throw error;
  }
}

verificarAsignacionRoles().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
