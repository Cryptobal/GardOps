import { Resend } from 'resend';

// Inicializar Resend con la API key
const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envía un email usando Resend
 */
export async function sendEmail(template: EmailTemplate) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'GardOps <noreply@gard.cl>',
      to: template.to,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error('❌ Error enviando email:', error);
      throw new Error(`Error enviando email: ${error.message}`);
    }

    console.log('✅ Email enviado exitosamente:', data);
    return data;
  } catch (error) {
    console.error('❌ Error en sendEmail:', error);
    throw error;
  }
}

/**
 * Genera el template HTML para recuperación de contraseña
 */
export function generatePasswordResetEmail(email: string, resetUrl: string): EmailTemplate {
  const html = `
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
          background-color: white;
          border-radius: 8px;
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
          background-color: #2563eb;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
        }
        .button:hover {
          background-color: #1d4ed8;
        }
        .warning {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 15px;
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
        .url {
          word-break: break-all;
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
          <p>Hola,</p>
          
          <p>Has solicitado restablecer tu contraseña en GardOps. Haz clic en el botón de abajo para crear una nueva contraseña:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">
              🔑 Restablecer Contraseña
            </a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>Este enlace expira en 1 hora</li>
              <li>Solo puedes usar este enlace una vez</li>
              <li>Si no solicitaste este cambio, puedes ignorar este email</li>
            </ul>
          </div>
          
          <p>Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
          <p><a href="${resetUrl}" class="url">${resetUrl}</a></p>
        </div>
        
        <div class="footer">
          <p>Este email fue enviado desde GardOps - Sistema de Gestión de Guardias</p>
          <p>Si tienes alguna pregunta, contacta al administrador del sistema.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    to: email,
    subject: '🔐 Recuperar Contraseña - GardOps',
    html: html,
  };
}

/**
 * Envía email de recuperación de contraseña
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const template = generatePasswordResetEmail(email, resetUrl);
  return await sendEmail(template);
}
