import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requirePlatformAdmin, jsonError } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin(req);
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
      success: true,
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
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error listando tenants:', e);
    return jsonError(500, 'Error interno');
  }
}


