import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'admin', action: 'read:list' });
  if (deny) return deny;

  try {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(req as any);
      if (u?.rol !== 'admin') {
        const canRead = (await userHasPerm(userId, 'rbac.permisos.read')) || (await userHasPerm(userId, 'rbac.platform_admin'));
        if (!canRead) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.permisos.read', code:'FORBIDDEN' }, { status:403 });
      }
    } catch {
      const canRead = (await userHasPerm(userId, 'rbac.permisos.read')) || (await userHasPerm(userId, 'rbac.platform_admin'));
      if (!canRead) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.permisos.read', code:'FORBIDDEN' }, { status:403 });
    }

    console.log('[admin/rbac/permisos][GET]', { email, userId, perms: ['rbac.permisos.read','rbac.platform_admin'] })
    
    // Obtener permisos con categorías
    const rows = await sql`
      SELECT id, clave, descripcion, categoria
      FROM public.permisos
      ORDER BY categoria ASC, clave ASC
    `;

    // Contar categorías únicas
    const categoriasCount = await sql`
      SELECT COUNT(DISTINCT categoria) as total
      FROM public.permisos
      WHERE categoria IS NOT NULL
    `;

    // Contar permisos en uso (asignados a roles)
    const permisosEnUso = await sql`
      SELECT COUNT(DISTINCT p.id) as total
      FROM public.permisos p
      JOIN roles_permisos rp ON rp.permiso_id = p.id
    `;

    return NextResponse.json({ 
      ok: true, 
      items: rows.rows,
      stats: {
        total: rows.rows.length,
        categorias: categoriasCount.rows[0].total,
        permisosEnUso: permisosEnUso.rows[0].total
      }
    });
  } catch (err: any) {
    console.error('[admin/rbac/permisos][GET] error:', err);
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err), code:'INTERNAL' }, { status: 500 });
  }
}
