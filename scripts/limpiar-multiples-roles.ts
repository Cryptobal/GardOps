import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function limpiarMultiplesRoles() {
  try {
    console.log('🧹 Limpiando usuarios con múltiples roles...\n');

    // 1. Encontrar usuarios con múltiples roles
    console.log('1. Buscando usuarios con múltiples roles...');
    const usuariosConMultiplesRoles = await sql`
      SELECT 
        u.id,
        u.email,
        u.nombre,
        COUNT(ur.rol_id) as total_roles
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      GROUP BY u.id, u.email, u.nombre
      HAVING COUNT(ur.rol_id) > 1
      ORDER BY u.email
    `;

    if (usuariosConMultiplesRoles.rows.length === 0) {
      console.log('✅ No hay usuarios con múltiples roles');
      return;
    }

    console.log(`📊 Encontrados ${usuariosConMultiplesRoles.rows.length} usuarios con múltiples roles:`);
    usuariosConMultiplesRoles.rows.forEach((usuario: any) => {
      console.log(`   - ${usuario.email} (${usuario.nombre}): ${usuario.total_roles} roles`);
    });

    // 2. Para cada usuario, mostrar sus roles actuales
    console.log('\n2. Roles actuales por usuario:');
    for (const usuario of usuariosConMultiplesRoles.rows) {
      const roles = await sql`
        SELECT 
          r.id,
          r.nombre,
          r.tenant_id,
          ur.created_at
        FROM usuarios_roles ur
        JOIN roles r ON r.id = ur.rol_id
        WHERE ur.usuario_id = ${usuario.id}
        ORDER BY ur.created_at ASC
      `;

      console.log(`\n   👤 ${usuario.email}:`);
      roles.rows.forEach((rol: any, index: number) => {
        const tipo = rol.tenant_id ? 'Tenant' : 'Global';
        const marcador = index === 0 ? '✅ (MANTENER)' : '❌ (ELIMINAR)';
        console.log(`      ${index + 1}. ${rol.nombre} (${tipo}) - ${marcador}`);
      });
    }

    // 3. Confirmar la limpieza
    console.log('\n3. Procediendo a limpiar múltiples roles...');
    
    let totalLimpios = 0;
    for (const usuario of usuariosConMultiplesRoles.rows) {
      console.log(`\n   🧹 Limpiando roles de ${usuario.email}...`);
      
      // Obtener todos los roles del usuario
      const roles = await sql`
        SELECT 
          ur.rol_id,
          r.nombre,
          ur.created_at
        FROM usuarios_roles ur
        JOIN roles r ON r.id = ur.rol_id
        WHERE ur.usuario_id = ${usuario.id}
        ORDER BY ur.created_at ASC
      `;

      if (roles.rows.length > 1) {
        // Mantener solo el primer rol (más antiguo)
        const rolAMantener = roles.rows[0];
        const rolesAEliminar = roles.rows.slice(1);

        console.log(`      ✅ Manteniendo: ${rolAMantener.nombre}`);
        
        // Eliminar roles adicionales
        for (const rol of rolesAEliminar) {
          await sql`
            DELETE FROM usuarios_roles 
            WHERE usuario_id = ${usuario.id} 
            AND rol_id = ${rol.rol_id}
          `;
          console.log(`      ❌ Eliminando: ${rol.nombre}`);
        }

        totalLimpios += rolesAEliminar.length;
      }
    }

    // 4. Verificar el resultado
    console.log('\n4. Verificando resultado...');
    const usuariosDespues = await sql`
      SELECT 
        u.id,
        u.email,
        u.nombre,
        COUNT(ur.rol_id) as total_roles
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      GROUP BY u.id, u.email, u.nombre
      HAVING COUNT(ur.rol_id) > 1
      ORDER BY u.email
    `;

    if (usuariosDespues.rows.length === 0) {
      console.log('✅ Todos los usuarios ahora tienen máximo 1 rol');
    } else {
      console.log(`⚠️  Aún hay ${usuariosDespues.rows.length} usuarios con múltiples roles`);
    }

    // 5. Mostrar estadísticas finales
    console.log('\n5. Estadísticas finales:');
    const totalUsuarios = await sql`SELECT COUNT(*) as total FROM usuarios`;
    const totalAsignaciones = await sql`SELECT COUNT(*) as total FROM usuarios_roles`;
    const usuariosConRoles = await sql`
      SELECT COUNT(DISTINCT usuario_id) as total 
      FROM usuarios_roles
    `;

    console.log(`   📊 Total usuarios: ${totalUsuarios.rows[0].total}`);
    console.log(`   📊 Total asignaciones: ${totalAsignaciones.rows[0].total}`);
    console.log(`   📊 Usuarios con roles: ${usuariosConRoles.rows[0].total}`);
    console.log(`   🧹 Roles eliminados: ${totalLimpios}`);

    // 6. Mostrar usuarios con sus roles actuales
    console.log('\n6. Estado actual de usuarios con roles:');
    const usuariosConRolesActuales = await sql`
      SELECT 
        u.email,
        u.nombre,
        r.nombre as rol_nombre,
        r.tenant_id
      FROM usuarios u
      JOIN usuarios_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON r.id = ur.rol_id
      ORDER BY u.email
    `;

    usuariosConRolesActuales.rows.forEach((usuario: any) => {
      const tipo = usuario.tenant_id ? 'Tenant' : 'Global';
      console.log(`   👤 ${usuario.email}: ${usuario.rol_nombre} (${tipo})`);
    });

    console.log('\n🎉 Limpieza completada exitosamente!');
    console.log('\n💡 Ahora cada usuario tiene máximo 1 rol asignado.');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  }
}

limpiarMultiplesRoles().then(() => {
  console.log('\n🏁 Proceso completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
