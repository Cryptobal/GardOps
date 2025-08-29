const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

async function updateTestData() {
  try {
    // Obtener guardias con teléfonos
    const { rows: guardias } = await pool.query('SELECT id, nombre, telefono FROM guardias WHERE telefono IS NOT NULL LIMIT 2');
    console.log('Guardias disponibles:', guardias);

    if (guardias.length === 0) {
      console.log('No hay guardias con teléfonos disponibles');
      await pool.end();
      return;
    }

    // Actualizar los registros existentes para que tengan guardias asignados
    await pool.query(`
      UPDATE as_turnos_pauta_mensual 
      SET guardia_id = $1, estado = 'trabajado'
      WHERE id = 894
    `, [guardias[0].id]);

    await pool.query(`
      UPDATE as_turnos_pauta_mensual 
      SET guardia_id = $1, estado = 'trabajado'
      WHERE id = 925
    `, [guardias[1].id]);

    console.log('✅ Datos actualizados exitosamente');
    console.log('Ahora puedes ver los botones de WhatsApp en la interfaz');
    console.log('Recarga la página para ver los cambios');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

updateTestData();
