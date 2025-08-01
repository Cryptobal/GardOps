import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function checkPPCConstraints() {
  console.log('🔍 Verificando restricciones de la tabla puestos_por_cubrir...\n');

  try {
    // Verificar las restricciones de la tabla
    const constraints = await query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'puestos_por_cubrir'::regclass
      AND contype = 'c'
    `);

    console.log('📋 RESTRICCIONES DE VERIFICACIÓN:');
    console.log('='.repeat(80));

    if (constraints.rows.length === 0) {
      console.log('No hay restricciones de verificación definidas');
    } else {
      constraints.rows.forEach((constraint: any) => {
        console.log(`• ${constraint.constraint_name}: ${constraint.constraint_definition}`);
      });
    }

    // Verificar los valores únicos en el campo estado
    const estados = await query(`
      SELECT DISTINCT estado 
      FROM puestos_por_cubrir 
      WHERE estado IS NOT NULL
      ORDER BY estado
    `);

    console.log('\n📊 VALORES ACTUALES EN EL CAMPO estado:');
    console.log('='.repeat(80));
    
    if (estados.rows.length === 0) {
      console.log('No hay valores en el campo estado');
    } else {
      estados.rows.forEach((row: any) => {
        console.log(`• "${row.estado}"`);
      });
    }

    // Verificar la estructura de la columna estado
    const columnInfo = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'puestos_por_cubrir'
      AND column_name = 'estado'
    `);

    console.log('\n📋 INFORMACIÓN DE LA COLUMNA estado:');
    console.log('='.repeat(80));
    
    if (columnInfo.rows.length > 0) {
      const col = columnInfo.rows[0];
      console.log(`• Nombre: ${col.column_name}`);
      console.log(`• Tipo: ${col.data_type}`);
      console.log(`• Nullable: ${col.is_nullable}`);
      console.log(`• Default: ${col.column_default || 'NULL'}`);
      console.log(`• Longitud máxima: ${col.character_maximum_length || 'N/A'}`);
    }

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