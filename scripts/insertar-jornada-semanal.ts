// Script para insertar parámetros de jornada semanal según normativa chilena
// Ejecutar con: npx tsx scripts/insertar-jornada-semanal.ts

import { query } from '../src/lib/database';

async function insertarJornadaSemanal() {
  console.log('📅 Insertando parámetros de jornada semanal según normativa chilena...\n');
  
  try {
    // Verificar si ya existe el parámetro
    const existing = await query(`
      SELECT id, parametro, valor
      FROM sueldo_parametros_generales 
      WHERE parametro = 'HORAS_SEMANALES_JORNADA'
    `);

    if (existing.rows.length > 0) {
      // Actualizar el valor existente
      await query(`
        UPDATE sueldo_parametros_generales 
        SET valor = $1
        WHERE parametro = 'HORAS_SEMANALES_JORNADA'
      `, [44]);
      console.log(`✅ Actualizado: HORAS_SEMANALES_JORNADA = 44 horas`);
    } else {
      // Obtener el siguiente ID disponible
      const nextId = await query(`
        SELECT COALESCE(MAX(id), 0) + 1 as next_id
        FROM sueldo_parametros_generales
      `);
      
      const id = nextId.rows[0].next_id;
      
      // Insertar nuevo parámetro con ID específico
      await query(`
        INSERT INTO sueldo_parametros_generales (id, parametro, valor)
        VALUES ($1, $2, $3)
      `, [id, 'HORAS_SEMANALES_JORNADA', 44]);
      console.log(`✅ Insertado: HORAS_SEMANALES_JORNADA = 44 horas (ID: ${id})`);
    }

    // Verificar que se insertó correctamente
    const result = await query(`
      SELECT parametro, valor
      FROM sueldo_parametros_generales 
      WHERE parametro = 'HORAS_SEMANALES_JORNADA'
    `);

    console.log('\n📊 Parámetro de jornada semanal en la base de datos:');
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log(`   - ${row.parametro}: ${row.valor} horas`);
    }

    console.log('\n🎯 Implementación gradual según normativa chilena:');
    console.log('   - 26 abril 2024: 44 horas semanales (ACTUAL)');
    console.log('   - 26 abril 2026: 42 horas semanales');
    console.log('   - 26 abril 2028: 40 horas semanales');
    console.log('\n💡 Nota: El sistema usará 44 horas como valor por defecto hasta 2026');

  } catch (error) {
    console.error('❌ Error insertando parámetros de jornada semanal:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  insertarJornadaSemanal()
    .then(() => {
      console.log('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en script:', error);
      process.exit(1);
    });
}

export { insertarJornadaSemanal };
