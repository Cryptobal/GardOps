#!/usr/bin/env node

/**
 * Script para limpiar tokens de recuperación de contraseña expirados
 * Se puede ejecutar manualmente o programar con cron
 */

const { sql } = require('@vercel/postgres');

async function limpiarTokensExpirados() {
  try {
    console.log('🧹 Iniciando limpieza de tokens expirados...');
    
    // Eliminar tokens expirados o usados
    const result = await sql`
      DELETE FROM password_reset_tokens 
      WHERE expires_at < NOW() OR used = TRUE
    `;
    
    console.log(`✅ Limpieza completada. Tokens eliminados: ${result.rowCount}`);
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  limpiarTokensExpirados()
    .then(() => {
      console.log('✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { limpiarTokensExpirados };
