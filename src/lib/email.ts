import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_GRe6HLsu_CWLtG7tq1YzFweBaMttyHi7G');

async function sendPasswordResetEmail(userEmail, userName, resetUrl) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'GardOps <noreply@gard.cl>',
      to: [userEmail],
      subject: '🔐 Recuperar Contraseña - GardOps',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperar Contraseña - GardOps</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9fafb;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 20px;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background: #2563eb;
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
            }
            .warning {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 8px;
              padding: 16px;
              margin: 20px 0;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
            }
            .link {
              color: #2563eb;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🔐 GardOps</div>
              <h1 class="title">Recuperar Contraseña</h1>
            </div>
            
            <div class="content">
              <p>Hola <strong>${userName}</strong>,</p>
              
              <p>Has solicitado restablecer tu contraseña en GardOps. Haz clic en el botón de abajo para crear una nueva contraseña:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
              </div>
              
              <p>Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul style="margin: 10px 0 0 20px;">
                  <li>Este enlace expira en 1 hora por seguridad</li>
                  <li>Si no solicitaste este cambio, puedes ignorar este email</li>
                  <li>Nunca compartas este enlace con otras personas</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p>Este es un email automático de GardOps - Sistema de Gestión de Guardias</p>
              <p>Si tienes problemas, contacta al administrador del sistema</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Error enviando email:', error);
      throw new Error(`Error enviando email: ${error.message}`);
    }

    console.log('✅ Email de recuperación enviado a:', userEmail);
    console.log('🔗 URL de restablecimiento:', resetUrl);
    console.log('📊 Resultado:', data);

    return data;
  } catch (error) {
    console.error('❌ Error en sendPasswordResetEmail:', error);
    throw error;
  }
}

export { sendPasswordResetEmail };
