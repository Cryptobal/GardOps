import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

// Asegurar runtime Node.js para compatibilidad con Postgres/JWT
export const runtime = 'nodejs'

/**
 * Endpoint para verificar permisos usando el nuevo sistema RBAC
 * GET /api/rbac/can?permiso=xxx
 */
export async function GET(request: NextRequest) {
  // Este endpoint debe ser accesible para usuarios autenticados con cualquier rol;
  // el control fino lo hace la consulta de permisos más abajo. Si el usuario no
  // está autenticado, devolverá 401 al intentar resolver el email.

  try {
    const searchParams = request.nextUrl.searchParams;
    const perm = searchParams.get('perm') || searchParams.get('permiso');
    if (!perm) {
      return NextResponse.json({ ok: false, error: 'Parámetro "perm"/"permiso" requerido' }, { status: 400 });
    }

    // No otorgar override por ser "admin" de tenant. Las decisiones se basan en permisos reales.

    const email = await getUserEmail(request);
    if (!email) {
      return NextResponse.json({ ok: false, error: 'Usuario no autenticado' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(email);
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 403 });
    }

    // No hacer overrides por JWT. Usar permisos desde la base de datos.

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
