import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '../../../../lib/api/usuarios'
import { validateEmail } from '../../../../lib/schemas/usuarios'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validación básica
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
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

    // Autenticar usuario usando la base de datos
    const authResult = await authenticateUser({ email, password })

    if (!authResult) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      )
    }

    console.log(`✅ Login exitoso para: ${email} (${authResult.user.nombre} ${authResult.user.apellido})`)

    return NextResponse.json({
      access_token: authResult.access_token,
      user: authResult.user
    })

  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 