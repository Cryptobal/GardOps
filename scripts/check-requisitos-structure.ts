import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '../.env.local') });
import { query } from '../src/lib/database';

(async () => {
  try {
    const result = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_requisitos' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas de as_turnos_requisitos:');
    result.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
})();