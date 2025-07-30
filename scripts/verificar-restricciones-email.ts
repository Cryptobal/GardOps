#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { query } from '../src/lib/database';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function verificarRestriccionesEmail() {
  console.log('🔍 Verificando restricciones de email en la tabla guardias...\n');

  try {
    // Verificar restricciones de la tabla
    const constraintsResult = await query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'guardias'
      ORDER BY tc.constraint_type, tc.constraint_name
    `);

    console.log('🔒 Restricciones encontradas:');
    constraintsResult.rows.forEach((row: any) => {
      console.log(`   • ${row.constraint_name} (${row.constraint_type})`);
      if (row.column_name) {
        console.log(`     Columna: ${row.column_name}`);
      }
      if (row.foreign_table_name) {
        console.log(`     Referencia: ${row.foreign_table_name}.${row.foreign_column_name}`);
      }
      console.log('');
    });

    // Verificar índices únicos
    const indexesResult = await query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'guardias'
      ORDER BY indexname
    `);

    console.log('📊 Índices encontrados:');
    indexesResult.rows.forEach((row: any) => {
      console.log(`   • ${row.indexname}`);
      console.log(`     ${row.indexdef}`);
      console.log('');
    });

    // Verificar emails vacíos
    const emailsVaciosResult = await query(`
      SELECT COUNT(*) as cantidad
      FROM guardias 
      WHERE email IS NULL OR email = ''
    `);
    
    console.log(`📧 Emails vacíos en la base de datos: ${emailsVaciosResult.rows[0].cantidad}`);

    // Verificar si hay algún email específico que cause problemas
    const emailEspecificoResult = await query(`
      SELECT email, COUNT(*) as cantidad
      FROM guardias 
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email 
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC
    `);

    if (emailEspecificoResult.rows.length > 0) {
      console.log('\n⚠️  Emails duplicados:');
      emailEspecificoResult.rows.forEach((row: any) => {
        console.log(`   • ${row.email}: ${row.cantidad} veces`);
      });
    } else {
      console.log('\n✅ No hay emails duplicados');
    }

  } catch (error) {
    console.error('❌ Error al verificar restricciones:', error);
  }
}

// Ejecutar el script
if (require.main === module) {
  verificarRestriccionesEmail()
    .then(() => {
      console.log('🎉 Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la verificación:', error);
      process.exit(1);
    });
}

export { verificarRestriccionesEmail }; 