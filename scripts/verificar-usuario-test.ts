#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function verificarUsuarioTest() {
  try {
    console.log('🔍 Verificando usuario test@test.cl...\n');

    // 1. Buscar usuario por email
    console.log('1. Buscando usuario test@test.cl...');
    const usuario = await sql`
      SELECT 
        id,
        email,
        nombre,
        apellido,
        rol,
        activo,
        fecha_creacion,
        tenant_id
      FROM usuarios
      WHERE email = 'test@test.cl'
      LIMIT 1
    `;

    if (usuario.rows.length === 0) {
      console.log('❌ Usuario test@test.cl NO encontrado en la base de datos');
      console.log('');
      
      // Mostrar todos los usuarios para ver qué hay
      console.log('📋 Listando todos los usuarios en la base de datos:');
      const todosUsuarios = await sql`
        SELECT 
          email,
          nombre,
          apellido,
          rol,
          activo,
          fecha_creacion
        FROM usuarios
        ORDER BY fecha_creacion DESC
        LIMIT 10
      `;
      
      todosUsuarios.rows.forEach((u: any) => {
        const estado = u.activo ? '🟢' : '🔴';
        console.log(`   ${estado} ${u.email} (${u.nombre} ${u.apellido}) - ${u.rol}`);
      });
      
      return;
    }

    const user = usuario.rows[0];
    console.log('✅ Usuario encontrado:');
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   👤 Nombre: ${user.nombre} ${user.apellido}`);
    console.log(`   🔐 Rol: ${user.rol}`);
    console.log(`   📅 Creado: ${user.fecha_creacion}`);
    console.log(`   🟢 Activo: ${user.activo ? 'Sí' : 'No'}`);
    console.log(`   🏢 Tenant ID: ${user.tenant_id}`);

    // 2. Verificar roles RBAC asignados
    console.log('\n2. Verificando roles RBAC asignados...');
    const rolesRBAC = await sql`
      SELECT 
        r.id,
        r.nombre,
        r.descripcion,
        r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${user.id}
      ORDER BY r.nombre
    `;

    if (rolesRBAC.rows.length === 0) {
      console.log('   ⚠️  No tiene roles RBAC asignados');
    } else {
      console.log(`   📊 Roles RBAC (${rolesRBAC.rows.length}):`);
      rolesRBAC.rows.forEach((rol: any) => {
        const tipo = rol.tenant_id ? 'Tenant' : 'Global';
        console.log(`      - ${rol.nombre} (${tipo}): ${rol.descripcion}`);
      });
    }

    // 3. Verificar permisos específicos
    console.log('\n3. Verificando permisos específicos...');
    const permisosAVerificar = [
      'guardias.view',
      'guardias.edit',
      'clientes.view',
      'instalaciones.view',
      'rbac.platform_admin'
    ];

    for (const permiso of permisosAVerificar) {
      const tienePermiso = await sql`
        SELECT public.fn_usuario_tiene_permiso(${user.email}, ${permiso}) as tiene
      `;
      const resultado = tienePermiso.rows[0]?.tiene ? '✅' : '❌';
      console.log(`   ${resultado} ${permiso}`);
    }

    // 4. Verificar si aparece en el frontend (simular query de usuarios)
    console.log('\n4. Simulando query del frontend...');
    const usuariosFrontend = await sql`
      SELECT 
        id,
        email,
        nombre,
        apellido,
        rol,
        activo,
        fecha_creacion
      FROM usuarios
      WHERE activo = true
      ORDER BY fecha_creacion DESC
      LIMIT 20
    `;

    const apareceEnFrontend = usuariosFrontend.rows.some((u: any) => u.email === 'test@test.cl');
    console.log(`   ${apareceEnFrontend ? '✅' : '❌'} Aparece en lista del frontend`);

    if (!apareceEnFrontend) {
      console.log('   📋 Usuarios que SÍ aparecen en el frontend:');
      usuariosFrontend.rows.forEach((u: any) => {
        console.log(`      - ${u.email} (${u.nombre} ${u.apellido})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarUsuarioTest().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
