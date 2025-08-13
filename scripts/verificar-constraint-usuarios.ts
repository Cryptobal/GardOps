import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function verificarConstraintUsuarios() {
  try {
    console.log('🔍 Verificando constraints de tabla usuarios...\n');

    // Verificar estructura de la tabla
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'usuarios'
      ORDER BY ordinal_position
    `;

    console.log('📋 Estructura de tabla usuarios:');
    columns.rows.forEach((col: any) => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Verificar constraints
    const constraints = await sql`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'usuarios'::regclass
    `;

    console.log('\n🔒 Constraints de la tabla:');
    constraints.rows.forEach((constraint: any) => {
      console.log(`   ${constraint.constraint_name}: ${constraint.constraint_definition}`);
    });

    // Verificar valores actuales del campo rol
    const rolesActuales = await sql`
      SELECT DISTINCT rol FROM usuarios WHERE rol IS NOT NULL
    `;

    console.log('\n📊 Valores actuales del campo rol:');
    rolesActuales.rows.forEach((rol: any) => {
      console.log(`   - ${rol.rol}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarConstraintUsuarios().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
});
