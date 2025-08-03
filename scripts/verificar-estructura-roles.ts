import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verificarEstructuraRoles() {
  try {
    console.log('🔍 Verificando estructura de as_turnos_roles_servicio...\n');
    
    const estructura = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_roles_servicio' 
      ORDER BY ordinal_position
    `);
    
    console.log('Estructura de as_turnos_roles_servicio:');
    estructura.rows.forEach((row: any) => {
      console.log(`  • ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Verificar si el ID es UUID o INTEGER
    const idColumn = estructura.rows.find((row: any) => row.column_name === 'id');
    console.log(`\n📋 Tipo de ID: ${idColumn?.data_type}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarEstructuraRoles(); 