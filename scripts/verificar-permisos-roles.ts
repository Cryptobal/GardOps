#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(__dirname, '../.env.local') });
import { sql } from '@vercel/postgres';

async function verificarPermisosRoles() {
  console.log('🔍 Verificando permisos asignados a roles...\n');

  try {
    // Obtener todos los roles con sus permisos
    const rolesConPermisos = await sql`
      SELECT 
        r.id,
        r.nombre,
        r.descripcion,
        r.tenant_id,
        COUNT(rp.permiso_id) as total_permisos
      FROM roles r
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      WHERE r.id IS NOT NULL
      GROUP BY r.id, r.nombre, r.descripcion, r.tenant_id
      ORDER BY r.nombre
    `;

    console.log('📊 Roles y sus permisos asignados:');
    console.log('=====================================');

    for (const rol of rolesConPermisos.rows) {
      const tipo = rol.tenant_id ? '(Tenant)' : '(Global)';
      console.log(`\n🎯 ${rol.nombre} ${tipo}`);
      console.log(`   ID: ${rol.id}`);
      console.log(`   Descripción: ${rol.descripcion || 'Sin descripción'}`);
      console.log(`   Permisos asignados: ${rol.total_permisos}`);

      if (rol.total_permisos > 0) {
        // Obtener los permisos específicos de este rol
        const permisos = await sql`
          SELECT 
            p.clave,
            p.descripcion
          FROM roles_permisos rp
          JOIN permisos p ON p.id = rp.permiso_id
          WHERE rp.rol_id = ${rol.id}
          ORDER BY p.clave
        `;

        console.log('   Permisos:');
        for (const permiso of permisos.rows) {
          console.log(`     • ${permiso.clave} - ${permiso.descripcion || 'Sin descripción'}`);
        }
      } else {
        console.log('   ⚠️  No tiene permisos asignados');
      }
    }

    // Verificar roles sin permisos
    const rolesSinPermisos = rolesConPermisos.rows.filter(r => r.total_permisos === 0);
    if (rolesSinPermisos.length > 0) {
      console.log('\n⚠️  ROLES SIN PERMISOS:');
      console.log('========================');
      for (const rol of rolesSinPermisos) {
        const tipo = rol.tenant_id ? '(Tenant)' : '(Global)';
        console.log(`   • ${rol.nombre} ${tipo} (ID: ${rol.id})`);
      }
    }

    // Estadísticas generales
    console.log('\n📈 ESTADÍSTICAS:');
    console.log('=================');
    console.log(`   Total roles: ${rolesConPermisos.rows.length}`);
    console.log(`   Roles con permisos: ${rolesConPermisos.rows.filter(r => r.total_permisos > 0).length}`);
    console.log(`   Roles sin permisos: ${rolesSinPermisos.length}`);

    // Verificar permisos totales en el sistema
    const totalPermisos = await sql`
      SELECT COUNT(*) as total FROM permisos
    `;
    console.log(`   Total permisos disponibles: ${totalPermisos.rows[0].total}`);

    const permisosAsignados = await sql`
      SELECT COUNT(DISTINCT permiso_id) as total FROM roles_permisos
    `;
    console.log(`   Permisos asignados a roles: ${permisosAsignados.rows[0].total}`);

  } catch (error) {
    console.error('❌ Error al verificar permisos de roles:', error);
    process.exit(1);
  }
}

verificarPermisosRoles().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
