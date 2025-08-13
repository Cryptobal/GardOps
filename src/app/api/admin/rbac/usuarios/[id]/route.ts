import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requirePlatformAdmin, jsonError } from '@/lib/auth/rbac';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requirePlatformAdmin(req);
    const { id } = params;
    const body = await req.json();
    const { nombre, activo, tenant_id } = body || {};
    console.log('[admin/rbac/usuarios/:id][PUT]', { email: ctx.ok ? ctx.email : undefined, userId: ctx.ok ? ctx.userId : undefined, targetId: id, body })

    await sql`
      update usuarios set
        nombre = coalesce(${nombre}, nombre),
        activo = coalesce(${activo}, activo),
        tenant_id = coalesce(${tenant_id}, tenant_id)
      where id = ${id}::uuid
    `;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('[admin/rbac/usuarios/:id][PUT] error:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requirePlatformAdmin(req);
    const { id } = params;
    console.log('[admin/rbac/usuarios/:id][DELETE]', { email: ctx.ok ? ctx.email : undefined, userId: ctx.ok ? ctx.userId : undefined, targetId: id })
    
    // Eliminar en una transacción para mantener consistencia
    await sql`
      with deleted_roles as (
        delete from usuarios_roles where usuario_id = ${id}::uuid
      )
      delete from usuarios where id = ${id}::uuid
    `;
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('[admin/rbac/usuarios/:id][DELETE] error:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}


