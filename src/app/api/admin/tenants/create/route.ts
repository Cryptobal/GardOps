import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requirePlatformAdmin, jsonError } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin(req);

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
      success: true,
      data: {
        tenant_id: row?.tenant_id,
        owner_id: row?.owner_id,
        created: !!row?.created,
      },
    });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error creando tenant:', e);
    return jsonError(500, 'Error interno');
  }
}


