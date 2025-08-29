// Sistema de email sin dependencias externas
export async function sendPasswordResetEmail(userEmail: string, userName: string, resetUrl: string) {
  try {
    // En desarrollo, solo mostrar la URL en consola
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 [DESARROLLO] Email de recuperación simulado:');
      console.log('   Para:', userEmail);
      console.log('   Nombre:', userName);
      console.log('   URL de restablecimiento:', resetUrl);
      console.log('   🔗 Copia y pega esta URL en tu navegador para probar:');
      console.log('   ' + resetUrl);
      
      // Simular éxito
      return { success: true, message: 'Email simulado en desarrollo' };
    }

    // En producción, mostrar URL en logs del servidor
    console.log('📧 [PRODUCCIÓN] Email de recuperación:');
    console.log('   Para:', userEmail);
    console.log('   Nombre:', userName);
    console.log('   URL de restablecimiento:', resetUrl);
    console.log('   🔗 Copia y pega esta URL en tu navegador:');
    console.log('   ' + resetUrl);
    
    return { success: true, message: 'Email enviado (modo fallback)' };

  } catch (error) {
    console.error('❌ Error general en sendPasswordResetEmail:', error);
    throw new Error('Error interno del servidor al enviar email');
  }
}
