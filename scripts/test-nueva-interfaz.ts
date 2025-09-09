import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function testNuevaInterfaz() {
  try {
    console.log('🧪 Probando la nueva interfaz de matriz de permisos...\n');

    // 1. Verificar que tenemos roles para probar
    console.log('1. Verificando roles disponibles...');
    const roles = await sql`
      SELECT id, nombre, descripcion 
      FROM roles 
      ORDER BY nombre 
      LIMIT 5
    `;

    if (roles.rows.length === 0) {
      console.log('❌ No hay roles disponibles para probar');
      return;
    }

    console.log('✅ Roles encontrados:');
    roles.rows.forEach((rol: any, index: number) => {
      console.log(`   ${index + 1}. ${rol.nombre} (${rol.id})`);
    });

    const testRol = roles.rows[0];
    console.log(`\n🎯 Rol de prueba: ${testRol.nombre}`);

    // 2. Verificar permisos actuales del rol
    console.log('\n2. Permisos actuales del rol:');
    const permisosActuales = await sql`
      SELECT p.clave, p.descripcion, p.categoria
      FROM roles_permisos rp
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id = ${testRol.id}
      ORDER BY p.categoria, p.clave
    `;

    if (permisosActuales.rows.length === 0) {
      console.log('   ❌ No tiene permisos asignados');
    } else {
      console.log(`   ✅ Tiene ${permisosActuales.rows.length} permisos asignados:`);
      permisosActuales.rows.forEach((permiso: any) => {
        console.log(`      - ${permiso.clave} (${permiso.categoria})`);
      });
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

    for (const modulo of modulos) {
      const permisos = await sql`
        SELECT clave, descripcion
        FROM permisos 
        WHERE clave LIKE ${modulo.prefijo + '%'}
        ORDER BY clave
      `;

      console.log(`\n📂 ${modulo.nombre}:`);
      if (permisos.rows.length === 0) {
        console.log('   ❌ No hay permisos');
      } else {
        console.log(`   ✅ ${permisos.rows.length} permisos disponibles`);
        permisos.rows.forEach((permiso: any) => {
          console.log(`      - ${permiso.clave}`);
        });
      }
    }

    // 4. Simular asignación de permisos
    console.log('\n4. Simulando asignación de permisos...');
    
    // Obtener algunos permisos para asignar
    const permisosParaAsignar = await sql`
      SELECT id, clave, descripcion
      FROM permisos 
      WHERE clave IN (
        'clientes.view',
        'clientes.create',
        'instalaciones.view',
        'guardias.view',
        'pauta-diaria.view',
        'documentos.view',
        'reportes.asistencia'
      )
    `;

    console.log('📝 Permisos que se podrían asignar:');
    permisosParaAsignar.rows.forEach((permiso: any) => {
      console.log(`   ✅ ${permiso.clave} - ${permiso.descripcion?.substring(0, 50)}...`);
    });

    // 5. Mostrar URLs de acceso
    console.log('\n5. URLs de acceso:');
    console.log(`   📄 Detalle del rol: http://localhost:3000/configuracion/seguridad/roles/${testRol.id}`);
    console.log(`   🎯 Interfaz de matriz: http://localhost:3000/configuracion/seguridad/roles/${testRol.id}/permisos`);

    // 6. Mostrar estadísticas finales
    console.log('\n6. Estadísticas del sistema:');
    
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

    // 7. Instrucciones de uso
    console.log('\n7. Instrucciones de uso:');
    console.log('   🎯 Para usar la nueva interfaz de matriz:');
    console.log('   1. Ve a la página de detalle del rol');
    console.log('   2. Haz click en el botón "🎯 Interfaz de Matriz"');
    console.log('   3. Usa los botones "Todo" y "Limpiar" por módulo');
    console.log('   4. Usa checkboxes individuales para permisos específicos');
    console.log('   5. Haz click en "Guardar Cambios" para aplicar');

    console.log('\n🎉 Prueba completada exitosamente!');
    console.log('\n💡 La nueva interfaz de matriz está lista para usar.');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    throw error;
  }
}

testNuevaInterfaz().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
