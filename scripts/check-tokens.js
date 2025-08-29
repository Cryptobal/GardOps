require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkTokens() {
  try {
    console.log('🔍 Verificando tokens en la base de datos...');
    
    const tokensResult = await sql`
      SELECT prt.id, prt.token, prt.user_id, prt.expires_at, prt.used,
             u.nombre, u.email
      FROM password_reset_tokens prt
      JOIN usuarios u ON u.id = prt.user_id
      ORDER BY prt.created_at DESC
    `;
    
    console.log(`📊 Encontrados ${tokensResult.rows.length} tokens:`);
    
    tokensResult.rows.forEach((token, index) => {
      console.log(`\n${index + 1}. Token: ${token.token.substring(0, 20)}...`);
      console.log(`   Usuario: ${token.nombre} (${token.email})`);
      console.log(`   Expira: ${new Date(token.expires_at).toLocaleString()}`);
      console.log(`   Usado: ${token.used ? 'Sí' : 'No'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTokens();
