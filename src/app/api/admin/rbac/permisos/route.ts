import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    const canRead = (await userHasPerm(userId, 'rbac.permisos.read')) || (await userHasPerm(userId, 'rbac.platform_admin'));
    if (!canRead) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.permisos.read', code:'FORBIDDEN' }, { status:403 });

    console.log('[admin/rbac/permisos][GET]', { email, userId, perms: ['rbac.permisos.read','rbac.platform_admin'], sql: 'SELECT id, clave, descripcion FROM public.permisos ORDER BY clave' })
    const rows = await sql`
      SELECT id, clave, descripcion
      FROM public.permisos
      ORDER BY clave ASC
    `;

    return NextResponse.json({ ok: true, items: rows.rows });
  } catch (err: any) {
    console.error('[admin/rbac/permisos][GET] error:', err);
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err), code:'INTERNAL' }, { status: 500 });
  }
}
