import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantParam = (searchParams.get('tenant_id') || '').trim();
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 });

    const isPlatformAdmin = await userHasPerm(userId, 'rbac.platform_admin');

    // Obtener tenant del usuario actual
    const userRow = await sql<{ tenant_id: string | null }>`
      SELECT tenant_id FROM public.usuarios WHERE id = ${userId}::uuid LIMIT 1;
    `;
    const actorTenantId = userRow.rows[0]?.tenant_id ?? null;

    let rows;
    const like = q ? `%${q}%` : null;

    if (tenantParam.toLowerCase() === 'null') {
      // Roles globales: requieren platform_admin
      if (!isPlatformAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      rows = await sql`
        SELECT id, nombre, descripcion, tenant_id
        FROM public.roles
        WHERE tenant_id IS NULL
          ${like ? sql`AND lower(nombre) LIKE ${like}` : sql``}
        ORDER BY nombre ASC
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else {
      // tenant específico o current
      const targetTenantId = tenantParam && tenantParam.toLowerCase() !== 'current'
        ? tenantParam
        : actorTenantId;

      if (!targetTenantId) {
        // Si no hay tenant asociado al actor y no pide globales, no hay nada que listar
        return NextResponse.json({ ok: true, items: [] });
      }

      // Si pide un tenant distinto al propio, exigir platform_admin
      if (actorTenantId && targetTenantId !== actorTenantId && !isPlatformAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      rows = await sql`
        SELECT id, nombre, descripcion, tenant_id
        FROM public.roles
        WHERE tenant_id = ${targetTenantId}
          ${like ? sql`AND lower(nombre) LIKE ${like}` : sql``}
        ORDER BY nombre ASC
        LIMIT ${limit} OFFSET ${offset};
      `;
    }

    return NextResponse.json({ ok: true, items: rows.rows });
  } catch (err: any) {
    console.error('[rbac/roles][GET]', err);
    return NextResponse.json({ error: 'Error interno: ' + (err?.message || 'unknown') }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 });

    // Actor info
    const actorRow = await sql<{ tenant_id: string | null }>`
      SELECT tenant_id FROM public.usuarios WHERE id = ${userId}::uuid LIMIT 1;
    `;
    const actorTenantId = actorRow.rows[0]?.tenant_id ?? null;
    const isPlatformAdmin = await userHasPerm(userId, 'rbac.platform_admin');

    const body = await req.json().catch(() => null) as { nombre?: string; descripcion?: string | null; tenant_id?: string | null } | null;
    const nombre = (body?.nombre || '').trim();
    const descripcion = (body?.descripcion ?? '').trim() || null;
    const requestedTenantId = (body?.tenant_id ?? undefined);

    if (!nombre) {
      return NextResponse.json({ error: 'faltan_campos: nombre' }, { status: 400 });
    }

    // Determinar tenant destino
    let targetTenantId: string | null;
    if (typeof requestedTenantId === 'string') {
      targetTenantId = requestedTenantId.trim() === '' ? null : requestedTenantId;
    } else {
      targetTenantId = actorTenantId ?? null;
    }

    // Crear rol global (tenant_id NULL) requiere platform_admin
    if (targetTenantId === null && !isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Si quiere crear en otro tenant diferente al del actor, exigir platform_admin
    if (actorTenantId && targetTenantId && targetTenantId !== actorTenantId && !isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Chequear duplicado case-insensitive por tenant
    const dup = await sql<{ id: string }>`
      SELECT id FROM public.roles WHERE lower(nombre) = lower(${nombre}) AND (
        (${targetTenantId}::uuid IS NULL AND tenant_id IS NULL) OR (tenant_id = ${targetTenantId})
      ) LIMIT 1;
    `;
    if (dup.rows[0]?.id) {
      return NextResponse.json({ error: 'nombre_duplicado' }, { status: 409 });
    }

    const inserted = await sql<{ id: string }>`
      INSERT INTO public.roles (id, nombre, descripcion, tenant_id)
      VALUES (gen_random_uuid(), ${nombre}, ${descripcion}, ${targetTenantId})
      RETURNING id::text as id;
    `;
    const id = inserted.rows[0]?.id;
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error('[rbac/roles][POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
