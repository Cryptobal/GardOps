import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') || 1);
    const limit = Number(searchParams.get('limit') || 50);
    const q = (searchParams.get('q') || '').trim();
    const offset = (page - 1) * limit;

    // permisos: columnas reales -> id, clave, descripcion, created_at, updated_at
    // IMPORTANTE: NO existe tenant_id aquí.
    let rows: any;
    if (q.length > 0) {
      const like = `%${q.toLowerCase()}%`;
      rows = await sql`
        SELECT p.id, p.clave, p.descripcion
        FROM permisos p
        WHERE lower(p.clave) LIKE ${like} OR lower(p.descripcion) LIKE ${like}
        ORDER BY p.clave ASC
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else {
      rows = await sql`
        SELECT p.id, p.clave, p.descripcion
        FROM permisos p
        ORDER BY p.clave ASC
        LIMIT ${limit} OFFSET ${offset};
      `;
    }

    return NextResponse.json({ ok: true, items: rows.rows });
  } catch (err: any) {
    console.error('[RBAC/permisos][GET] error:', err?.message, err);
    return NextResponse.json({ error: 'Error interno: ' + (err?.message || 'unknown') }, { status: 500 });
  }
}
