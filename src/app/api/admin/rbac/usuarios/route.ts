import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

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

export async function GET(req: NextRequest) {
  try {
    // 1) auth + permiso (bypass si JWT admin)
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ ok:false, error: 'No autenticado', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error: 'Usuario no encontrado', code:'NOT_FOUND' }, { status:401 });
    let allowed = false;
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(req as any);
      allowed = u?.rol === 'admin';
    } catch {}
    if (!allowed) {
      allowed = await userHasPerm(userId, 'rbac.platform_admin');
    }
    if (!allowed) return NextResponse.json({ ok:false, error: 'Forbidden', code:'FORBIDDEN', perm:'rbac.platform_admin' }, { status:403 });

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
        SELECT 
          u.id, u.email, u.nombre, u.activo, u.tenant_id,
          STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
        FROM public.usuarios u
        LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
        LEFT JOIN roles r ON ur.rol_id = r.id
        WHERE (lower(u.email) LIKE ${like} OR lower(u.nombre) LIKE ${like})
          AND u.activo = ${activoBool}
        GROUP BY u.id, u.email, u.nombre, u.activo, u.tenant_id
        ORDER BY u.fecha_creacion DESC NULLS LAST, u.email ASC
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else if (q) {
      const like = `%${q}%`;
      rows = await sql`
        SELECT 
          u.id, u.email, u.nombre, u.activo, u.tenant_id,
          STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
        FROM public.usuarios u
        LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
        LEFT JOIN roles r ON ur.rol_id = r.id
        WHERE (lower(u.email) LIKE ${like} OR lower(u.nombre) LIKE ${like})
        GROUP BY u.id, u.email, u.nombre, u.activo, u.tenant_id
        ORDER BY u.fecha_creacion DESC NULLS LAST, u.email ASC
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else if (hasActivo) {
      rows = await sql`
        SELECT 
          u.id, u.email, u.nombre, u.activo, u.tenant_id,
          STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
        FROM public.usuarios u
        LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
        LEFT JOIN roles r ON ur.rol_id = r.id
        WHERE u.activo = ${activoBool}
        GROUP BY u.id, u.email, u.nombre, u.activo, u.tenant_id
        ORDER BY u.fecha_creacion DESC NULLS LAST, u.email ASC
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else {
      rows = await sql`
        SELECT 
          u.id, u.email, u.nombre, u.activo, u.tenant_id,
          STRING_AGG(r.nombre, ', ' ORDER BY r.nombre) as roles
        FROM public.usuarios u
        LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
        LEFT JOIN roles r ON ur.rol_id = r.id
        GROUP BY u.id, u.email, u.nombre, u.activo, u.tenant_id
        ORDER BY u.fecha_creacion DESC NULLS LAST, u.email ASC
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
      | { email?: string; nombre?: string | null; tenantId?: string | null; password?: string; roleId?: string | null }
      | null;
    const email = (body?.email || '').trim().toLowerCase();
    const nombre = (body?.nombre ?? '').trim();
    const tenantIdFromBody = body?.tenantId ?? null;
    const password = body?.password?.trim() || null;
    const roleId = body?.roleId ?? null;
    if (!email) {
      return NextResponse.json({ ok:false, error: 'email_requerido', code:'BAD_REQUEST' }, { status: 400 });
    }
    if (!password || password.trim().length < 6) {
      return NextResponse.json({ ok:false, error: 'password_requerido', code:'BAD_REQUEST' }, { status: 400 });
    }

    // 2) Obtener tenant del solicitante desde JWT/header
    const requesterEmail = await getUserEmail(req);
    if (!requesterEmail) {
      return NextResponse.json({ ok:false, error: 'No autenticado', code:'UNAUTHENTICATED' }, { status: 401 });
    }
    console.log('[admin/rbac/usuarios][POST] payload', { requesterEmail, email, nombre, tenantIdFromBody })
    const creatorTenant = await sql<{ tenant_id: string | null }>`
      SELECT tenant_id FROM public.usuarios WHERE lower(email)=lower(${requesterEmail}) LIMIT 1;
    `;
    const creatorTenantId = creatorTenant.rows[0]?.tenant_id ?? null;

    // 3) Resolver tenant final
    const tenantIdFinal = tenantIdFromBody ?? creatorTenantId ?? null;
    if (!tenantIdFinal) {
      return NextResponse.json({ ok:false, error:'tenant_no_resuelto', code:'BAD_REQUEST' }, { status: 400 });
    }

    // 4) Insert con password obligatoria; si existe, 409
    console.log('[admin/rbac/usuarios][POST] SQL insert', { text: 'insert into public.usuarios(...) returning ...', values: { email, nombre, tenantIdFinal } })
    
    const inserted = await sql<{ id: string; email: string; nombre: string | null; activo: boolean; tenant_id: string | null }>`
      INSERT INTO public.usuarios (id, email, nombre, apellido, activo, tenant_id, password, rol, fecha_creacion)
      VALUES (
        gen_random_uuid(),
        lower(${email}),
        COALESCE(${nombre}, ''),
        '',
        true,
        ${tenantIdFinal},
        crypt(${password}, gen_salt('bf')),
        'guardia',
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, nombre, activo, tenant_id;
    `;

    const item = inserted.rows[0];
    if (!item) {
      return NextResponse.json({ ok:false, error: 'Usuario ya existe', code:'CONFLICT' }, { status: 409 });
    }

    // 5) Asignar rol opcionalmente
    if (roleId) {
      // Validar rol y tenant
      const roleRow = await sql<{ id: string; tenant_id: string | null }>`
        SELECT id::text as id, tenant_id FROM public.roles WHERE id = ${roleId}::uuid LIMIT 1
      `;
      const newUserRow = await sql<{ tenant_id: string | null }>`
        SELECT tenant_id FROM public.usuarios WHERE id = ${item.id}::uuid LIMIT 1
      `;
      const roleTenant = roleRow.rows[0]?.tenant_id ?? null;
      const userTenant = newUserRow.rows[0]?.tenant_id ?? null;
      if (!roleRow.rows[0]) {
        return NextResponse.json({ ok:false, error:'rol_no_encontrado', code:'BAD_REQUEST' }, { status:400 });
      }
      if (roleTenant && userTenant && roleTenant !== userTenant) {
        return NextResponse.json({ ok:false, error:'rol_de_otro_tenant', code:'FORBIDDEN' }, { status:403 });
      }
      await sql`
        INSERT INTO public.usuarios_roles (usuario_id, rol_id)
        VALUES (${item.id}::uuid, ${roleId}::uuid)
        ON CONFLICT DO NOTHING
      `;
    }

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (err: any) {
    console.error('[rbac/usuarios][POST] error:', err);
    return NextResponse.json({ ok:false, error: 'internal', detail: String(err?.message || err), code:'INTERNAL' }, { status: 500 });
  }
}
