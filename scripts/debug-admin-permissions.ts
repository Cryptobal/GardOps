#!/usr/bin/env tsx

import { sql } from '@vercel/postgres';

async function debugAdminPermissions() {
  try {
    console.log('🔍 Debuggeando permisos del rol de admin...\n');

    // 1. Buscar el rol de admin
    const adminRole = await sql`
      SELECT id, nombre, descripcion, tenant_id
      FROM roles 
      WHERE nombre ILIKE '%admin%' OR nombre ILIKE '%administrador%'
      ORDER BY tenant_id NULLS FIRST
    `;

    console.log('📋 Roles de admin encontrados:');
    adminRole.rows.forEach((rol, i) => {
      console.log(`${i + 1}. ID: ${rol.id}`);
      console.log(`   Nombre: ${rol.nombre}`);
      console.log(`   Descripción: ${rol.descripcion}`);
      console.log(`   Tenant: ${rol.tenant_id || 'Global'}`);
      console.log('');
    });

    if (adminRole.rows.length === 0) {
      console.log('❌ No se encontraron roles de admin');
      return;
    }

    // 2. Para cada rol de admin, mostrar sus permisos
    for (const rol of adminRole.rows) {
      console.log(`🔐 Permisos del rol: ${rol.nombre} (${rol.id})`);
      console.log('=' .repeat(50));

      const permisos = await sql`
        SELECT 
          p.id,
          p.clave,
          p.descripcion,
          p.categoria
        FROM roles_permisos rp
        JOIN permisos p ON p.id = rp.permiso_id
        WHERE rp.rol_id = ${rol.id}
        ORDER BY p.clave
      `;

      if (permisos.rows.length === 0) {
        console.log('❌ No tiene permisos asignados');
      } else {
        console.log(`✅ Tiene ${permisos.rows.length} permisos:`);
        permisos.rows.forEach((permiso, i) => {
          console.log(`   ${i + 1}. ${permiso.clave} - ${permiso.descripcion || 'Sin descripción'}`);
        });
      }
      console.log('');
    }

    // 3. Mostrar todos los permisos disponibles
    console.log('📋 Todos los permisos disponibles en el sistema:');
    console.log('=' .repeat(50));

    const allPermisos = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos
      ORDER BY clave
    `;

    allPermisos.rows.forEach((permiso, i) => {
      console.log(`${i + 1}. ${permiso.clave} - ${permiso.descripcion || 'Sin descripción'}`);
    });

    console.log(`\n📊 Total de permisos en el sistema: ${allPermisos.rows.length}`);

    // 4. Verificar si hay permisos que coincidan con los módulos de la interfaz
    console.log('\n🎯 Verificando permisos por módulos:');
    console.log('=' .repeat(50));

    const modulos = [
      'clientes', 'instalaciones', 'guardias', 'pauta-diaria', 
      'pauta-mensual', 'documentos', 'reportes', 'payroll', 'configuracion'
    ];

    for (const modulo of modulos) {
      const permisosModulo = allPermisos.rows.filter(p => 
        p.clave.startsWith(modulo) || p.clave.includes(modulo)
      );
      
      console.log(`${modulo}: ${permisosModulo.length} permisos`);
      permisosModulo.forEach(p => {
        console.log(`   - ${p.clave}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar el script
debugAdminPermissions().then(() => {
  console.log('\n✅ Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error en el script:', error);
  process.exit(1);
});
