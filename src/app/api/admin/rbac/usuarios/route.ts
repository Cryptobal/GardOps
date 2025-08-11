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
        ORDER BY created_at DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else if (q) {
      const like = `%${q}%`;
      rows = await sql`
        SELECT id, email, nombre, activo, tenant_id
        FROM public.usuarios
        WHERE (lower(email) LIKE ${like} OR lower(nombre) LIKE ${like})
        ORDER BY created_at DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else if (hasActivo) {
      rows = await sql`
        SELECT id, email, nombre, activo, tenant_id
        FROM public.usuarios
        WHERE activo = ${activoBool}
        ORDER BY created_at DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else {
      rows = await sql`
        SELECT id, email, nombre, activo, tenant_id
        FROM public.usuarios
        ORDER BY created_at DESC NULLS LAST
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
