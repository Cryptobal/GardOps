#!/usr/bin/env node

/**
 * Script para probar el envío de emails con Resend
 */

require('dotenv').config({ path: '.env.local' });

const { sendPasswordResetEmail } = require('../src/lib/email');

async function testEmailSending() {
  try {
    console.log('🧪 Probando envío de email con Resend...\n');
    
    // Datos de prueba
    const testEmail = 'carlos.irigoyen@gard.cl';
    const testName = 'Carlos Irigoyen';
    const testUrl = 'http://localhost:3000/restablecer-contrasena?token=test-token-123';
    
    console.log('📧 Enviando email de prueba...');
    console.log(`   Para: ${testEmail}`);
    console.log(`   Nombre: ${testName}`);
    console.log(`   URL: ${testUrl}`);
    console.log('');
    
    // Enviar email
    const result = await sendPasswordResetEmail(testEmail, testName, testUrl);
    
    console.log('✅ Email enviado exitosamente!');
    console.log('📊 Resultado:', result);
    
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Sugerencia: Verifica que la API key de Resend esté configurada correctamente en .env.local');
    }
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testEmailSending()
    .then(() => {
      console.log('\n🎉 Prueba de email completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testEmailSending };
