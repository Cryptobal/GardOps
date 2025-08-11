import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserRef } from '@/lib/auth';
import { query } from '@/lib/database';

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
    
    // Obtener el usuario actual desde headers
    const userId = await getCurrentUserRef();
    
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }
    
    try {
      // Llamar a la función RBAC en la BD
      const result = await query(
        'SELECT fn_usuario_tiene_permiso($1, $2) as tiene_permiso',
        [userId, permiso]
      );
      
      const allowed = Boolean(result?.rows?.[0]?.tiene_permiso);
      
      // Log discreto para debug
      console.log(`[rbac] Permiso verificado: usuario=${userId}, permiso=${permiso}, allowed=${allowed}`);
      
      return NextResponse.json({
        ok: true,
        allowed
      });
      
    } catch (dbError) {
      // Si hay error en la BD (función no existe, etc), devolver 500
      console.error('[rbac] Error verificando permiso en BD:', dbError);
      return NextResponse.json(
        { ok: false, error: 'Error verificando permiso en base de datos' },
        { status: 500 }
      );
    }
    
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
      const result = await query(
        'SELECT fn_usuario_tiene_permiso($1, $2) as tiene_permiso',
        [userId, permiso]
      );
      
      const allowed = Boolean(result?.rows?.[0]?.tiene_permiso);
      
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
