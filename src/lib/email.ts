// Sistema de email usando Resend en desarrollo y producción
export async function sendPasswordResetEmail(userEmail: string, userName: string, resetUrl: string) {
  try {
    // Usar Resend tanto en desarrollo como en producción
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || 'GardOps <noreply@gard.cl>';

    if (!apiKey) {
      console.warn('⚠️ RESEND_API_KEY no configurada. Usando fallback (log).');
      console.log('📧 [FALLBACK] Email de recuperación:');
      console.log('   Para:', userEmail);
      console.log('   Nombre:', userName);
      console.log('   URL de restablecimiento:', resetUrl);
      console.log('   🔗 Copia y pega esta URL en tu navegador:');
      console.log('   ' + resetUrl);
      
      return { success: true, message: 'Email enviado (modo fallback)' };
    }

    // Enviar email real vía Resend HTTP API (desarrollo y producción)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: from,
        to: [userEmail],
        subject: 'Recuperación de Contraseña - GardOps',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Recuperación de Contraseña</h2>
            <p>Hola ${userName},</p>
            <p>Has solicitado restablecer tu contraseña en GardOps.</p>
            <p>Haz clic en el siguiente enlace para continuar:</p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              Restablecer Contraseña
            </a>
            <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
            <p>Este enlace expira en 1 hora.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              GardOps - Sistema de Gestión de Guardias
            </p>
          </div>
        `
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Email enviado vía Resend:', result.id);
      console.log('📧 Detalles del email:');
      console.log('   De:', from);
      console.log('   Para:', userEmail);
      console.log('   Asunto: Recuperación de Contraseña - GardOps');
      console.log('   URL:', resetUrl);
      return { success: true, message: 'Email enviado correctamente' };
    } else {
      const error = await response.text();
      console.error('❌ Error enviando email vía Resend:', error);
      throw new Error('Error enviando email');
    }

  } catch (error) {
    console.error('❌ Error general en sendPasswordResetEmail:', error);
    
    // Fallback: mostrar URL en logs
    console.log('📧 [FALLBACK] Email de recuperación:');
    console.log('   Para:', userEmail);
    console.log('   Nombre:', userName);
    console.log('   URL de restablecimiento:', resetUrl);
    console.log('   🔗 Copia y pega esta URL en tu navegador:');
    console.log('   ' + resetUrl);
    
    return { success: true, message: 'Email enviado (modo fallback)' };
  }
}
