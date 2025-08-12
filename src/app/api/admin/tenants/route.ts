import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm, jsonError } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email!);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    const allowed = (await userHasPerm(userId, 'rbac.platform_admin')) || (await userHasPerm(userId, 'rbac.tenants.read'));
    if (!allowed) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.tenants.read', code:'FORBIDDEN' }, { status:403 });
    const searchParams = req.nextUrl.searchParams;
    const q = (searchParams.get('q') || '').trim();
    const page = Number(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const where = q ? sql`where slug ilike ${'%' + q + '%'} or nombre ilike ${'%' + q + '%'} ` : sql``;
    const rows = await sql`
      with t as (
        select * from tenants
        ${where}
        order by created_at desc
        limit ${limit} offset ${offset}
      )
      select (select count(*)::int from tenants ${q ? sql`where slug ilike ${'%' + q + '%'} or nombre ilike ${'%' + q + '%'} ` : sql``}) as total,
             t.*
      from t
    `;
    const list = (rows as any).rows ?? (rows as any);
    const total = list[0]?.total ?? 0;
    return NextResponse.json({
      ok: true,
      data: list.map((r: any) => ({
        id: r.id,
        nombre: r.nombre,
        slug: r.slug,
        activo: r.activo,
        created_at: r.created_at,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    console.error('Error listando tenants:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}


