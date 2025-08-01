import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function checkPPCStructure() {
  try {
    console.log('🔍 Verificando estructura de as_turnos_ppc...');
    
    const result = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_ppc' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas de as_turnos_ppc:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
  }
}

checkPPCStructure(); 