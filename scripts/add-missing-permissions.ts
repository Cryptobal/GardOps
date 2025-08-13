import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function addMissingPermissions() {
  try {
    console.log('🚀 Agregando permisos faltantes...\n');

    // Permisos faltantes para roles
    const permisosFaltantes = [
      {
        clave: 'rbac.roles.write',
        descripcion: '✏️ **Editar roles y permisos** - Permite crear, editar y eliminar roles, así como asignar permisos a roles'
      },
      {
        clave: 'rbac.roles.create',
        descripcion: '➕ **Crear roles** - Permite crear nuevos roles en el sistema'
      },
      {
        clave: 'rbac.roles.delete',
        descripcion: '🗑️ **Eliminar roles** - Permite eliminar roles del sistema'
      }
    ];

    console.log('📝 Insertando permisos faltantes...');
    let insertados = 0;

    for (const permiso of permisosFaltantes) {
      try {
        // Verificar si ya existe
        const existing = await sql`
          SELECT id FROM permisos WHERE clave = ${permiso.clave}
        `;

        if (existing.rows.length > 0) {
          console.log(`⚠️  ${permiso.clave} - Ya existe`);
        } else {
          // Usar la función helper para categorización automática
          await sql`
            SELECT insert_permiso_auto_categoria(${permiso.clave}, ${permiso.descripcion})
          `;
          console.log(`✅ ${permiso.clave} - Creado`);
          insertados++;
        }
      } catch (error: any) {
        console.log(`❌ ${permiso.clave} - Error: ${error.message}`);
      }
    }

    console.log(`\n🎉 Permisos insertados: ${insertados}`);

    // Asignar permisos al rol Platform Admin
    console.log('\n🔗 Asignando permisos al rol Platform Admin...');
    
    const platformAdminRole = await sql`
      SELECT id FROM roles WHERE nombre = 'Platform Admin' LIMIT 1
    `;

    if (platformAdminRole.rows.length === 0) {
      console.log('❌ No se encontró el rol Platform Admin');
      return;
    }

    const roleId = platformAdminRole.rows[0].id;
    let asignados = 0;

    for (const permiso of permisosFaltantes) {
      try {
        const permisoId = await sql`
          SELECT id FROM permisos WHERE clave = ${permiso.clave}
        `;

        if (permisoId.rows.length === 0) {
          console.log(`⚠️  Permiso ${permiso.clave} no encontrado`);
          continue;
        }

        // Verificar si ya está asignado
        const yaAsignado = await sql`
          SELECT 1 FROM roles_permisos 
          WHERE rol_id = ${roleId} AND permiso_id = ${permisoId.rows[0].id}
        `;

        if (yaAsignado.rows.length > 0) {
          console.log(`⚠️  ${permiso.clave} - Ya asignado al Platform Admin`);
        } else {
          await sql`
            INSERT INTO roles_permisos (rol_id, permiso_id)
            VALUES (${roleId}, ${permisoId.rows[0].id})
          `;
          console.log(`✅ ${permiso.clave} - Asignado al Platform Admin`);
          asignados++;
        }
      } catch (error: any) {
        console.log(`❌ Error asignando ${permiso.clave}: ${error.message}`);
      }
    }

    console.log(`\n🎉 Permisos asignados al Platform Admin: ${asignados}`);

    // Mostrar estadísticas finales
    const stats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT categoria) as categorias,
        (SELECT COUNT(DISTINCT p.id) FROM permisos p JOIN roles_permisos rp ON rp.permiso_id = p.id) as permisosEnUso
      FROM permisos
    `;

    const finalStats = stats.rows[0];
    console.log('\n📊 Estadísticas finales:');
    console.log(`   - Total de permisos: ${finalStats.total}`);
    console.log(`   - Categorías: ${finalStats.categorias}`);
    console.log(`   - Permisos en uso: ${finalStats.permisosEnUso}`);

  } catch (error) {
    console.error('❌ Error durante la ejecución:', error);
    throw error;
  }
}

addMissingPermissions().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
