#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function asignarRolCorrecto() {
  try {
    console.log('🔄 Asignando rol correcto al usuario carlos.irigoyen@gard.cl...\n');

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

    // 2. Verificar roles actuales
    console.log('\n2. Verificando roles actuales...');
    const rolesActuales = await sql`
      SELECT r.id, r.nombre, r.descripcion
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      ORDER BY r.nombre
    `;

    console.log(`📊 Roles actuales: ${rolesActuales.rows.length}`);
    rolesActuales.rows.forEach((rol: any) => {
      console.log(`   - ${rol.nombre}: ${rol.descripcion}`);
    });

    // 3. Obtener el rol correcto "Platform Admin (Global)"
    console.log('\n3. Obteniendo rol Platform Admin (Global)...');
    const rolCorrecto = await sql`
      SELECT id, nombre, descripcion
      FROM roles
      WHERE nombre = 'Platform Admin (Global)'
      LIMIT 1
    `;

    if (rolCorrecto.rows.length === 0) {
      console.log('❌ Rol Platform Admin (Global) no encontrado');
      return;
    }

    const rolCorrectoId = rolCorrecto.rows[0].id;
    console.log(`✅ Rol correcto encontrado: ${rolCorrecto.rows[0].nombre}`);

    // 4. Eliminar roles incorrectos
    console.log('\n4. Eliminando roles incorrectos...');
    for (const rol of rolesActuales.rows) {
      if (rol.nombre !== 'Platform Admin (Global)') {
        await sql`
          DELETE FROM usuarios_roles 
          WHERE usuario_id = ${userId} AND rol_id = ${rol.id}
        `;
        console.log(`   ✅ Eliminado: ${rol.nombre}`);
      }
    }

    // 5. Asignar rol correcto si no lo tiene
    console.log('\n5. Asignando rol correcto...');
    const yaTieneRolCorrecto = rolesActuales.rows.some((rol: any) => rol.id === rolCorrectoId);
    
    if (!yaTieneRolCorrecto) {
      await sql`
        INSERT INTO usuarios_roles (usuario_id, rol_id)
        VALUES (${userId}, ${rolCorrectoId})
        ON CONFLICT DO NOTHING
      `;
      console.log('✅ Rol Platform Admin (Global) asignado');
    } else {
      console.log('ℹ️  Ya tiene el rol correcto');
    }

    // 6. Verificar resultado final
    console.log('\n6. Verificando resultado final...');
    const rolesFinales = await sql`
      SELECT r.nombre, r.descripcion
      FROM usuarios_roles ur
      JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${userId}
      ORDER BY r.nombre
    `;

    console.log(`📊 Roles finales: ${rolesFinales.rows.length}`);
    rolesFinales.rows.forEach((rol: any) => {
      console.log(`   - ${rol.nombre}: ${rol.descripcion}`);
    });

    // 7. Verificar permisos
    console.log('\n7. Verificando permisos...');
    const permisosAVerificar = [
      'rbac.platform_admin',
      'usuarios.manage',
      'config.manage',
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
      'auditoria.logs'
    ];

    console.log('🔍 Verificando permisos críticos:');
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

    // 8. Resumen final
    console.log('\n8. Resumen final:');
    console.log(`   ✅ Permisos concedidos: ${permisosConcedidos}`);
    console.log(`   ❌ Permisos denegados: ${permisosDenegados}`);
    console.log(`   📊 Total verificado: ${permisosAVerificar.length}`);

    if (permisosDenegados === 0) {
      console.log('\n🎉 PERFECTO: El usuario tiene todos los permisos necesarios');
      console.log('✅ Puede crear usuarios, gestionar roles y acceder a todas las funcionalidades');
    } else {
      console.log('\n⚠️  ATENCIÓN: Aún faltan algunos permisos');
      console.log('🔧 Se recomienda revisar la configuración');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

asignarRolCorrecto().then(() => {
  console.log('\n🏁 Proceso completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
