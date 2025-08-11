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
    // 1) auth
    const email = getEmail(req as any);
    if (!email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const u = await sql<{ id: string }>`
      SELECT id FROM public.usuarios WHERE lower(email)=lower(${email}) LIMIT 1;
    `;
    const userId = u.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });
    }
    const perm = await sql<{ allowed: boolean }>`
      SELECT public.fn_usuario_tiene_permiso(${userId}::uuid, ${"rbac.platform_admin"}) AS allowed;
    `;
    if (!perm.rows[0]?.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) parámetros (casting seguro)
   const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "10");
    const offset = (page - 1) * limit;
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const activoParam = searchParams.get("activo");
    let activoFilter: boolean | undefined = undefined;
    if (activoParam === "true") activoFilter = true;
    if (activoParam === "false") activoFilter = false;

    // 3) WHERE dinámico seguro
    let where = sql``;
    if (q) {
      const like = `%${q}%`;
      where = sql`${where} AND (lower(email) LIKE ${like} OR lower(nombre) LIKE ${like})`;
    }
    if (typeof activoFilter === "boolean") {
      where = sql`${where} AND activo = ${activoFilter}`;
    }

    // 4) query
    const rows = await sql<{
      id: string;
      email: string;
      nombre: string | null;
      activo: boolean | null;
      tenant_id: string | null;
    }>`
      SELECT id, email, nombre, activo, tenant_id
      FROM public.usuarios
      WHERE 1=1 ${where}
      ORDER BY email ASC
      LIMIT ${limit} OFFSET ${offset};
    `;

    return NextResponse.json({ ok: true, items: rows.rows });
  } catch (err: any) {
    console.error("[rbac/usuarios] error:", err?.message, err);
    return NextResponse.json({ error: `Error interno: ${err?.message ?? "unknown"}` }, { status: 500 });
  }
}
