import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, signToken } from '../../../../lib/auth';
import { vercelSql } from '../../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    // Obtener el token actual de las cookies
    const cookieHeader = request.headers.get('cookie') || '';
    let currentToken: string | null = null;
    
    for (const part of cookieHeader.split(';')) {
      const [k, v] = part.trim().split('=');
      if (k === 'auth_token') currentToken = v || null;
    }
    
    if (!currentToken) {
      return NextResponse.json(
        { error: 'Token no encontrado' },
        { status: 401 }
      );
    }

    // Verificar el token actual
    const decoded = verifyToken(currentToken);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario aún existe y está activo
    const { rows } = await vercelSql<{
      id: string;
      email: string;
      nombre: string;
      apellido: string;
      rol: string;
      tenant_id: string;
    }>`
      SELECT id::text as id, email, nombre, apellido, rol, tenant_id::text as tenant_id
      FROM public.usuarios
      WHERE id = ${decoded.user_id}::uuid AND activo = true
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo' },
        { status: 401 }
      );
    }

    const user = rows[0];

    // Crear nuevo token con la misma información
    const isDefaultTenant = user.tenant_id === '550e8400-e29b-41d4-a716-446655440000';
    const isPlatformAdmin = !user.tenant_id || isDefaultTenant;
    
    const newToken = signToken({
      user_id: user.id,
      email: user.email,
      rol: user.rol as 'admin' | 'supervisor' | 'guardia',
      tenant_id: user.tenant_id,
      is_platform_admin: isPlatformAdmin
    });

    // Crear response con nuevo token
    const response = NextResponse.json({
      success: true,
      message: 'Token renovado exitosamente',
      expires_in: 1800 // 30 minutos en segundos
    });

    // Configurar cookie con información del tenant
    const tenantInfo = {
      id: user.tenant_id,
      user_id: user.id,
      email: user.email,
      nombre: user.nombre
    };

    // Configurar cookie segura con el tenant
    response.cookies.set('tenant', JSON.stringify(tenantInfo), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1800 // 30 minutos
    });

    // Configurar el nuevo token como cookie
    response.cookies.set('auth_token', newToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1800 // 30 minutos
    });

    console.log(`✅ Token renovado para: ${user.email} (${user.nombre} ${user.apellido})`);

    return response;

  } catch (error) {
    console.error('Error renovando token:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
