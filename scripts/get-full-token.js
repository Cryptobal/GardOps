require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function getFullToken() {
  try {
    console.log('🔍 Obteniendo token completo...');
    
    const tokensResult = await sql`
      SELECT prt.token
      FROM password_reset_tokens prt
      JOIN usuarios u ON u.id = prt.user_id
      WHERE u.email = 'carlos.irigoyen@gard.cl'
      AND prt.used = false
      ORDER BY prt.created_at DESC
      LIMIT 1
    `;
    
    if (tokensResult.rows.length > 0) {
      const token = tokensResult.rows[0].token;
      console.log('✅ Token completo:', token);
      
      // Probar el endpoint con el token completo
      const { exec } = require('child_process');
      const command = `curl -s "http://localhost:3000/api/auth/verificar-token?token=${token}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Error al probar endpoint:', error);
          return;
        }
        console.log('📡 Respuesta del endpoint:', stdout);
      });
      
    } else {
      console.log('❌ No se encontró token válido');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getFullToken();
