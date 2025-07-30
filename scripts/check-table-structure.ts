import * as dotenv from 'dotenv';
import { query } from '../src/lib/database';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estructura de la tabla guardias...');
    
    const result = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'guardias'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura de la tabla guardias:');
    console.log('┌─────────────────────┬─────────────┬───────────┬─────────────────┐');
    console.log('│ Nombre de Columna   │ Tipo        │ Nullable │ Default         │');
    console.log('├─────────────────────┼─────────────┼───────────┼─────────────────┤');
    
    result.rows.forEach((row: any) => {
      const columnName = row.column_name.padEnd(19);
      const dataType = row.data_type.padEnd(11);
      const isNullable = row.is_nullable === 'YES' ? 'YES' : 'NO';
      const defaultValue = (row.column_default || '').padEnd(15);
      
      console.log(`│ ${columnName} │ ${dataType} │ ${isNullable.padEnd(9)} │ ${defaultValue} │`);
    });
    
    console.log('└─────────────────────┴─────────────┴───────────┴─────────────────┘');
    
    // Mostrar algunos registros de ejemplo
    console.log('\n📊 Registros de ejemplo:');
    const sampleResult = await query('SELECT * FROM guardias LIMIT 3');
    
    if (sampleResult.rows.length > 0) {
      const columns = Object.keys(sampleResult.rows[0]);
      console.log('Columnas disponibles:', columns.join(', '));
      
      sampleResult.rows.forEach((row: any, index: number) => {
        console.log(`\nRegistro ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
  }
}

checkTableStructure(); 