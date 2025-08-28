import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { validateEmail } from '../../../../lib/schemas/usuarios'
import { sendPasswordResetEmail } from '../../../../lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validación básica
    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      )
    }

    // Validar formato de email
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe y está activo
    const userResult = await sql<{ id: string; email: string; nombre: string; apellido: string }>`
      SELECT id, email, nombre, apellido
      FROM public.usuarios
      WHERE lower(email) = lower(${email}) AND activo = true
      LIMIT 1
    `

    if (userResult.rows.length === 0) {
      // Por seguridad, no revelamos si el email existe o no
      return NextResponse.json({
        message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.'
      })
    }

    const user = userResult.rows[0]

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    // Crear tabla de tokens de recuperación si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Eliminar tokens expirados o usados
    await sql`
      DELETE FROM password_reset_tokens 
      WHERE expires_at < NOW() OR used = TRUE
    `

    // Eliminar tokens existentes para este usuario
    await sql`
      DELETE FROM password_reset_tokens 
      WHERE user_id = ${user.id}::uuid
    `

    // Insertar nuevo token
    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}::uuid, ${token}, ${expiresAt.toISOString()})
    `

    // Generar URL de restablecimiento
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/restablecer-contrasena?token=${token}`
    
    // Enviar email usando Resend
    try {
      await sendPasswordResetEmail(user.email, resetUrl)
      
      console.log(`✅ Email de recuperación enviado a: ${user.email}`)
      console.log(`🔗 URL de restablecimiento: ${resetUrl}`)
      console.log(`⏰ Expira: ${expiresAt.toLocaleString()}`)
      
    } catch (emailError) {
      console.error('❌ Error enviando email:', emailError)
      
      // Si falla el email, eliminamos el token y damos error
      await sql`
        DELETE FROM password_reset_tokens 
        WHERE token = ${token}
      `
      
      return NextResponse.json(
        { error: 'Error al enviar el email de recuperación. Intenta nuevamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.'
    })

  } catch (error) {
    console.error('Error en recuperar contraseña:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
