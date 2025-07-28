import { NextRequest, NextResponse } from 'next/server'

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

    // Simulación de autenticación (en producción esto debería verificar contra base de datos)
    const validUsers = [
      { email: 'admin@gardops.com', password: 'admin123' },
      { email: 'supervisor@gardops.com', password: 'super123' },
      { email: 'guardia@gardops.com', password: 'guard123' }
    ]

    const user = validUsers.find(u => u.email === email && u.password === password)

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      )
    }

    // Crear un JWT simulado (en producción usar una librería como jsonwebtoken)
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      email: user.email,
      iat: now,
      exp: now + (24 * 60 * 60) // 24 horas de expiración
    }

    // JWT simulado (solo para testing)
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payloadEncoded = btoa(JSON.stringify(payload))
    const signature = btoa('mock-signature')
    const access_token = `${header}.${payloadEncoded}.${signature}`

    return NextResponse.json({
      access_token,
      user: {
        email: user.email,
        name: user.email.split('@')[0]
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 