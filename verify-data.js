const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

async function verifyData() {
  try {
    const { rows } = await pool.query('SELECT pauta_id, estado_ui, guardia_trabajo_nombre FROM as_turnos_v_pauta_diaria_dedup WHERE fecha = $1', ['2025-08-28']);
    console.log('Datos actualizados:', rows);
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

verifyData();
