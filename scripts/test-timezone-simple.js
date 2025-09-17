require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function testTimezoneSimple() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Test simple de timezone');
    
    // 1. Probar diferentes formas de crear timestamp para 19:00
    const { rows } = await client.query(`
      SELECT 
        '2025-09-16 19:00:00'::timestamp as ts1,
        '2025-09-16 19:00:00'::timestamptz as ts2,
        timezone('America/Santiago', '2025-09-16 19:00:00'::timestamp) as ts3,
        timezone('UTC', timezone('America/Santiago', '2025-09-16 19:00:00'::timestamp)) as ts4,
        EXTRACT(HOUR FROM '2025-09-16 19:00:00'::timestamp AT TIME ZONE 'America/Santiago') as hour1,
        EXTRACT(HOUR FROM timezone('America/Santiago', '2025-09-16 19:00:00'::timestamp) AT TIME ZONE 'America/Santiago') as hour2,
        EXTRACT(HOUR FROM timezone('UTC', timezone('America/Santiago', '2025-09-16 19:00:00'::timestamp)) AT TIME ZONE 'America/Santiago') as hour3
    `);
    
    console.log('📊 Resultados:');
    console.log(`   ts1 (timestamp): ${rows[0].ts1}`);
    console.log(`   ts2 (timestamptz): ${rows[0].ts2}`);
    console.log(`   ts3 (timezone chile): ${rows[0].ts3}`);
    console.log(`   ts4 (chile->utc): ${rows[0].ts4}`);
    console.log(`   hour1: ${rows[0].hour1}`);
    console.log(`   hour2: ${rows[0].hour2}`);
    console.log(`   hour3: ${rows[0].hour3}`);
    
    // 2. Verificar qué timezone está usando la base de datos
    const { rows: tzRows } = await client.query("SHOW timezone");
    console.log(`🌍 Timezone de la BD: ${tzRows[0].TimeZone}`);
    
    // 3. Verificar el offset actual
    const { rows: offsetRows } = await client.query(`
      SELECT 
        EXTRACT(TIMEZONE_HOUR FROM now()) as offset_hours,
        EXTRACT(TIMEZONE_MINUTE FROM now()) as offset_minutes
    `);
    console.log(`⏰ Offset actual: ${offsetRows[0].offset_hours}:${offsetRows[0].offset_minutes}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testTimezoneSimple().catch(console.error);
