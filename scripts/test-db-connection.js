require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function testDatabaseConnection() {
  try {
    console.log('🧪 Probando conexión a la base de datos...');
    
    // Probar conexión básica
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Conexión exitosa:', result.rows[0]);
    
    // Verificar tabla de tokens
    const tokensResult = await sql`
      SELECT COUNT(*) as count 
      FROM password_reset_tokens
    `;
    console.log('✅ Tabla password_reset_tokens:', tokensResult.rows[0]);
    
    // Verificar tabla de usuarios
    const usersResult = await sql`
      SELECT COUNT(*) as count 
      FROM usuarios
    `;
    console.log('✅ Tabla usuarios:', usersResult.rows[0]);
    
    // Buscar token específico
    const tokenResult = await sql`
      SELECT prt.id, prt.user_id, prt.expires_at, prt.used,
             u.nombre, u.email
      FROM password_reset_tokens prt
      JOIN usuarios u ON u.id = prt.user_id
      WHERE prt.token = '22bee897f3737ccaba32106b6dfdf889b3b753919df84bc672ff0724f573ef1c'
      AND u.activo = true
      LIMIT 1
    `;
    
    if (tokenResult.rows.length > 0) {
      console.log('✅ Token encontrado:', tokenResult.rows[0]);
    } else {
      console.log('❌ Token no encontrado');
    }
    
  } catch (error) {
    console.error('❌ Error en la conexión:', error);
  }
}

testDatabaseConnection();
