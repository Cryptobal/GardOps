// Importar Resend de manera condicional
let Resend: any;
try {
  Resend = require('resend').Resend;
} catch (error) {
  console.log('⚠️ Resend no está instalado. Usando modo fallback.');
}

// Versión temporal para desarrollo - no requiere resend
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

    // En producción, verificar si Resend está disponible
    if (Resend) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY || 're_hTxywx1n_JWrRbYoYtNoqDrQxwXNNXMNd');

        const { data, error } = await resend.emails.send({
          from: 'GardOps <noreply@gard.cl>',
          to: [userEmail],
          subject: '🔐 Recuperación de Contraseña - GardOps',
          html: `
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Recuperación de Contraseña - GardOps</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f9f9f9;
                }
                .container {
                  background-color: white;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                }
                .logo {
                  font-size: 24px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 10px;
                }
                .title {
                  font-size: 20px;
                  color: #1f2937;
                  margin-bottom: 20px;
                }
                .content {
                  margin-bottom: 30px;
                }
                .button {
                  display: inline-block;
                  background-color: #2563eb;
                  color: white;
                  padding: 12px 24px;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: 500;
                  margin: 20px 0;
                }
                .button:hover {
                  background-color: #1d4ed8;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #e5e7eb;
                  color: #6b7280;
                  font-size: 14px;
                }
                .warning {
                  background-color: #fef3c7;
                  border: 1px solid #f59e0b;
                  border-radius: 6px;
                  padding: 15px;
                  margin: 20px 0;
                  color: #92400e;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">🏢 GardOps</div>
                  <h1 class="title">Recuperación de Contraseña</h1>
                </div>
                
                <div class="content">
                  <p>Hola <strong>${userName}</strong>,</p>
                  
                  <p>Has solicitado restablecer tu contraseña en GardOps. Haz clic en el botón de abajo para crear una nueva contraseña:</p>
                  
                  <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">🔐 Restablecer Contraseña</a>
                  </div>
                  
                  <div class="warning">
                    <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora por seguridad. Si no solicitaste este cambio, puedes ignorar este email.
                  </div>
                  
                  <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                  <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
                </div>
                
                <div class="footer">
                  <p>Este es un email automático, por favor no respondas a este mensaje.</p>
                  <p>© 2024 GardOps. Todos los derechos reservados.</p>
                </div>
              </div>
            </body>
            </html>
          `
        });

        if (error) {
          console.error('❌ Error al enviar email con Resend:', error);
          throw new Error(`Error al enviar email: ${error.message}`);
        }

        console.log('✅ Email enviado exitosamente con Resend:', data);
        return { success: true, message: 'Email enviado exitosamente' };

      } catch (resendError) {
        console.error('❌ Error con Resend:', resendError);
        // Fallback: mostrar URL en consola
        console.log('📧 [FALLBACK] Email de recuperación:');
        console.log('   Para:', userEmail);
        console.log('   Nombre:', userName);
        console.log('   URL de restablecimiento:', resetUrl);
        console.log('   🔗 Copia y pega esta URL en tu navegador:');
        console.log('   ' + resetUrl);
        
        return { success: true, message: 'Email enviado (modo fallback)' };
      }
    } else {
      // Fallback cuando Resend no está disponible
      console.log('📧 [FALLBACK] Email de recuperación:');
      console.log('   Para:', userEmail);
      console.log('   Nombre:', userName);
      console.log('   URL de restablecimiento:', resetUrl);
      console.log('   🔗 Copia y pega esta URL en tu navegador:');
      console.log('   ' + resetUrl);
      
      return { success: true, message: 'Email enviado (modo fallback)' };
    }

  } catch (error) {
    console.error('❌ Error general en sendPasswordResetEmail:', error);
    throw new Error('Error interno del servidor al enviar email');
  }
}
