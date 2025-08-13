#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function corregirPermisosPlatformAdmin() {
  try {
    console.log('🔧 Corrigiendo permisos del rol Platform Admin (Global)...\n');

    // 1. Obtener el rol Platform Admin
    console.log('1. Obteniendo rol Platform Admin...');
    const platformAdminRole = await sql`
      SELECT id, nombre, descripcion
      FROM roles
      WHERE nombre = 'Platform Admin (Global)'
      LIMIT 1
    `;

    if (platformAdminRole.rows.length === 0) {
      console.log('❌ Rol Platform Admin (Global) no encontrado');
      return;
    }

    const rolId = platformAdminRole.rows[0].id;
    console.log(`✅ Rol encontrado: ${platformAdminRole.rows[0].nombre}`);

    // 2. Lista completa de permisos que debe tener Platform Admin
    const permisosCompletos = [
      // Permisos de administración global
      'rbac.platform_admin',
      'rbac.tenants.create',
      'rbac.tenants.read',
      'rbac.tenants.write',
      'rbac.roles.create',
      'rbac.roles.read',
      'rbac.roles.write',
      'rbac.roles.delete',
      'rbac.permisos.read',
      'rbac.permisos.write',
      'usuarios.manage',
      
      // Permisos de configuración
      'config.manage',
      'config.system',
      'config.tenant',
      'config.backup',
      
      // Permisos de auditoría
      'auditoria.*',
      'auditoria.logs',
      'auditoria.export',
      
      // Permisos de módulos principales (acceso completo)
      'clientes.*',
      'clientes.view',
      'clientes.create',
      'clientes.edit',
      'clientes.delete',
      
      'instalaciones.*',
      'instalaciones.view',
      'instalaciones.create',
      'instalaciones.edit',
      'instalaciones.delete',
      'instalaciones.ppcs',
      'instalaciones.turnos',
      
      'guardias.*',
      'guardias.view',
      'guardias.create',
      'guardias.edit',
      'guardias.delete',
      'guardias.finiquitos',
      'guardias.permisos',
      
      'turnos.*',
      'turnos.view',
      'turnos.edit',
      
      'pauta-diaria.*',
      'pauta-diaria.view',
      'pauta-diaria.edit',
      'pauta-diaria.reemplazos',
      'pauta-diaria.turnos-extras',
      
      'pauta-mensual.*',
      'pauta-mensual.view',
      'pauta-mensual.create',
      'pauta-mensual.edit',
      'pauta-mensual.delete',
      
      'payroll.*',
      'payroll.view',
      'payroll.edit',
      
      'maestros.*',
      'maestros.view',
      'maestros.edit',
      
      'documentos.*',
      'documentos.manage',
      'documentos.view',
      'documentos.create',
      'documentos.edit',
      'documentos.delete',
      'documentos.upload',
      
      'reportes.*',
      'reportes.asistencia',
      'reportes.turnos',
      'reportes.payroll',
      'reportes.export'
    ];

    console.log(`2. Asignando ${permisosCompletos.length} permisos al rol...`);

    // 3. Asignar cada permiso
    let permisosAsignados = 0;
    let permisosNoEncontrados = 0;

    for (const permisoClave of permisosCompletos) {
      try {
        // Buscar el permiso
        const permiso = await sql`
          SELECT id FROM permisos WHERE clave = ${permisoClave}
        `;

        if (permiso.rows.length > 0) {
          // Asignar permiso al rol
          await sql`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            VALUES (${rolId}, ${permiso.rows[0].id})
            ON CONFLICT DO NOTHING
          `;
          console.log(`   ✅ ${permisoClave}`);
          permisosAsignados++;
        } else {
          console.log(`   ⚠️  Permiso no encontrado: ${permisoClave}`);
          permisosNoEncontrados++;
        }
      } catch (error: any) {
        console.log(`   ❌ Error con permiso ${permisoClave}: ${error.message}`);
      }
    }

    // 4. Resumen
    console.log('\n3. Resumen de asignación:');
    console.log(`   ✅ Permisos asignados: ${permisosAsignados}`);
    console.log(`   ⚠️  Permisos no encontrados: ${permisosNoEncontrados}`);
    console.log(`   📊 Total procesados: ${permisosCompletos.length}`);

    // 5. Verificar permisos finales del usuario carlos.irigoyen@gard.cl
    console.log('\n4. Verificando permisos del usuario carlos.irigoyen@gard.cl...');
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
    for (const permiso of permisosAVerificar) {
      try {
        const tienePermiso = await sql`
          SELECT public.fn_usuario_tiene_permiso('carlos.irigoyen@gard.cl', ${permiso}) as tiene
        `;
        const resultado = tienePermiso.rows[0]?.tiene ? '✅' : '❌';
        console.log(`   ${resultado} ${permiso}`);
      } catch (error: any) {
        console.log(`   ❌ ${permiso} (error: ${error.message})`);
      }
    }

    console.log('\n🎉 Permisos del Platform Admin corregidos');
    console.log('✅ El usuario carlos.irigoyen@gard.cl ahora tiene acceso completo');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

corregirPermisosPlatformAdmin().then(() => {
  console.log('\n🏁 Corrección completada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
