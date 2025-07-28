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

    // Autenticar usuario usando JWT real con base de datos
    const authResult = await authenticateUser({ email, password })

    if (!authResult) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      )
    }

    console.log(`✅ Login exitoso para: ${email} (${authResult.user.nombre} ${authResult.user.apellido}) - Tenant: ${authResult.user.tenant_id}`)

    // Crear response con cookies configuradas
    const response = NextResponse.json({
      access_token: authResult.access_token,
      user: authResult.user,
      expires_in: 1800 // 30 minutos en segundos
    })

    // Configurar cookie con información del tenant (para APIs que la necesitan)
    const tenantInfo = {
      id: authResult.user.tenant_id,
      user_id: authResult.user.id,
      email: authResult.user.email,
      nombre: authResult.user.nombre
    }

    // Configurar cookie segura con el tenant
    response.cookies.set('tenant', JSON.stringify(tenantInfo), {
      httpOnly: false, // Permitir acceso desde JS si necesario
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      sameSite: 'lax', // Permitir cookies en same-site
      path: '/',
      maxAge: 1800 // 30 minutos
    })

    // También configurar el token como cookie para peticiones de APIs
    response.cookies.set('auth_token', authResult.access_token, {
      httpOnly: true, // Más seguro, solo accesible por el servidor
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1800 // 30 minutos
    })

    return response

  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 