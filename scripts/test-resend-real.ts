#!/usr/bin/env tsx

import { config } from 'dotenv';
import { sendPasswordResetEmail } from '../src/lib/email';

// Cargar variables de entorno
config({ path: '.env.local' });

async function testResendEmail() {
  console.log('🧪 Probando envío real de email con Resend...\n');
  
  const testEmail = 'carlos.irigoyen@gard.cl';
  const testResetUrl = 'http://localhost:3000/restablecer-contrasena?token=test123abc';
  
  try {
    console.log(`📧 Enviando email de prueba a: ${testEmail}`);
    console.log(`🔗 URL de prueba: ${testResetUrl}\n`);
    
    const result = await sendPasswordResetEmail(testEmail, testResetUrl);
    
    console.log('✅ ¡Email enviado exitosamente!');
    console.log('📊 Resultado:', result);
    
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    
    if (error instanceof Error) {
      console.error('💥 Mensaje de error:', error.message);
    }
  }
}

// Ejecutar la prueba
testResendEmail()
  .then(() => {
    console.log('\n🎯 Prueba completada.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error en la prueba:', error);
    process.exit(1);
  });
