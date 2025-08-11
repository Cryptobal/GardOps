import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserRef } from '@/lib/auth';
import { sql } from '@vercel/postgres';

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
    
    console.log(`[rbac] getCurrentUserRef devolvió: ${userId}`);
    console.log(`[rbac] Tipo de userId: ${typeof userId}`);
    console.log(`[rbac] DEV_USER_REF env: ${process.env.DEV_USER_REF}`);
    
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }
    
    // Verificar si es un UUID válido
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    console.log(`[rbac] Es UUID válido: ${isValidUUID}`);
    
    if (!isValidUUID) {
      console.error(`[rbac] userId no es un UUID válido: ${userId}`);
      // Si no es UUID, intentar obtener el UUID del usuario por email
      try {
        const userResult = await sql`
          SELECT id FROM usuarios WHERE email = ${userId} LIMIT 1
        `;
        if (userResult.rows.length > 0) {
          const realUserId = userResult.rows[0].id;
          console.log(`[rbac] UUID obtenido de la BD: ${realUserId}`);
          const result = await sql`
            SELECT fn_usuario_tiene_permiso(${realUserId}::uuid, ${permiso}) as tiene_permiso
          `;
          const allowed = Boolean(result.rows[0]?.tiene_permiso);
          console.log(`[rbac] Permiso verificado con UUID real: usuario=${realUserId}, permiso=${permiso}, allowed=${allowed}`);
          return NextResponse.json({
            ok: true,
            allowed
          });
        }
      } catch (e) {
        console.error('[rbac] Error obteniendo UUID por email:', e);
      }
    }
    
    try {
      // Llamar a la función RBAC en la BD
      const result = await sql`
        SELECT fn_usuario_tiene_permiso(${userId}::uuid, ${permiso}) as tiene_permiso
      `;
      
      const allowed = Boolean(result.rows[0]?.tiene_permiso);
      
      // Log discreto para debug
      console.log(`[rbac] Permiso verificado: usuario=${userId}, permiso=${permiso}, allowed=${allowed}, result=${JSON.stringify(result.rows[0])}`);
      
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
