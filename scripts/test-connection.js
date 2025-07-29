const { Pool } = require('pg');
const { config } = require('dotenv');
const path = require('path');

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function testConnection() {
  console.log('🔍 VERIFICANDO CONEXIÓN A NEON...\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl || databaseUrl.includes('username') || databaseUrl.includes('hostname')) {
    console.log('❌ ERROR: La DATABASE_URL no está configurada correctamente');
    console.log('📝 Para configurarla:');
    console.log('   1. Ve a https://console.neon.tech/');
    console.log('   2. Selecciona tu proyecto');
    console.log('   3. Ve a "Connection Details"');
    console.log('   4. Copia la URL y reemplázala en .env.local');
    console.log('\n🔧 Tu URL debería verse así:');
    console.log('   postgresql://usuario:contraseña@ep-ejemplo-123.us-east-1.aws.neon.tech/basedatos?sslmode=require');
    return false;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('⏳ Probando conexión...');
    const result = await pool.query('SELECT NOW() as fecha_actual');
    console.log('✅ ¡CONEXIÓN EXITOSA!');
    console.log(`📅 Fecha del servidor: ${result.rows[0].fecha_actual}`);
    console.log('\n🚀 Ahora puedes ejecutar la auditoría completa con:');
    console.log('   node scripts/audit-database.js');
    return true;
  } catch (error) {
    console.log('❌ ERROR DE CONEXIÓN:');
    console.log(`   ${error.message}`);
    console.log('\n🔧 Verifica:');
    console.log('   • Que la URL esté correcta');
    console.log('   • Que tu base de datos en Neon esté activa');
    console.log('   • Que no tengas límites de conexión');
    return false;
  } finally {
    await pool.end();
  }
}

testConnection(); 