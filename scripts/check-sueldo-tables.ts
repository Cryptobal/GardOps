// Script para verificar la estructura de las tablas del módulo de sueldos

import { query } from '../src/lib/database';

async function checkTables() {
  console.log('🔍 Verificando estructura de las tablas del módulo de sueldos...\n');
  
  try {
    const tables = [
      'sueldo_valor_uf',
      'sueldo_parametros_generales',
      'sueldo_afp',
      'sueldo_isapre',
      'sueldo_mutualidad',
      'sueldo_tramos_impuesto'
    ];
    
    for (const table of tables) {
      console.log(`\n📊 Tabla: ${table}`);
      console.log('=' + '='.repeat(50));
      
      // Verificar si la tabla existe
      const existsResult = await query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (!existsResult.rows[0].exists) {
        console.log('   ❌ La tabla no existe');
        continue;
      }
      
      // Obtener columnas
      const columnsResult = await query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      console.log('   ✅ La tabla existe con las siguientes columnas:');
      columnsResult.rows.forEach((col: any) => {
        console.log(`      - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
      
      // Contar registros
      const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`\n   📊 Total de registros: ${countResult.rows[0].count}`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error al verificar las tablas:');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar la verificación
checkTables();
