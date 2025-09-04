import { NextRequest, NextResponse } from 'next/server';
import { sql as vercelSql } from '@vercel/postgres';
import { getCurrentUserServer } from '@/lib/auth';

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function getUserEmail(req: NextRequest): Promise<string | null> {
  // 1) Priorizar header explícito
  const emailHeader = req.headers.get('x-user-email');
  if (emailHeader) return emailHeader;

  // 2) Intentar desde la sesión/cookie si existe
  try {
    const user = getCurrentUserServer(req as any);
    if (user?.email) return user.email;
  } catch {}

  // 3) Fallback en desarrollo a variable de entorno
  const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    return devEmail || 'carlos.irigoyen@gard.cl';
  }

  // 4) Sin email
  return null;
}

export async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const row = await vercelSql<{ id: string }>`
      select id::text as id from public.usuarios where lower(email)=lower(${email}) limit 1
    `;
    return row?.rows?.[0]?.id ?? null;
  } catch (error) {
    // Delegar manejo a caller (endpoints deben devolver 500 JSON)
    throw error;
  }
}

export async function userHasPerm(userId: string, perm: string): Promise<boolean> {
  const result = await vercelSql<{ ok: boolean }>`
    select public.fn_usuario_tiene_permiso(${userId}::uuid, ${perm}::text) as ok
  `;
  return Boolean(result?.rows?.[0]?.ok);
}

export async function requirePlatformAdmin(
  req: NextRequest
): Promise<{ ok: true; userId: string; email: string } | { ok: false; status: number; error: string }> {
  // 0) Override JWT: si el token indica rol admin, permitir sin consultar BD
  try {
    const u = getCurrentUserServer(req as any);
    if (u?.rol === 'admin' && u?.user_id && u?.email) {
      return { ok: true, userId: u.user_id, email: u.email };
    }
  } catch {}

  const email = await getUserEmail(req);
  if (!email) {
    // Mantener compatibilidad: lanzar para endpoints existentes
    throw new Error('UNAUTHORIZED');
  }

  try {
    const userId = await getUserIdByEmail(email);
    if (!userId) {
      throw new Error('FORBIDDEN');
    }

    const allowed = await userHasPerm(userId, 'rbac.platform_admin');
    if (!allowed) {
      throw new Error('FORBIDDEN');
    }

    return { ok: true, userId, email };
  } catch (error: any) {
    // Para errores SQL u otros
    // Lanzar para mantener comportamiento previo y permitir que endpoints manejen
    throw new Error('FORBIDDEN');
  }
}


