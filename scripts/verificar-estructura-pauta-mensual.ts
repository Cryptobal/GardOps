import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verificarEstructuraPautaMensual() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE PAUTA MENSUAL\n');

  try {
    // 1. Verificar estructura de la tabla
    console.log('1️⃣ ESTRUCTURA DE LA TABLA as_turnos_pauta_mensual...');
    const estructura = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'as_turnos_pauta_mensual'
      ORDER BY ordinal_position
    `);

    console.log('Columnas de la tabla:');
    estructura.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // 2. Verificar algunos registros de ejemplo
    console.log('\n2️⃣ REGISTROS DE EJEMPLO...');
    const registros = await query(`
      SELECT *
      FROM as_turnos_pauta_mensual
      LIMIT 3
    `);

    if (registros.rows.length > 0) {
      console.log('Primeros 3 registros:');
      registros.rows.forEach((reg: any, index: number) => {
        console.log(`  Registro ${index + 1}:`, reg);
      });
    } else {
      console.log('No hay registros en la tabla');
    }

    // 3. Verificar total de registros
    console.log('\n3️⃣ TOTAL DE REGISTROS...');
    const total = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_pauta_mensual
    `);

    console.log(`Total registros: ${total.rows[0].total}`);

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

verificarEstructuraPautaMensual(); 