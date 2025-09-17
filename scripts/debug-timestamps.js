require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function debugTimestamps() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debuggeando timestamps');
    
    // 1. Verificar timezone actual
    const { rows: tzRows } = await client.query("SELECT now() AT TIME ZONE 'UTC' as utc_now, now() AT TIME ZONE 'America/Santiago' as chile_now");
    console.log('🕐 Tiempo actual:');
    console.log(`   UTC: ${tzRows[0].utc_now}`);
    console.log(`   Chile: ${tzRows[0].chile_now}`);
    
    // 2. Probar conversión de 19:00 del 16 de septiembre
    const { rows: convRows } = await client.query(`
      SELECT 
        '2025-09-16 19:00:00'::timestamp as original_ts,
        ('2025-09-16 19:00:00'::timestamp AT TIME ZONE 'America/Santiago') as chile_to_utc,
        ('2025-09-16 19:00:00'::timestamp AT TIME ZONE 'America/Santiago') AT TIME ZONE 'UTC' as final_utc,
        EXTRACT(HOUR FROM ('2025-09-16 19:00:00'::timestamp AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago') as back_to_chile_hour
    `);
    
    console.log('🔄 Conversión de timestamps:');
    console.log(`   Original: ${convRows[0].original_ts}`);
    console.log(`   Chile->UTC: ${convRows[0].chile_to_utc}`);
    console.log(`   Final UTC: ${convRows[0].final_utc}`);
    console.log(`   Back to Chile hour: ${convRows[0].back_to_chile_hour}`);
    
    // 3. Verificar qué está pasando en la vista actual
    const { rows: vistaRows } = await client.query(`
      SELECT 
        programado_para,
        programado_para AT TIME ZONE 'America/Santiago' as chile_time,
        EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') as hora_chile
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16'
      ORDER BY programado_para
      LIMIT 5
    `);
    
    console.log('📊 Primeros 5 llamados de la vista:');
    vistaRows.forEach(row => {
      console.log(`   UTC: ${row.programado_para} -> Chile: ${row.chile_time} -> Hora: ${row.hora_chile}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

debugTimestamps().catch(console.error);
