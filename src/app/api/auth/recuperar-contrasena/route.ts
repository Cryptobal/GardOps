import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'
import { getApiBaseUrl } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      )
    }

    // Buscar usuario por email
    const userResult = await sql`
      SELECT id, nombre, email 
      FROM usuarios 
      WHERE lower(email) = lower(${email}) 
      AND activo = true
      LIMIT 1
    `

    const user = userResult.rows[0]

    // No revelar si el email existe o no por seguridad
    if (!user) {
      console.log('📧 Solicitud de recuperación para email no registrado:', email)
      return NextResponse.json(
        { message: 'Si el email está registrado, recibirás un enlace de recuperación' },
        { status: 200 }
      )
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    // Asegurar tabla de tokens (idempotente)
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT false
      )
    `

    // Eliminar tokens anteriores del usuario
    await sql`
      DELETE FROM password_reset_tokens 
      WHERE user_id = ${user.id}
    `

    // Guardar nuevo token
    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
    `

    // Construir URL de restablecimiento usando la configuración centralizada
    const baseUrl = getApiBaseUrl();
    const resetUrl = `${baseUrl}/restablecer-contrasena?token=${token}`;

    console.log('✅ Solicitud de recuperación procesada para:', user.email)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 URL de restablecimiento:', resetUrl)
      console.log('⏰ Expira:', expiresAt.toLocaleString('es-CL'))
    }

    // Enviar email (no romper flujo si falla)
    const emailResult = await sendPasswordResetEmail(user.email, user.nombre, resetUrl)
    if (!emailResult?.success) {
      console.warn('⚠️ Envío de email no exitoso:', emailResult?.message)
    }

    return NextResponse.json(
      { message: 'Si el email está registrado, recibirás un enlace de recuperación' },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Error en recuperar-contrasena:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
