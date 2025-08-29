const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

async function createTestData() {
  try {
    // Primero, obtener algunos guardias con teléfonos
    const { rows: guardias } = await pool.query('SELECT id, nombre, telefono FROM guardias WHERE telefono IS NOT NULL LIMIT 3');
    console.log('Guardias disponibles:', guardias);

    if (guardias.length === 0) {
      console.log('No hay guardias con teléfonos disponibles');
      await pool.end();
      return;
    }

    // Crear datos de prueba para la fecha 2025-08-28
    const testData = [
      {
        pauta_id: 'test-1',
        fecha: '2025-08-28',
        puesto_id: '7ab86962-7f23-4602-bde2-78d6198adbf9',
        instalacion_id: '0e8ba906-e64b-4d4d-a104-ba29f21f48a9',
        instalacion_nombre: 'A TEST 33',
        estado: 'asistido',
        estado_ui: 'asistido',
        guardia_trabajo_id: guardias[0].id,
        guardia_trabajo_nombre: guardias[0].nombre,
        es_ppc: false,
        hora_inicio: '08:00',
        hora_fin: '20:00',
        rol_nombre: 'Día 4x4x12 / 08:00 20:00'
      },
      {
        pauta_id: 'test-2',
        fecha: '2025-08-28',
        puesto_id: '7b28c39a-33c4-4ff9-9fc4-41d5b127e026',
        instalacion_id: '0e8ba906-e64b-4d4d-a104-ba29f21f48a9',
        instalacion_nombre: 'A TEST 33',
        estado: 'reemplazo',
        estado_ui: 'reemplazo',
        guardia_trabajo_id: guardias[1].id,
        guardia_trabajo_nombre: guardias[1].nombre,
        es_ppc: false,
        hora_inicio: '20:00',
        hora_fin: '08:00',
        rol_nombre: 'Noche 4x4x12 / 20:00 08:00'
      }
    ];

    // Insertar datos de prueba
    for (const data of testData) {
      await pool.query(`
        INSERT INTO as_turnos_v_pauta_diaria_dedup (
          pauta_id, fecha, puesto_id, instalacion_id, instalacion_nombre,
          estado, estado_ui, guardia_trabajo_id, guardia_trabajo_nombre,
          es_ppc, hora_inicio, hora_fin, rol_nombre
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (pauta_id) DO UPDATE SET
          estado = EXCLUDED.estado,
          estado_ui = EXCLUDED.estado_ui,
          guardia_trabajo_id = EXCLUDED.guardia_trabajo_id,
          guardia_trabajo_nombre = EXCLUDED.guardia_trabajo_nombre
      `, [
        data.pauta_id, data.fecha, data.puesto_id, data.instalacion_id, data.instalacion_nombre,
        data.estado, data.estado_ui, data.guardia_trabajo_id, data.guardia_trabajo_nombre,
        data.es_ppc, data.hora_inicio, data.hora_fin, data.rol_nombre
      ]);
    }

    console.log('✅ Datos de prueba creados exitosamente');
    console.log('Ahora puedes ver los botones de WhatsApp en la interfaz');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

createTestData();
