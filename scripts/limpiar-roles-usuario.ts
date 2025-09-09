#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function limpiarRolesUsuario() {
  try {
    console.log('🧹 Limpiando roles del usuario carlos.irigoyen@gard.cl...\n');

    // 1. Verificar que el usuario existe
    console.log('1. Verificando usuario carlos.irigoyen@gard.cl...');
    const usuario = await sql`
      SELECT id, email, nombre, apellido
      FROM usuarios
      WHERE email = 'carlos.irigoyen@gard.cl'
      LIMIT 1
    `;

    if (usuario.rows.length === 0) {
      console.log('❌ Usuario carlos.irigoyen@gard.cl no encontrado');
      return;
    }

    const userId = usuario.rows[0].id;
    console.log(`✅ Usuario encontrado: ${usuario.rows[0].email} (${usuario.rows[0].nombre} ${usuario.rows[0].apellido})`);

    // 2. Verificar roles actuales
    console.log('\n2. Verificando roles actuales...');
    const rolesActuales = await sql`
      SELECT r.id, r.nombre, r.descripcion, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      ORDER BY r.nombre
    `;

    console.log(`📊 Roles actuales: ${rolesActuales.rows.length}`);
    rolesActuales.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo}): ${rol.descripcion || 'Sin descripción'}`);
    });

    // 3. Obtener rol Platform Admin
    console.log('\n3. Obteniendo rol Platform Admin...');
    const platformAdminRole = await sql`
      SELECT id, nombre, descripcion
      FROM roles
      WHERE nombre = 'Platform Admin'
      LIMIT 1
    `;

    if (platformAdminRole.rows.length === 0) {
      console.log('❌ Rol Platform Admin no encontrado');
      return;
    }

    const platformAdminId = platformAdminRole.rows[0].id;
    console.log(`✅ Rol Platform Admin encontrado: ${platformAdminRole.rows[0].nombre}`);

    // 4. Eliminar todos los roles excepto Platform Admin
    console.log('\n4. Eliminando roles innecesarios...');
    const rolesAEliminar = rolesActuales.rows.filter((rol: any) => rol.id !== platformAdminId);
    
    if (rolesAEliminar.length === 0) {
      console.log('ℹ️  El usuario ya solo tiene el rol Platform Admin');
    } else {
      console.log(`🗑️  Eliminando ${rolesAEliminar.length} roles innecesarios...`);
      
      for (const rol of rolesAEliminar) {
        await sql`
          DELETE FROM usuarios_roles 
          WHERE usuario_id = ${userId} AND rol_id = ${rol.id}
        `;
        console.log(`   ✅ Eliminado: ${rol.nombre}`);
      }
    }

    // 5. Asegurar que tiene Platform Admin
    console.log('\n5. Asegurando rol Platform Admin...');
    const yaTienePlatformAdmin = rolesActuales.rows.some((rol: any) => rol.id === platformAdminId);
    
    if (!yaTienePlatformAdmin) {
      await sql`
        INSERT INTO usuarios_roles (usuario_id, rol_id)
        VALUES (${userId}, ${platformAdminId})
        ON CONFLICT DO NOTHING
      `;
      console.log('✅ Rol Platform Admin asignado');
    } else {
      console.log('ℹ️  Ya tiene el rol Platform Admin');
    }

    // 6. Verificar resultado final
    console.log('\n6. Verificando resultado final...');
    const rolesFinales = await sql`
      SELECT r.nombre, r.descripcion, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      ORDER BY r.nombre
    `;

    console.log(`📊 Roles finales: ${rolesFinales.rows.length}`);
    rolesFinales.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo}): ${rol.descripcion || 'Sin descripción'}`);
    });

    // 7. Verificar permisos
    console.log('\n7. Verificando permisos del Platform Admin...');
    const permisosAVerificar = [
      'rbac.platform_admin',
      'usuarios.manage',
      'roles.manage',
      'permisos.read',
      'rbac.tenants.read',
      'rbac.tenants.write',
      'config.manage'
    ];

    console.log('🔍 Verificando permisos específicos:');
    for (const permiso of permisosAVerificar) {
      try {
        const tienePermiso = await sql`
          SELECT public.fn_usuario_tiene_permiso(${usuario.rows[0].email}, ${permiso}) as tiene
        `;
        const resultado = tienePermiso.rows[0]?.tiene ? '✅' : '❌';
        console.log(`   ${resultado} ${permiso}`);
      } catch (error: any) {
        console.log(`   ❌ ${permiso} (error: ${error.message})`);
      }
    }

    console.log('\n🎉 Usuario carlos.irigoyen@gard.cl ahora tiene solo el rol Platform Admin');
    console.log('✅ Listo para crear roles específicos');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

limpiarRolesUsuario().then(() => {
  console.log('\n🏁 Limpieza completada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
