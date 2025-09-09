#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function verificarPermisosFinales() {
  try {
    console.log('🔍 Verificando permisos finales del usuario carlos.irigoyen@gard.cl...\n');

    // 1. Verificar usuario
    console.log('1. Verificando usuario...');
    const usuario = await sql`
      SELECT id, email, nombre, apellido
      FROM usuarios
      WHERE email = 'carlos.irigoyen@gard.cl'
      LIMIT 1
    `;

    if (usuario.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    const userId = usuario.rows[0].id;
    console.log(`✅ Usuario: ${usuario.rows[0].email} (${usuario.rows[0].nombre} ${usuario.rows[0].apellido})`);

    // 2. Verificar roles asignados
    console.log('\n2. Verificando roles asignados...');
    const roles = await sql`
      SELECT r.nombre, r.descripcion, r.tenant_id
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      ORDER BY r.nombre
    `;

    console.log(`📊 Roles asignados: ${roles.rows.length}`);
    roles.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo})`);
      console.log(`     📝 ${rol.descripcion}`);
    });

    // 3. Verificar permisos específicos
    console.log('\n3. Verificando permisos específicos...');
    const permisosAVerificar = [
      // Permisos críticos de administración
      'rbac.platform_admin',
      'usuarios.manage',
      'rbac.roles.create',
      'rbac.roles.read',
      'rbac.roles.write',
      'rbac.roles.delete',
      'rbac.permisos.read',
      'rbac.tenants.create',
      'rbac.tenants.read',
      'config.manage',
      
      // Permisos de módulos principales
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
      
      // Permisos de pautas
      'pauta-diaria.view',
      'pauta-diaria.edit',
      'pauta-mensual.view',
      'pauta-mensual.edit',
      
      // Permisos de reportes
      'reportes.asistencia',
      'reportes.turnos',
      'reportes.payroll',
      'reportes.export',
      
      // Permisos de auditoría
      'auditoria.logs',
      'auditoria.export'
    ];

    console.log('🔍 Verificando permisos específicos:');
    let permisosConcedidos = 0;
    let permisosDenegados = 0;

    for (const permiso of permisosAVerificar) {
      try {
        const tienePermiso = await sql`
          SELECT public.fn_usuario_tiene_permiso(${usuario.rows[0].email}, ${permiso}) as tiene
        `;
        const resultado = tienePermiso.rows[0]?.tiene;
        const icono = resultado ? '✅' : '❌';
        console.log(`   ${icono} ${permiso}`);
        
        if (resultado) {
          permisosConcedidos++;
        } else {
          permisosDenegados++;
        }
      } catch (error: any) {
        console.log(`   ❌ ${permiso} (error: ${error.message})`);
        permisosDenegados++;
      }
    }

    // 4. Resumen de permisos
    console.log('\n4. Resumen de permisos:');
    console.log(`   ✅ Permisos concedidos: ${permisosConcedidos}`);
    console.log(`   ❌ Permisos denegados: ${permisosDenegados}`);
    console.log(`   📊 Total verificado: ${permisosAVerificar.length}`);

    // 5. Verificar si puede crear usuarios
    console.log('\n5. Verificando capacidad de crear usuarios...');
    const puedeCrearUsuarios = await sql`
      SELECT public.fn_usuario_tiene_permiso(${usuario.rows[0].email}, 'usuarios.manage') as puede
    `;

    if (puedeCrearUsuarios.rows[0]?.puede) {
      console.log('   ✅ Puede crear y gestionar usuarios');
    } else {
      console.log('   ❌ NO puede crear usuarios');
    }

    // 6. Verificar si puede gestionar roles
    console.log('\n6. Verificando capacidad de gestionar roles...');
    const puedeGestionarRoles = await sql`
      SELECT public.fn_usuario_tiene_permiso(${usuario.rows[0].email}, 'rbac.roles.write') as puede
    `;

    if (puedeGestionarRoles.rows[0]?.puede) {
      console.log('   ✅ Puede crear y gestionar roles');
    } else {
      console.log('   ❌ NO puede gestionar roles');
    }

    // 7. Verificar si puede acceder a configuración
    console.log('\n7. Verificando acceso a configuración...');
    const puedeConfigurar = await sql`
      SELECT public.fn_usuario_tiene_permiso(${usuario.rows[0].email}, 'config.manage') as puede
    `;

    if (puedeConfigurar.rows[0]?.puede) {
      console.log('   ✅ Puede acceder a configuración');
    } else {
      console.log('   ❌ NO puede acceder a configuración');
    }

    // 8. Estado final
    console.log('\n8. Estado final:');
    if (permisosDenegados === 0) {
      console.log('🎉 PERFECTO: El usuario tiene todos los permisos necesarios');
      console.log('✅ Puede crear usuarios, gestionar roles y acceder a todas las funcionalidades');
    } else {
      console.log('⚠️  ATENCIÓN: Faltan algunos permisos');
      console.log('🔧 Se recomienda revisar la configuración de roles');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarPermisosFinales().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
