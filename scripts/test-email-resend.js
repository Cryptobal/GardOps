#!/usr/bin/env node

/**
 * Script para probar el envío de emails con Resend
 */

require('dotenv').config({ path: '.env.local' });

const { sendPasswordResetEmail } = require('../src/lib/email.js');

async function testEmailSending() {
  try {
    console.log('🧪 Probando envío de email con Resend...\n');
    
    // Datos de prueba
    const testEmail = 'carlos.irigoyen@gard.cl';
    const testName = 'Carlos Irigoyen';
    const testUrl = 'https://ops.gard.cl/restablecer-contrasena?token=test-token-123';
    
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
      console.log('   RESEND_API_KEY=re_GRe6HLsu_CWLtG7tq1YzFweBaMttyHi7G');
    }
    
    if (error.message.includes('domain')) {
      console.log('\n💡 Sugerencia: Verifica que el dominio gard.cl esté configurado en tu cuenta de Resend');
    }
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testEmailSending();
}

module.exports = { testEmailSending };
