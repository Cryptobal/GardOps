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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "10");
    const offset = (page - 1) * limit;

    const rows = await sql<{
      id: string;
      email: string;
      nombre: string | null;
      activo: boolean | null;
      tenant_id: string | null;
    }>`
      SELECT id, email, nombre, activo, tenant_id
      FROM public.usuarios
      ORDER BY email ASC
      LIMIT ${limit} OFFSET ${offset};
    `;

   return NextResponse.json({ ok: true, items: rows.rows });
  } catch (err: any) {
    console.error("[rbac/usuarios] error:", err?.message, err);
    return NextResponse.json({ error: `Error interno: ${err?.message ?? "unknown"}` }, { status: 500 });
  }
}
