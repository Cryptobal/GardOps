import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    // Validación básica
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token y nueva contraseña son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar que el token existe y no ha expirado
    const tokenResult = await sql<{ id: string; user_id: string; expires_at: string }>`
      SELECT id, user_id, expires_at
      FROM password_reset_tokens
      WHERE token = ${token} 
        AND used = FALSE 
        AND expires_at > NOW()
      LIMIT 1
    `

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400 }
      )
    }

    const tokenData = tokenResult.rows[0]

    // Verificar que el usuario existe y está activo
    const userResult = await sql<{ id: string; email: string }>`
      SELECT id, email
      FROM public.usuarios
      WHERE id = ${tokenData.user_id}::uuid 
        AND activo = true
      LIMIT 1
    `

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar la contraseña del usuario
    const updateResult = await sql`
      UPDATE public.usuarios 
      SET password = crypt(${password}, gen_salt('bf'))
      WHERE id = ${tokenData.user_id}::uuid
      RETURNING id
    `

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Error al actualizar la contraseña' },
        { status: 500 }
      )
    }

    // Marcar el token como usado
    await sql`
      UPDATE password_reset_tokens 
      SET used = TRUE 
      WHERE id = ${tokenData.id}::uuid
    `

    console.log(`✅ Contraseña restablecida para: ${userResult.rows[0].email}`)

    return NextResponse.json({
      message: 'Contraseña actualizada correctamente'
    })

  } catch (error) {
    console.error('Error restableciendo contraseña:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
