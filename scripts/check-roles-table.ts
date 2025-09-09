import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function checkRolesTable() {
  try {
    console.log('🔍 Verificando estructura de tabla roles...\n');

    // Verificar si la tabla existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'roles'
      )
    `;

    if (!tableExists.rows[0].exists) {
      console.log('❌ La tabla roles no existe');
      return;
    }

    // Obtener estructura de columnas
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'roles'
      ORDER BY ordinal_position
    `;

    console.log('📋 Estructura de tabla roles:');
    columns.rows.forEach((col: any) => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Contar registros
    const count = await sql`SELECT COUNT(*) as total FROM roles`;
    console.log(`\n📊 Total de roles: ${count.rows[0].total}`);

    // Mostrar algunos registros de ejemplo
    const sample = await sql`
      SELECT * FROM roles 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    console.log('\n👥 Roles de ejemplo:');
    sample.rows.forEach((role: any, index: number) => {
      console.log(`   ${index + 1}. ${JSON.stringify(role, null, 2)}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRolesTable().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
