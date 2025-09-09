import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function cleanupTestPermisos() {
  try {
    console.log('🧹 Limpiando permisos de prueba...\n');

    // Lista de permisos de prueba a eliminar
    const permisosTest = [
      'turnos.reportes',
      'config.backup', 
      'usuarios.audit'
    ];

    console.log('📋 Permisos a eliminar:');
    permisosTest.forEach(perm => console.log(`   - ${perm}`));

    // Eliminar permisos de prueba
    const deleteResult = await sql`
      DELETE FROM permisos 
      WHERE clave = ANY(${permisosTest})
    `;

    console.log(`\n✅ ${deleteResult.rowCount} permisos eliminados`);

    // Verificar estado final
    const stats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT categoria) as categorias,
        (SELECT COUNT(DISTINCT p.id) FROM permisos p JOIN roles_permisos rp ON rp.permiso_id = p.id) as permisosEnUso
      FROM permisos
    `;

    const finalStats = stats.rows[0];
    console.log('\n📊 Estado final:');
    console.log(`   - Total de permisos: ${finalStats.total}`);
    console.log(`   - Categorías: ${finalStats.categorias}`);
    console.log(`   - Permisos en uso: ${finalStats.permisosEnUso}`);

    console.log('\n🎉 Limpieza completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  }
}

cleanupTestPermisos().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
