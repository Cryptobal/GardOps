import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { headers as nextHeaders } from "next/headers";

function detectEmail(req: Request) {
  const emailFromHeader = req.headers.get("x-user-email");
  const emailFromEnv = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  return emailFromHeader || emailFromEnv || null;
}

export async function GET(req: Request) {
  const email = detectEmail(req);

  let canPlatformAdmin = false;
  let userId: string | null = null;
  if (email) {
    try {
      const user = await sql<{ id: string }>`
        select id::text as id from usuarios where lower(email)=lower(${email}) limit 1
      `;
      userId = user?.rows?.[0]?.id ?? null;

      if (userId) {
        const byId = await sql<{ ok: boolean }>`
          select fn_usuario_tiene_permiso(${userId}::uuid, 'rbac.platform_admin') as ok
        `;
        canPlatformAdmin = Boolean(byId?.rows?.[0]?.ok);
      } else {
        // Fallback a variante por email si existe
        try {
          const byEmail = await sql<{ ok: boolean }>`
            select public.fn_usuario_tiene_permiso(${email}::text, 'rbac.platform_admin'::text) as ok
          `;
          canPlatformAdmin = Boolean(byEmail?.rows?.[0]?.ok);
        } catch {}
      }
    } catch (e) {
      console.error('[debug/whoami] error verificando permiso:', e);
    }
  }

  return NextResponse.json({
    email,
    userId,
    canPlatformAdmin,
    receivedHeaders: {
      "x-user-email": req.headers.get("x-user-email"),
      "x-user-email(next/headers)": nextHeaders().get("x-user-email"),
    },
    envDevEmail: process.env.NEXT_PUBLIC_DEV_USER_EMAIL ?? null,
  });
}


