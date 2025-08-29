// Sistema de email sin dependencias externas (usa API HTTP de Resend en producción)
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
      return { success: true, message: 'Email simulado en desarrollo' };
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || 'GardOps <noreply@gard.cl>';

    // Si no hay API KEY configurada, hacer fallback y no fallar la petición
    if (!apiKey) {
      console.warn('⚠️ RESEND_API_KEY no configurada. Usando fallback (log).');
      console.log('📧 [FALLBACK PRODUCCIÓN] Email de recuperación:');
      console.log('   Para:', userEmail);
      console.log('   Nombre:', userName);
      console.log('   URL de restablecimiento:', resetUrl);
      return { success: false, message: 'Resend no configurado; usando fallback' };
    }

    const subject = '🔐 Recuperación de Contraseña - GardOps';
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Recuperación de Contraseña - GardOps</title>
      </head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#111">
        <h2>Recuperación de Contraseña</h2>
        <p>Hola <strong>${userName || ''}</strong>,</p>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
        <p><a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Restablecer Contraseña</a></p>
        <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p style="word-break:break-all;color:#2563eb">${resetUrl}</p>
        <p style="color:#666;font-size:12px">Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este email.</p>
      </body>
      </html>
    `;

    // Enviar usando la API HTTP de Resend (sin dependencia)
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [userEmail], subject, html }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('❌ Resend API error:', resp.status, text);
      return { success: false, message: `Resend error ${resp.status}` };
    }

    const data = await resp.json().catch(() => ({}));
    console.log('✅ Email enviado vía Resend:', data);
    return { success: true, message: 'Email enviado' };
  } catch (error) {
    console.error('❌ Error general en sendPasswordResetEmail:', error);
    // No lanzar para no romper el flujo del endpoint; registrar y continuar
    return { success: false, message: 'Fallo en envío de email' };
  }
}
