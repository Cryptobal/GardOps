import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function checkPPCConstraints() {
  console.log('🔍 Verificando restricciones de la tabla as_turnos_ppc...\n');

  try {
    // Obtener restricciones de la tabla
    const constraints = await query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'as_turnos_ppc'::regclass
      ORDER BY conname
    `);

    console.log('📋 RESTRICCIONES DE LA TABLA as_turnos_ppc:');
    console.log('='.repeat(80));

    if (constraints.rows.length === 0) {
      console.log('No hay restricciones definidas');
    } else {
      constraints.rows.forEach((constraint: any) => {
        console.log(`• ${constraint.constraint_name}: ${constraint.constraint_definition}`);
      });
    }

    // Obtener estructura de columnas
    const columns = await query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_name = 'as_turnos_ppc'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 ESTRUCTURA DE COLUMNAS:');
    console.log('='.repeat(80));

    columns.rows.forEach((col: any) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`• ${col.column_name.padEnd(25)} (${col.data_type.padEnd(20)}) ${nullable}${defaultValue}`);
    });

  } catch (error) {
    console.error('❌ Error verificando restricciones:', error);
  }
}

// Ejecutar la verificación
checkPPCConstraints()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 