import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function createNewPermiso(clave: string, descripcion: string) {
  try {
    console.log(`🚀 Creando nuevo permiso: ${clave}`);
    console.log(`📝 Descripción: ${descripcion}\n`);

    // Usar la función helper para crear el permiso con categorización automática
    const result = await sql`
      SELECT insert_permiso_auto_categoria(${clave}, ${descripcion}) as id
    `;

    const permisoId = result.rows[0].id;

    // Obtener el permiso creado para mostrar detalles
    const permiso = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos 
      WHERE id = ${permisoId}
    `;

    const nuevoPermiso = permiso.rows[0];

    console.log('✅ Permiso creado exitosamente!');
    console.log(`   ID: ${nuevoPermiso.id}`);
    console.log(`   Clave: ${nuevoPermiso.clave}`);
    console.log(`   Descripción: ${nuevoPermiso.descripcion}`);
    console.log(`   Categoría: ${nuevoPermiso.categoria}`);

    return nuevoPermiso;

  } catch (error) {
    console.error('❌ Error creando permiso:', error);
    throw error;
  }
}

// Ejemplo de uso
async function ejemplo() {
  try {
    console.log('📋 Ejemplos de creación de permisos:\n');

    // Ejemplo 1: Permiso de turnos
    await createNewPermiso(
      'turnos.reportes', 
      'Generar reportes de turnos y asistencia'
    );

    console.log('\n' + '─'.repeat(50) + '\n');

    // Ejemplo 2: Permiso de configuración
    await createNewPermiso(
      'config.backup', 
      'Realizar respaldos del sistema'
    );

    console.log('\n' + '─'.repeat(50) + '\n');

    // Ejemplo 3: Permiso de usuarios
    await createNewPermiso(
      'usuarios.audit', 
      'Auditar acciones de usuarios'
    );

  } catch (error) {
    console.error('💥 Error en ejemplos:', error);
  }
}

// Si se ejecuta directamente, mostrar ejemplos
if (require.main === module) {
  ejemplo().then(() => {
    console.log('\n🏁 Script completado');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

// Exportar para uso en otros scripts
export { createNewPermiso };
