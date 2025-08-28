import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
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

    // Verificar que el usuario existe y está activo
    const userResult = await sql<{ id: string; email: string; nombre: string; apellido: string }>`
      SELECT id, email, nombre, apellido
      FROM public.usuarios
      WHERE id = ${tokenResult.rows[0].user_id}::uuid 
        AND activo = true
      LIMIT 1
    `

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      valid: true,
      user: {
        email: userResult.rows[0].email,
        nombre: userResult.rows[0].nombre,
        apellido: userResult.rows[0].apellido
      }
    })

  } catch (error) {
    console.error('Error verificando token:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
