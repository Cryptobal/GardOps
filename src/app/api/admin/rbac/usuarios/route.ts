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
    if (!email) return NextResponse.json({ ok:false, error: "No autenticado", code:'UNAUTHENTICATED' }, { status: 401 });

    console.log('[admin/rbac/usuarios][GET] requester', { email })
    const u = await sql<{ id: string }>`
      SELECT id FROM public.usuarios WHERE lower(email)=lower(${email}) LIMIT 1;
    `;
    const userId = u.rows[0]?.id;
    if (!userId) return NextResponse.json({ ok:false, error: "Usuario no encontrado", code:'NOT_FOUND' }, { status: 401 });

    console.log('[admin/rbac/usuarios][GET] SQL perm check', { text: 'select public.fn_usuario_tiene_permiso($1,$2) as allowed', values: [userId, 'rbac.platform_admin'] })
    const perm = await sql<{ allowed: boolean }>`
      SELECT public.fn_usuario_tiene_permiso(${userId}::uuid, ${"rbac.platform_admin"}) AS allowed;
    `;
    if (!perm.rows[0]?.allowed) return NextResponse.json({ ok:false, error: "Forbidden", code:'FORBIDDEN', perm:'rbac.platform_admin' }, { status: 403 });

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

    console.log('[admin/rbac/usuarios][GET] SQL list', { page, limit, q, activoParam })
    return NextResponse.json({ ok: true, items: rows.rows });
  } catch (err: any) {
    console.error("[rbac/usuarios][GET] error:", err);
    return NextResponse.json(
      { ok:false, error: 'internal', detail: String(err?.message ?? err), code:'INTERNAL' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1) Body básico y validaciones
    const body = await req.json().catch(() => null) as
      | { email?: string; nombre?: string | null; tenantId?: string | null; password?: string }
      | null;
    const email = (body?.email || '').trim().toLowerCase();
    const nombre = (body?.nombre ?? '').trim();
    const tenantIdFromBody = body?.tenantId ?? null;
    const password = body?.password?.trim() || null;
    if (!email) {
      return NextResponse.json({ ok:false, error: 'email_requerido', code:'BAD_REQUEST' }, { status: 400 });
    }
    if (!password || password.trim().length < 6) {
      return NextResponse.json({ ok:false, error: 'password_requerido', code:'BAD_REQUEST' }, { status: 400 });
    }

    // 2) Obtener tenant del solicitante por header (o DEV fallback)
    const requesterEmail = getEmail(req);
    console.log('[admin/rbac/usuarios][POST] payload', { requesterEmail, email, nombre, tenantIdFromBody })
    const creatorTenant = await sql<{ tenant_id: string | null }>`
      SELECT tenant_id FROM public.usuarios WHERE lower(email)=lower(${requesterEmail}) LIMIT 1;
    `;
    const creatorTenantId = creatorTenant.rows[0]?.tenant_id ?? null;

    // 3) Resolver tenant final
    const tenantIdFinal = tenantIdFromBody ?? creatorTenantId ?? null;

    // 4) Insert con password obligatoria; si existe, 409
    console.log('[admin/rbac/usuarios][POST] SQL insert', { text: 'insert into public.usuarios(...) returning ...', values: { email, nombre, tenantIdFinal } })
    
    const inserted = await sql<{ id: string; email: string; nombre: string | null; activo: boolean; tenant_id: string | null }>`
      INSERT INTO public.usuarios (id, email, nombre, apellido, activo, tenant_id, password, rol)
      VALUES (
        gen_random_uuid(),
        lower(${email}),
        COALESCE(${nombre}, ''),
        '',
        true,
        ${tenantIdFinal},
        crypt(${password}, gen_salt('bf')),
        'guardia'
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, nombre, activo, tenant_id;
    `;

    const item = inserted.rows[0];
    if (!item) {
      return NextResponse.json({ ok:false, error: 'Usuario ya existe', code:'CONFLICT' }, { status: 409 });
    }

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (err: any) {
    console.error('[rbac/usuarios][POST] error:', err);
    return NextResponse.json({ ok:false, error: 'internal', detail: String(err?.message || err), code:'INTERNAL' }, { status: 500 });
  }
}
