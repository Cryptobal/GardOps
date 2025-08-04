import { Client } from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function checkPautaData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Conectado a la base de datos');

    // Verificar datos en as_turnos_pauta_mensual
    const data = await client.query(`
      SELECT id, puesto_id, guardia_id, estado, reemplazo_guardia_id, observaciones, anio, mes, dia
      FROM as_turnos_pauta_mensual 
      ORDER BY anio DESC, mes DESC, dia DESC
      LIMIT 10
    `);

    console.log('\n📋 Datos en as_turnos_pauta_mensual:');
    if (data.rows.length === 0) {
      console.log('  - No hay datos en la tabla');
    } else {
      data.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ID: ${row.id}, Estado: ${row.estado}, Fecha: ${row.anio}-${row.mes}-${row.dia}, Guardia: ${row.guardia_id}, Reemplazo: ${row.reemplazo_guardia_id}`);
      });
    }

    // Verificar datos en turnos_extras
    const turnosExtras = await client.query(`
      SELECT id, guardia_id, pauta_id, estado, fecha
      FROM turnos_extras 
      ORDER BY fecha DESC
      LIMIT 10
    `);

    console.log('\n📋 Datos en turnos_extras:');
    if (turnosExtras.rows.length === 0) {
      console.log('  - No hay datos en la tabla');
    } else {
      turnosExtras.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ID: ${row.id}, Estado: ${row.estado}, Fecha: ${row.fecha}, Guardia: ${row.guardia_id}, Pauta: ${row.pauta_id}`);
      });
    }

    // Contar por estado
    const countByState = await client.query(`
      SELECT estado, COUNT(*) as count
      FROM as_turnos_pauta_mensual 
      GROUP BY estado
      ORDER BY count DESC
    `);

    console.log('\n📊 Conteo por estado:');
    countByState.rows.forEach(row => {
      console.log(`  - ${row.estado}: ${row.count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

checkPautaData(); 