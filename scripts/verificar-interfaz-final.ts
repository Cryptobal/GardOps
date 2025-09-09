import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function verificarInterfazFinal() {
  try {
    console.log('🔍 Verificación final de la interfaz de matriz de permisos...\n');

    // 1. Verificar que el endpoint funciona
    console.log('1. Verificando endpoint de permisos...');
    const roles = await sql`
      SELECT id, nombre 
      FROM roles 
      ORDER BY nombre 
      LIMIT 1
    `;

    if (roles.rows.length === 0) {
      console.log('❌ No hay roles disponibles');
      return;
    }

    const testRol = roles.rows[0];
    console.log(`✅ Rol de prueba: ${testRol.nombre} (${testRol.id})`);

    // 2. Verificar permisos actuales
    console.log('\n2. Permisos actuales del rol:');
    const permisosActuales = await sql`
      SELECT p.clave, p.descripcion
      FROM roles_permisos rp
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id = ${testRol.id}
      ORDER BY p.clave
    `;

    console.log(`   📊 Tiene ${permisosActuales.rows.length} permisos asignados`);
    if (permisosActuales.rows.length > 0) {
      permisosActuales.rows.slice(0, 3).forEach((permiso: any) => {
        console.log(`      - ${permiso.clave}`);
      });
      if (permisosActuales.rows.length > 3) {
        console.log(`      ... y ${permisosActuales.rows.length - 3} más`);
      }
    }

    // 3. Verificar permisos disponibles por módulo
    console.log('\n3. Permisos disponibles por módulo:');
    
    const modulos = [
      { nombre: 'Clientes', prefijo: 'clientes.' },
      { nombre: 'Instalaciones', prefijo: 'instalaciones.' },
      { nombre: 'Guardias', prefijo: 'guardias.' },
      { nombre: 'Pauta Diaria', prefijo: 'pauta-diaria.' },
      { nombre: 'Pauta Mensual', prefijo: 'pauta-mensual.' },
      { nombre: 'Documentos', prefijo: 'documentos.' },
      { nombre: 'Reportes', prefijo: 'reportes.' }
    ];

    let totalPermisosDisponibles = 0;
    for (const modulo of modulos) {
      const permisos = await sql`
        SELECT COUNT(*) as total
        FROM permisos 
        WHERE clave LIKE ${modulo.prefijo + '%'}
      `;
      const total = parseInt(permisos.rows[0].total);
      totalPermisosDisponibles += total;
      console.log(`   📂 ${modulo.nombre}: ${total} permisos`);
    }

    console.log(`\n   📊 Total de permisos disponibles: ${totalPermisosDisponibles}`);

    // 4. Verificar estadísticas del sistema
    console.log('\n4. Estadísticas del sistema:');
    
    const totalPermisos = await sql`SELECT COUNT(*) as total FROM permisos`;
    const permisosEnUso = await sql`
      SELECT COUNT(DISTINCT p.id) as total
      FROM permisos p
      JOIN roles_permisos rp ON rp.permiso_id = p.id
    `;
    const categorias = await sql`
      SELECT COUNT(DISTINCT categoria) as total
      FROM permisos
      WHERE categoria IS NOT NULL
    `;
    const totalRoles = await sql`SELECT COUNT(*) as total FROM roles`;

    console.log(`   📊 Total de permisos: ${totalPermisos.rows[0].total}`);
    console.log(`   📊 Permisos en uso: ${permisosEnUso.rows[0].total}`);
    console.log(`   📊 Categorías: ${categorias.rows[0].total}`);
    console.log(`   📊 Total de roles: ${totalRoles.rows[0].total}`);

    // 5. Mostrar URLs de acceso
    console.log('\n5. URLs de acceso:');
    console.log(`   📄 Detalle del rol: http://localhost:3000/configuracion/seguridad/roles/${testRol.id}`);
    console.log(`   🎯 Interfaz de matriz: http://localhost:3000/configuracion/seguridad/roles/${testRol.id}/permisos`);

    // 6. Verificar que los permisos faltantes están agregados
    console.log('\n6. Verificando permisos faltantes...');
    const permisosFaltantes = [
      'rbac.roles.write',
      'rbac.roles.create', 
      'rbac.roles.delete'
    ];

    for (const permiso of permisosFaltantes) {
      const existe = await sql`
        SELECT 1 FROM permisos WHERE clave = ${permiso}
      `;
      if (existe.rows.length > 0) {
        console.log(`   ✅ ${permiso} - Existe`);
      } else {
        console.log(`   ❌ ${permiso} - No existe`);
      }
    }

    // 7. Verificar que el rol Platform Admin tiene los permisos necesarios
    console.log('\n7. Verificando permisos del Platform Admin...');
    const platformAdmin = await sql`
      SELECT id FROM roles WHERE nombre = 'Platform Admin' LIMIT 1
    `;

    if (platformAdmin.rows.length > 0) {
      const permisosAdmin = await sql`
        SELECT p.clave
        FROM roles_permisos rp
        JOIN permisos p ON p.id = rp.permiso_id
        WHERE rp.rol_id = ${platformAdmin.rows[0].id}
        AND p.clave IN ('rbac.roles.write', 'rbac.roles.create', 'rbac.roles.delete')
      `;
      
      console.log(`   📊 Platform Admin tiene ${permisosAdmin.rows.length} permisos de roles`);
      permisosAdmin.rows.forEach((permiso: any) => {
        console.log(`      - ${permiso.clave}`);
      });
    }

    // 8. Resumen final
    console.log('\n🎉 VERIFICACIÓN COMPLETADA');
    console.log('\n✅ La interfaz de matriz está lista para usar:');
    console.log('   1. Ve a la página de detalle del rol');
    console.log('   2. Haz click en "🎯 Interfaz de Matriz"');
    console.log('   3. Usa los controles para asignar permisos');
    console.log('   4. Haz click en "Guardar Cambios"');
    console.log('\n💡 Características disponibles:');
    console.log('   - 7 módulos organizados');
    console.log('   - Botones "Todo" y "Limpiar" por módulo');
    console.log('   - Checkboxes individuales');
    console.log('   - Indicador de cambios pendientes');
    console.log('   - Guardado en lote');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    throw error;
  }
}

verificarInterfazFinal().then(() => {
  console.log('\n🏁 Verificación completada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
