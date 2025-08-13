#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function asignarPermisosAdmin() {
  try {
    console.log('🔐 Asignando todos los permisos al usuario carlos.irigoyen@gard.cl...\n');

    // 1. Verificar que el usuario existe
    console.log('1. Verificando usuario carlos.irigoyen@gard.cl...');
    const usuario = await sql`
      SELECT id, email, nombre, apellido, rol
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

    // 2. Obtener todos los permisos disponibles
    console.log('\n2. Obteniendo todos los permisos disponibles...');
    const permisos = await sql`
      SELECT id, clave, descripcion
      FROM permisos
      ORDER BY clave
    `;

    console.log(`📊 Total permisos disponibles: ${permisos.rows.length}`);
    permisos.rows.forEach((permiso: any) => {
      console.log(`   - ${permiso.clave}: ${permiso.descripcion}`);
    });

    // 3. Obtener roles disponibles
    console.log('\n3. Obteniendo roles disponibles...');
    const roles = await sql`
      SELECT id, nombre, descripcion, tenant_id
      FROM roles
      ORDER BY nombre
    `;

    console.log(`📊 Total roles disponibles: ${roles.rows.length}`);
    roles.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo}): ${rol.descripcion}`);
    });

    // 4. Asignar rol Platform Admin si no lo tiene
    console.log('\n4. Asignando rol Platform Admin...');
    const platformAdminRole = roles.rows.find((r: any) => r.nombre === 'Platform Admin');
    
    if (platformAdminRole) {
      const yaTieneRol = await sql`
        SELECT 1 FROM usuarios_roles 
        WHERE usuario_id = ${userId} AND rol_id = ${platformAdminRole.id}
      `;

      if (yaTieneRol.rows.length === 0) {
        await sql`
          INSERT INTO usuarios_roles (usuario_id, rol_id)
          VALUES (${userId}, ${platformAdminRole.id})
          ON CONFLICT DO NOTHING
        `;
        console.log(`✅ Rol Platform Admin asignado`);
      } else {
        console.log(`ℹ️  Ya tiene el rol Platform Admin`);
      }
    } else {
      console.log(`❌ No se encontró el rol Platform Admin`);
    }

    // 5. Asignar todos los roles disponibles
    console.log('\n5. Asignando todos los roles disponibles...');
    let rolesAsignados = 0;
    
    for (const rol of roles.rows) {
      try {
        const yaTieneRol = await sql`
          SELECT 1 FROM usuarios_roles 
          WHERE usuario_id = ${userId} AND rol_id = ${rol.id}
        `;

        if (yaTieneRol.rows.length === 0) {
          await sql`
            INSERT INTO usuarios_roles (usuario_id, rol_id)
            VALUES (${userId}, ${rol.id})
            ON CONFLICT DO NOTHING
          `;
          console.log(`✅ Rol ${rol.nombre} asignado`);
          rolesAsignados++;
        } else {
          console.log(`ℹ️  Ya tiene el rol ${rol.nombre}`);
        }
      } catch (error: any) {
        console.log(`❌ Error asignando rol ${rol.nombre}: ${error.message}`);
      }
    }

    // 6. Verificar permisos finales
    console.log('\n6. Verificando permisos finales...');
    const permisosAVerificar = [
      'rbac.platform_admin',
      'usuarios.manage',
      'roles.manage',
      'permisos.read',
      'permisos.write',
      'rbac.tenants.read',
      'rbac.tenants.write',
      'guardias.view',
      'guardias.edit',
      'clientes.view',
      'clientes.edit',
      'instalaciones.view',
      'instalaciones.edit',
      'turnos.view',
      'turnos.edit',
      'payroll.view',
      'payroll.edit',
      'maestros.view',
      'maestros.edit',
      'documentos.manage',
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

    // 7. Resumen final
    console.log('\n7. Resumen final:');
    const rolesFinales = await sql`
      SELECT r.nombre, r.descripcion
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      ORDER BY r.nombre
    `;

    console.log(`📊 Roles asignados: ${rolesFinales.rows.length}`);
    rolesFinales.rows.forEach((rol: any) => {
      console.log(`   - ${rol.nombre}: ${rol.descripcion}`);
    });

    console.log('\n🎉 Usuario carlos.irigoyen@gard.cl ahora tiene todos los permisos disponibles');
    console.log('✅ Puedes crear usuarios, asignar roles y acceder a todas las funcionalidades');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

asignarPermisosAdmin().then(() => {
  console.log('\n🏁 Proceso completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
