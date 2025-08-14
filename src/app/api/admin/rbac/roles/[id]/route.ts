import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm, requirePlatformAdmin, jsonError } from '@/lib/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'admin', action: 'delete' });
  if (deny) return deny;
  try {
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    // Bypass si JWT indica admin
    let isAdminJwt = false;
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(request as any);
      isAdminJwt = u?.rol === 'admin';
    } catch {}
    if (!isAdminJwt) {
      const canRead = (await userHasPerm(userId, 'rbac.roles.read')) || (await userHasPerm(userId, 'rbac.platform_admin'));
      if (!canRead) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.roles.read', code:'FORBIDDEN' }, { status:403 });
    }

    const { id } = params;
    // Enfoque multi-tenant: el rol debe pertenecer al mismo tenant que el usuario
    const tu = await sql<{ tenant_id: string | null }>`SELECT tenant_id FROM public.usuarios WHERE id=${userId}::uuid LIMIT 1`;
    const userTenantId = tu.rows[0]?.tenant_id ?? null;
    const r = await sql<{ id: string; nombre: string; descripcion: string | null; tenant_id: string | null }>`
      SELECT id::text as id, nombre, descripcion, tenant_id::text as tenant_id
      FROM public.roles
      WHERE id=${id}::uuid AND tenant_id=${userTenantId}::uuid
      LIMIT 1
    `;
    const item = r.rows?.[0] ?? null;
    if (!item) return NextResponse.json({ ok:false, error:'not_found', code:'NOT_FOUND' }, { status:404 });
    return NextResponse.json({ ok:true, item });
  } catch (e: any) {
    console.error('[admin/rbac/roles/:id][GET] error:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'admin', action: 'delete' });
  if (deny) return deny;
  try {
    const ctx = await requirePlatformAdmin(request);
    const { id } = params;
    const tu = await sql<{ tenant_id: string | null }>`SELECT tenant_id FROM public.usuarios WHERE id=${ctx.userId}::uuid LIMIT 1`;
    const userTenantId = tu.rows[0]?.tenant_id ?? null;
    const body = await request.json();
    const { nombre, clave, tenant_id } = body || {};
    console.log('[admin/rbac/roles/:id][PUT]', { email: ctx.ok ? ctx.email : undefined, userId: ctx.ok ? ctx.userId : undefined, id, body })
    await sql`
      UPDATE roles
      SET nombre=coalesce(${nombre},nombre), clave=coalesce(${clave},clave)
      WHERE id=${id}::uuid AND tenant_id=${userTenantId}::uuid
    `;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('[admin/rbac/roles/:id][PUT] error:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'admin', action: 'delete' });
  if (deny) return deny;
  try {
    const ctx = await requirePlatformAdmin(request);
    const { id } = params;
    const tu = await sql<{ tenant_id: string | null }>`SELECT tenant_id FROM public.usuarios WHERE id=${ctx.userId}::uuid LIMIT 1`;
    const userTenantId = tu.rows[0]?.tenant_id ?? null;
    console.log('[admin/rbac/roles/:id][DELETE]', { email: ctx.ok ? ctx.email : undefined, userId: ctx.ok ? ctx.userId : undefined, id })
    await sql`DELETE FROM roles WHERE id=${id}::uuid AND tenant_id=${userTenantId}::uuid`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('[admin/rbac/roles/:id][DELETE] error:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}


