import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { getUserEmail, getUserIdByEmail, userHasPerm } from "@/lib/auth/rbac";

function detectEmail(req: Request) {
  const emailFromHeader = req.headers.get("x-user-email");
  const emailFromEnv = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  return emailFromHeader || emailFromEnv || null;
}

export async function GET(req: Request) {
  // Mantener compatibilidad en dev leyendo header/env directo
  const email = detectEmail(req);

  let canPlatformAdmin = false;
  let userId: string | null = null;
  if (email) {
    try {
      userId = await getUserIdByEmail(email);
      if (userId) {
        canPlatformAdmin = await userHasPerm(userId, 'rbac.platform_admin');
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


