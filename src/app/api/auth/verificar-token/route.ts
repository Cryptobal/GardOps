import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token es requerido' },
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

    return NextResponse.json({
      valid: true,
      user: {
        id: tokenData.user_id,
        nombre: tokenData.nombre,
        email: tokenData.email
      }
    })

  } catch (error) {
    console.error('❌ Error en verificar-token:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
