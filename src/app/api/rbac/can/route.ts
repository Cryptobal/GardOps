import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail } from '@/lib/auth/rbac';

/**
 * Endpoint para verificar permisos usando el nuevo sistema RBAC
 * GET /api/rbac/can?permiso=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener el parámetro permiso
    const searchParams = request.nextUrl.searchParams;
    const permiso = searchParams.get('permiso');
    
    if (!permiso) {
      return NextResponse.json(
        { ok: false, error: 'Parámetro "permiso" requerido' },
        { status: 400 }
      );
    }
    
    // Obtener email del usuario actual
    const email = await getUserEmail(request);
    if (!email) {
      return NextResponse.json(
        { ok: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }
    const result = await sql`
      select public.fn_usuario_tiene_permiso(${email}, ${permiso}) as tiene_permiso
    `;
    const allowed = Boolean(result.rows?.[0]?.tiene_permiso ?? (result as any)[0]?.tiene_permiso);
    return NextResponse.json({ ok: true, allowed });
    
  } catch (error) {
    // Error general del endpoint
    console.error('[rbac] Error en endpoint /api/rbac/can:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// También podemos agregar un método POST si se necesita en el futuro
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { permiso, userId: explicitUserId } = body;
    
    if (!permiso) {
      return NextResponse.json(
        { ok: false, error: 'Campo "permiso" requerido' },
        { status: 400 }
      );
    }
    
    // Usar userId explícito si se proporciona, sino obtener del header
    const userId = explicitUserId || await getCurrentUserRef();
    
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Usuario no identificado' },
        { status: 401 }
      );
    }
    
    try {
      const result = await sql`
        SELECT fn_usuario_tiene_permiso(${userId}::uuid, ${permiso}) as tiene_permiso
      `;
      
      const allowed = Boolean(result.rows[0]?.tiene_permiso);
      
      console.log(`[rbac] POST Permiso verificado: usuario=${userId}, permiso=${permiso}, allowed=${allowed}`);
      
      return NextResponse.json({
        ok: true,
        allowed
      });
      
    } catch (dbError) {
      console.error('[rbac] POST Error verificando permiso en BD:', dbError);
      return NextResponse.json(
        { ok: false, error: 'Error verificando permiso en base de datos' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('[rbac] Error en POST /api/rbac/can:', error);
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
