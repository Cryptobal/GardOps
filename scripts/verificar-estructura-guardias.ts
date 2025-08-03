import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verificarEstructuraGuardias() {
  try {
    console.log('🔍 Verificando estructura de guardias...\n');
    
    const estructura = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      ORDER BY ordinal_position
    `);
    
    console.log('Estructura de guardias:');
    estructura.rows.forEach((row: any) => {
      console.log(`  • ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Verificar datos existentes
    const datos = await query('SELECT * FROM guardias LIMIT 3');
    console.log('\n📋 Datos de ejemplo:');
    console.log(datos.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarEstructuraGuardias(); 