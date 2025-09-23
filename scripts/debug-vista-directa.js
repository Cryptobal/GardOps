require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function debugVistaDirecta() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debug directo de la vista');
    
    // 1. Probar la generación de timestamps directamente
    const { rows } = await client.query(`
      SELECT 
        -- Probar la lógica exacta de la vista
        timezone('UTC', timezone('America/Santiago', '2025-09-16 19:00:00'::timestamp)) as ts_19,
        timezone('UTC', timezone('America/Santiago', '2025-09-16 20:00:00'::timestamp)) as ts_20,
        timezone('UTC', timezone('America/Santiago', '2025-09-16 21:00:00'::timestamp)) as ts_21,
        -- Verificar qué hora se extrae
        EXTRACT(HOUR FROM timezone('America/Santiago', timezone('UTC', timezone('America/Santiago', '2025-09-16 19:00:00'::timestamp)))) as hour_19,
        EXTRACT(HOUR FROM timezone('America/Santiago', timezone('UTC', timezone('America/Santiago', '2025-09-16 20:00:00'::timestamp)))) as hour_20,
        EXTRACT(HOUR FROM timezone('America/Santiago', timezone('UTC', timezone('America/Santiago', '2025-09-16 21:00:00'::timestamp)))) as hour_21
    `);
    
    console.log('📊 Timestamps generados:');
    console.log(`   19:00 -> ${rows[0].ts_19} -> Hora extraída: ${rows[0].hour_19}`);
    console.log(`   20:00 -> ${rows[0].ts_20} -> Hora extraída: ${rows[0].hour_20}`);
    console.log(`   21:00 -> ${rows[0].ts_21} -> Hora extraída: ${rows[0].hour_21}`);
    
    // 2. Verificar qué está pasando en la vista actual
    const { rows: vistaRows } = await client.query(`
      SELECT 
        id,
        instalacion_id,
        programado_para,
        timezone('America/Santiago', programado_para) as chile_time,
        EXTRACT(HOUR FROM timezone('America/Santiago', programado_para)) as hora_chile
      FROM central_v_llamados_automaticos
      WHERE DATE(timezone('America/Santiago', programado_para)) = '2025-09-16'
      ORDER BY programado_para
      LIMIT 3
    `);
    
    console.log('🎯 Primeros 3 registros de la vista:');
    vistaRows.forEach(row => {
      console.log(`   ID: ${row.id.substring(0,8)}... -> UTC: ${row.programado_para} -> Chile: ${row.chile_time} -> Hora: ${row.hora_chile}`);
    });
    
    // 3. Verificar si hay algún problema con los datos de pauta_mensual
    const { rows: pautaRows } = await client.query(`
      SELECT 
        id,
        instalacion_id,
        anio,
        mes,
        dia,
        tipo_turno
      FROM as_turnos_pauta_mensual 
      WHERE anio = 2025 AND mes = 9 AND dia = 16
      LIMIT 3
    `);
    
    console.log('📅 Datos de pauta mensual:');
    pautaRows.forEach(row => {
      console.log(`   ID: ${row.id.substring(0,8)}... -> Instalación: ${row.instalacion_id} -> Fecha: ${row.anio}-${row.mes}-${row.dia} -> Tipo: ${row.tipo_turno}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

debugVistaDirecta().catch(console.error);

