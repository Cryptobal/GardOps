import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Utilidad: tomar email desde header dev o cabecera directa
function getEmail(req: NextRequest) {
  const h = req.headers;
  // en dev, permitimos x-user-email
  return (
    h.get('x-user-email') ||
    h.get('x-user-email(next/headers)') || // por si viene proxificada
    process.env.NEXT_PUBLIC_DEV_USER_EMAIL ||
    ''
  ).trim().toLowerCase();
}

export async function GET(req: Request) {
  try {
    // 1) auth + permiso platform_admin
    const h = new Headers(req.headers);
    const email = h.get("x-user-email") || process.env.NEXT_PUBLIC_DEV_USER_EMAIL || undefined;
    if (!email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const u = await sql<{ id: string }>`
      SELECT id FROM public.usuarios WHERE lower(email)=lower(${email}) LIMIT 1;
    `;
    const userId = u.rows[0]?.id;
    if (!userId) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });

    const perm = await sql<{ allowed: boolean }>`
      SELECT public.fn_usuario_tiene_permiso(${userId}::uuid, ${"rbac.platform_admin"}) AS allowed;
    `;
    if (!perm.rows[0]?.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2) parámetros seguros
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") ?? "10")));
    const offset = (page - 1) * limit;

    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const activoParam = searchParams.get("activo");
    const hasActivo = activoParam === "true" || activoParam === "false";
    const activoBool = activoParam === "true";

    // 3) queries sin composición de fragmentos
    let rows;

    if (q && hasActivo) {
      const like = `%${q}%`;
      rows = await sql`
        SELECT id, email, nombre, activo, tenant_id
        FROM public.usuarios
        WHERE (lower(email) LIKE ${like} OR lower(nombre) LIKE ${like})
          AND activo = ${activoBool}
        ORDER BY fecha_creacion DESC NULLS LAST, email ASC
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else if (q) {
      const like = `%${q}%`;
      rows = await sql`
        SELECT id, email, nombre, activo, tenant_id
        FROM public.usuarios
        WHERE (lower(email) LIKE ${like} OR lower(nombre) LIKE ${like})
        ORDER BY fecha_creacion DESC NULLS LAST, email ASC
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else if (hasActivo) {
      rows = await sql`
        SELECT id, email, nombre, activo, tenant_id
        FROM public.usuarios
        WHERE activo = ${activoBool}
        ORDER BY fecha_creacion DESC NULLS LAST, email ASC
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else {
      rows = await sql`
        SELECT id, email, nombre, activo, tenant_id
        FROM public.usuarios
        ORDER BY fecha_creacion DESC NULLS LAST, email ASC
        LIMIT ${limit} OFFSET ${offset};
      `;
    }

    return NextResponse.json({ ok: true, items: rows.rows });
  } catch (err: any) {
    console.error("[rbac/usuarios] error:", err?.message, err);
    return NextResponse.json(
      { error: `Error interno: ${err?.message ?? "unknown"}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1) Obtener requester por email
    const requesterEmail = getEmail(req);
    if (!requesterEmail) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const requester = await sql<{ id: string; tenant_id: string | null }>`
      SELECT id, tenant_id
      FROM public.usuarios
      WHERE lower(email) = lower(${requesterEmail})
      LIMIT 1;
    `;
    const requesterId = requester.rows[0]?.id;
    const requesterTenantId = requester.rows[0]?.tenant_id ?? null;
    if (!requesterId) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });
    }

    // 2) Permisos: platform_admin o usuarios.manage
    const platformAdminRes = await sql<{ allowed: boolean }>`
      SELECT public.fn_usuario_tiene_permiso(${requesterId}::uuid, ${'rbac.platform_admin'}) AS allowed;
    `;
    const isPlatformAdmin = !!platformAdminRes.rows[0]?.allowed;

    let canManage = false;
    if (!isPlatformAdmin) {
      const manageRes = await sql<{ allowed: boolean }>`
        SELECT public.fn_usuario_tiene_permiso(${requesterId}::uuid, ${'usuarios.manage'}) AS allowed;
      `;
      canManage = !!manageRes.rows[0]?.allowed;
      if (!canManage) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // 3) Parsear body y validar
    const body = await req.json().catch(() => null) as
      | { email?: string; nombre?: string | null; tenant_id?: string | null }
      | null;
    const email = (body?.email || '').trim().toLowerCase();
    const nombre = (body?.nombre ?? null) || null;
    const requestedTenantId = body?.tenant_id ?? null;

    const emailRegex = /\S+@\S+\.\S+/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // 3b) Determinar tenant destino
    const targetTenantId = isPlatformAdmin && requestedTenantId ? requestedTenantId : requesterTenantId;

    // 4) Verificar duplicado por email
    const exists = await sql<{ id: string }>`
      SELECT id::text AS id FROM public.usuarios WHERE lower(email) = lower(${email}) LIMIT 1;
    `;
    if (exists.rows[0]?.id) {
      return NextResponse.json({ error: 'email_duplicado' }, { status: 409 });
    }

    // 5) Insertar usuario
    const inserted = await sql<{ id: string }>`
      INSERT INTO public.usuarios (id, email, nombre, activo, tenant_id)
      VALUES (gen_random_uuid(), lower(${email}), ${nombre}, true, ${targetTenantId})
      RETURNING id::text AS id;
    `;

    const id = inserted.rows[0]?.id;
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error('[rbac/usuarios POST] error:', err?.message, err);
    if (err?.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
