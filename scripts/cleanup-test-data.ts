import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function cleanupTestData() {
  try {
    console.log('🧹 Limpiando datos de prueba...\n');

    // Eliminar usuarios de prueba
    const deleteUsers = await sql`
      DELETE FROM usuarios 
      WHERE email IN ('admin@test.com', 'admin@nueva.com')
      RETURNING id, email, nombre
    `;

    console.log(`🗑️ Usuarios eliminados: ${deleteUsers.rows.length}`);
    deleteUsers.rows.forEach((user: any) => {
      console.log(`   - ${user.email} (${user.nombre})`);
    });

    // Eliminar tenants de prueba
    const deleteTenants = await sql`
      DELETE FROM tenants 
      WHERE nombre IN ('Empresa Test', 'Empresa Nueva')
      RETURNING id, nombre, rut
    `;

    console.log(`🗑️ Tenants eliminados: ${deleteTenants.rows.length}`);
    deleteTenants.rows.forEach((tenant: any) => {
      console.log(`   - ${tenant.nombre} (${tenant.rut})`);
    });

    console.log('\n✅ Limpieza completada');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

cleanupTestData().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
