import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json()

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token y nueva contraseña son requeridos' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Buscar token válido
    const tokenResult = await sql`
      SELECT prt.id, prt.user_id, prt.expires_at, prt.used,
             u.nombre, u.email
      FROM password_reset_tokens prt
      JOIN usuarios u ON u.id = prt.user_id
      WHERE prt.token = ${token}
      AND u.activo = true
      LIMIT 1
    `

    const tokenData = tokenResult.rows[0]

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400 }
      )
    }

    // Verificar si el token ha expirado
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Token expirado' },
        { status: 400 }
      )
    }

    // Verificar si el token ya fue usado
    if (tokenData.used) {
      return NextResponse.json(
        { error: 'Token ya fue utilizado' },
        { status: 400 }
      )
    }

    // Actualizar contraseña del usuario
    const updateResult = await sql`
      UPDATE usuarios 
      SET password = crypt(${newPassword}, gen_salt('bf'))
      WHERE id = ${tokenData.user_id}
      RETURNING id
    `

    if (!updateResult.rows[0]) {
      return NextResponse.json(
        { error: 'Error al actualizar contraseña' },
        { status: 500 }
      )
    }

    // Marcar token como usado
    await sql`
      UPDATE password_reset_tokens 
      SET used = true 
      WHERE id = ${tokenData.id}
    `

    console.log('✅ Contraseña restablecida exitosamente para:', tokenData.email)

    return NextResponse.json({
      message: 'Contraseña restablecida exitosamente'
    })

  } catch (error) {
    console.error('❌ Error en restablecer-contrasena:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
