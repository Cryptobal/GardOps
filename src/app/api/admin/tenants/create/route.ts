import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm, jsonError } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email!);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    const allowed = (await userHasPerm(userId, 'rbac.platform_admin')) || (await userHasPerm(userId, 'rbac.tenants.read'));
    if (!allowed) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.tenants.read', code:'FORBIDDEN' }, { status:403 });

    const body = await req.json();
    const { nombre, slug, owner_email, owner_nombre } = body || {};
    if (!nombre || !slug || !owner_email) {
      return jsonError(400, 'nombre, slug y owner_email son requeridos');
    }

    const result = await sql`
      select * from public.fn_create_tenant(${nombre}, ${slug}, ${owner_email}, ${owner_nombre || null})
    `;
    const row = (result as any).rows?.[0] || (result as any)[0];

    return NextResponse.json({
      ok: true,
      data: {
        tenant_id: row?.tenant_id,
        owner_id: row?.owner_id,
        created: !!row?.created,
      },
    });
  } catch (e: any) {
    console.error('Error creando tenant:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}


