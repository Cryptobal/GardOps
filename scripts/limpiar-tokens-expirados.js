require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function limpiarTokensExpirados() {
  try {
    console.log('🧹 Limpiando tokens expirados...');
    
    // Contar tokens antes de limpiar
    const countBefore = await sql`
      SELECT COUNT(*) as count 
      FROM password_reset_tokens
    `;
    console.log(`📊 Tokens antes de limpiar: ${countBefore.rows[0].count}`);
    
    // Eliminar tokens expirados
    const result = await sql`
      DELETE FROM password_reset_tokens 
      WHERE expires_at < NOW()
    `;
    
    console.log(`🗑️ Tokens expirados eliminados: ${result.rowCount}`);
    
    // Contar tokens después de limpiar
    const countAfter = await sql`
      SELECT COUNT(*) as count 
      FROM password_reset_tokens
    `;
    console.log(`📊 Tokens después de limpiar: ${countAfter.rows[0].count}`);
    
    console.log('✅ Limpieza completada');
    
  } catch (error) {
    console.error('❌ Error al limpiar tokens:', error);
  }
}

limpiarTokensExpirados();
