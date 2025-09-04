import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentUserServer } from '@/lib/auth';

/**
 * GET /api/auth/me
 * Obtiene información del usuario autenticado
 */
export async function GET(request: NextRequest) {
  try {
    // Usar el mismo patrón de autenticación que otras APIs
    const h = request.headers;
    const fromJwt = getCurrentUserServer(request as any)?.email || null;
    const fromHeader = h.get('x-user-email') || null;
    const isDev = process.env.NODE_ENV !== 'production';
    const dev = isDev ? process.env.NEXT_PUBLIC_DEV_USER_EMAIL : undefined;
    
    // PRIORIZAR el header x-user-email sobre JWT cuando JWT tiene user@example.com
    const email = (fromJwt === 'user@example.com' ? fromHeader : fromJwt) || fromHeader || dev || null;
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // Obtener datos del usuario
    const userResult = await sql`
      SELECT 
        id::text as id,
        email,
        nombre,
        apellido,
        rol,
        tenant_id::text as tenant_id,
        activo,
        fecha_creacion,
        ultimo_acceso
      FROM usuarios 
      WHERE lower(email) = lower(${email}) 
        AND activo = true 
      LIMIT 1
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
        tenant_id: user.tenant_id || '1', // Default si es null
        activo: user.activo,
        fecha_creacion: user.fecha_creacion,
        ultimo_acceso: user.ultimo_acceso
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
