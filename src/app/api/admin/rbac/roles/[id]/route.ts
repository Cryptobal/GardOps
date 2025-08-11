import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requirePlatformAdmin, jsonError } from '@/lib/auth/rbac';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePlatformAdmin(req);
    const { id } = params;
    const body = await req.json();
    const { nombre, clave, tenant_id } = body || {};
    await sql`update roles set nombre=coalesce(${nombre},nombre), clave=coalesce(${clave},clave), tenant_id=coalesce(${tenant_id},tenant_id) where id=${id}::uuid`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error editando rol:', e);
    return jsonError(500, 'Error interno');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePlatformAdmin(req);
    const { id } = params;
    await sql`delete from roles where id=${id}::uuid`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error eliminando rol:', e);
    return jsonError(500, 'Error interno');
  }
}


