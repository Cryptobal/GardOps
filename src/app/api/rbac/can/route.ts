import { NextRequest, NextResponse } from 'next/server';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

/**
 * Endpoint para verificar permisos usando el nuevo sistema RBAC
 * GET /api/rbac/can?permiso=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const perm = searchParams.get('perm') || searchParams.get('permiso');
    if (!perm) {
      return NextResponse.json({ ok: false, error: 'Parámetro "perm"/"permiso" requerido' }, { status: 400 });
    }

    const email = await getUserEmail(request);
    if (!email) {
      return NextResponse.json({ ok: false, error: 'Usuario no autenticado' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(email);
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 403 });
    }

    // Fallback maestro: si el usuario tiene rol 'admin' en JWT, permitir todo
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(request as any);
      if (u?.rol === 'admin') {
        return NextResponse.json({ ok: true, email, userId, perm, allowed: true, override: 'jwt_admin' });
      }
    } catch {}

    let allowed = await userHasPerm(userId, perm);
    if (!allowed) {
      // También permitir si es platform admin
      const isPlatformAdmin = await userHasPerm(userId, 'rbac.platform_admin');
      if (isPlatformAdmin) allowed = true;
    }
    return NextResponse.json({ ok: true, email, userId, perm, allowed });
  } catch (error: any) {
    console.error('[rbac] Error en endpoint /api/rbac/can:', error);
    return NextResponse.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 });
  }
}

// También podemos agregar un método POST si se necesita en el futuro
// POST no requerido por ahora; si se necesita, implementar de forma análoga al GET
