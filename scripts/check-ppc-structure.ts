import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function checkPPCStructure() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE TABLAS PPC\n');

  try {
    // 1. Verificar estructura de as_turnos_roles_servicio
    console.log('📋 1. ESTRUCTURA DE as_turnos_roles_servicio:');
    const rolesStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_roles_servicio'
      ORDER BY ordinal_position
    `);
    
    console.log('   Campos encontrados:');
    rolesStructure.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
    });

    // 2. Verificar estructura de as_turnos_ppc
    console.log('\n📋 2. ESTRUCTURA DE as_turnos_ppc:');
    const ppcStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_ppc'
      ORDER BY ordinal_position
    `);
    
    console.log('   Campos encontrados:');
    ppcStructure.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
    });

    // 3. Verificar datos de ejemplo
    console.log('\n📋 3. DATOS DE EJEMPLO:');
    
    const rolesData = await query(`
      SELECT id, nombre, hora_inicio, hora_termino
      FROM as_turnos_roles_servicio 
      LIMIT 3
    `);
    console.log('   Roles de servicio:');
    rolesData.rows.forEach((rol: any) => {
      console.log(`   - ${rol.nombre}: ${rol.hora_inicio} - ${rol.hora_termino}`);
    });

    const ppcData = await query(`
      SELECT COUNT(*) as total_ppc
      FROM as_turnos_ppc
    `);
    console.log(`   Total PPCs: ${ppcData.rows[0].total_ppc}`);

  } catch (error) {
    console.error('Error verificando estructura:', error);
  }
}

checkPPCStructure(); 