import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

function detectEmail(req: Request) {
  const emailFromHeader = req.headers.get("x-user-email");
  const emailFromEnv = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  return emailFromHeader || emailFromEnv || null;
}

export async function GET(req: Request) {
  const email = detectEmail(req);

  let canPlatformAdmin = false;
  if (email) {
    const { rows } = await sql<{ ok: boolean }>`
      select public.fn_usuario_tiene_permiso(${email}, 'rbac.platform_admin') as ok
    `;
    canPlatformAdmin = rows?.[0]?.ok ?? false;
  }

  return NextResponse.json({
    email,
    canPlatformAdmin,
    receivedHeaders: {
      "x-user-email": req.headers.get("x-user-email"),
    },
    envDevEmail: process.env.NEXT_PUBLIC_DEV_USER_EMAIL ?? null,
  });
}


