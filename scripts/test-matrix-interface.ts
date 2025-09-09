import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function testMatrixInterface() {
  try {
    console.log('🧪 Probando la nueva interfaz de matriz de permisos...\n');

    // 1. Verificar que tenemos un rol para probar
    console.log('1. Buscando un rol para probar...');
    const roles = await sql`
      SELECT id, nombre, descripcion 
      FROM roles 
      ORDER BY nombre 
      LIMIT 3
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
    console.log(`\n🎯 Usando rol: ${testRol.nombre}`);

    // 2. Verificar permisos disponibles por módulo
    console.log('\n2. Verificando permisos por módulo...');
    
    const modulos = [
      'clientes',
      'instalaciones', 
      'guardias',
      'pauta-diaria',
      'pauta-mensual',
      'documentos',
      'reportes'
    ];

    for (const modulo of modulos) {
      const permisos = await sql`
        SELECT clave, descripcion, categoria
        FROM permisos 
        WHERE clave LIKE ${modulo + '.%'}
        ORDER BY clave
      `;

      console.log(`\n📂 ${modulo.toUpperCase()}:`);
      if (permisos.rows.length === 0) {
        console.log('   ❌ No hay permisos');
      } else {
        permisos.rows.forEach((permiso: any) => {
          console.log(`   ✅ ${permiso.clave} - ${permiso.descripcion?.substring(0, 50)}...`);
        });
      }
    }

    // 3. Verificar permisos actuales del rol
    console.log('\n3. Permisos actuales del rol:');
    const permisosActuales = await sql`
      SELECT p.clave, p.descripcion
      FROM roles_permisos rp
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id = ${testRol.id}
      ORDER BY p.clave
    `;

    if (permisosActuales.rows.length === 0) {
      console.log('   ❌ No tiene permisos asignados');
    } else {
      permisosActuales.rows.forEach((permiso: any) => {
        console.log(`   ✅ ${permiso.clave}`);
      });
    }

    // 4. Simular asignación de permisos (solo lectura)
    console.log('\n4. Simulando asignación de permisos...');
    
    // Obtener algunos permisos para asignar
    const permisosParaAsignar = await sql`
      SELECT id, clave
      FROM permisos 
      WHERE clave IN (
        'clientes.view',
        'clientes.create',
        'instalaciones.view',
        'guardias.view',
        'pauta-diaria.view'
      )
    `;

    console.log('📝 Permisos que se podrían asignar:');
    permisosParaAsignar.rows.forEach((permiso: any) => {
      console.log(`   ✅ ${permiso.clave} (${permiso.id})`);
    });

    // 5. Mostrar estadísticas de la matriz
    console.log('\n5. Estadísticas de la matriz:');
    
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

    console.log(`   📊 Total de permisos: ${totalPermisos.rows[0].total}`);
    console.log(`   📊 Permisos en uso: ${permisosEnUso.rows[0].total}`);
    console.log(`   📊 Categorías: ${categorias.rows[0].total}`);

    // 6. Mostrar ejemplo de matriz
    console.log('\n6. Ejemplo de matriz de permisos:');
    console.log('┌─────────────┬─────┬───────┬───────┬─────────┬─────┐');
    console.log('│ Módulo      │ Ver │ Crear │ Editar│ Eliminar│ Todo│');
    console.log('├─────────────┼─────┼───────┼───────┼─────────┼─────┤');

    for (const modulo of modulos.slice(0, 4)) { // Solo mostrar 4 módulos
      const view = await sql`SELECT 1 FROM permisos WHERE clave = ${modulo + '.view'}`;
      const create = await sql`SELECT 1 FROM permisos WHERE clave = ${modulo + '.create'}`;
      const edit = await sql`SELECT 1 FROM permisos WHERE clave = ${modulo + '.edit'}`;
      const deletePerm = await sql`SELECT 1 FROM permisos WHERE clave = ${modulo + '.delete'}`;
      const all = await sql`SELECT 1 FROM permisos WHERE clave = ${modulo + '.*'}`;

      const moduloName = modulo.padEnd(11);
      const viewCheck = view.rows.length > 0 ? ' ✓ ' : '   ';
      const createCheck = create.rows.length > 0 ? ' ✓ ' : '   ';
      const editCheck = edit.rows.length > 0 ? ' ✓ ' : '   ';
      const deleteCheck = deletePerm.rows.length > 0 ? ' ✓ ' : '   ';
      const allCheck = all.rows.length > 0 ? ' ✓ ' : '   ';

      console.log(`│ ${moduloName} │${viewCheck}│${createCheck}│${editCheck}│${deleteCheck}│${allCheck}│`);
    }

    console.log('└─────────────┴─────┴───────┴───────┴─────────┴─────┘');

    console.log('\n🎉 Prueba completada exitosamente!');
    console.log('\n💡 Para probar la interfaz:');
    console.log(`   1. Ve a: http://localhost:3000/configuracion/seguridad/roles`);
    console.log(`   2. Haz click en el rol: ${testRol.nombre}`);
    console.log(`   3. Ve a la pestaña "Permisos"`);
    console.log(`   4. Prueba la nueva interfaz de matriz`);

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    throw error;
  }
}

testMatrixInterface().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
