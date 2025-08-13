import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function checkPermisosTable() {
  try {
    console.log('🔍 Verificando estructura de tabla permisos...\n');

    // Verificar si la tabla existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'permisos'
      )
    `;

    if (!tableExists.rows[0].exists) {
      console.log('❌ La tabla permisos no existe');
      return;
    }

    // Obtener estructura de columnas
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'permisos'
      ORDER BY ordinal_position
    `;

    console.log('📋 Estructura de tabla permisos:');
    columns.rows.forEach((col: any) => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Contar registros
    const count = await sql`SELECT COUNT(*) as total FROM permisos`;
    console.log(`\n📊 Total de permisos: ${count.rows[0].total}`);

    // Mostrar algunos registros de ejemplo
    const sample = await sql`
      SELECT * FROM permisos 
      ORDER BY clave ASC 
      LIMIT 10
    `;

    console.log('\n🔑 Permisos de ejemplo:');
    sample.rows.forEach((perm: any, index: number) => {
      console.log(`   ${index + 1}. ${JSON.stringify(perm, null, 2)}`);
    });

    // Verificar si hay permisos en uso (asignados a roles)
    const permisosEnUso = await sql`
      SELECT COUNT(DISTINCT p.id) as total_en_uso
      FROM permisos p
      JOIN roles_permisos rp ON rp.permiso_id = p.id
    `;

    console.log(`\n📈 Permisos en uso: ${permisosEnUso.rows[0].total_en_uso}`);

    // Verificar si hay categorías (columna categoria)
    const categoriaExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'permisos' 
        AND column_name = 'categoria'
      )
    `;

    if (categoriaExists.rows[0].exists) {
      console.log('\n📂 Categorías disponibles:');
      const categorias = await sql`
        SELECT DISTINCT categoria, COUNT(*) as total
        FROM permisos 
        WHERE categoria IS NOT NULL
        GROUP BY categoria
        ORDER BY categoria
      `;
      
      categorias.rows.forEach((cat: any) => {
        console.log(`   - ${cat.categoria}: ${cat.total} permisos`);
      });
    } else {
      console.log('\n❌ No hay columna categoria en la tabla permisos');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPermisosTable().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
