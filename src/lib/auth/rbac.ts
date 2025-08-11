import { NextRequest, NextResponse } from 'next/server';
import { sql as vercelSql } from '@vercel/postgres';
import { getCurrentUserServer } from '@/lib/auth';

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function getUserEmail(req: NextRequest): Promise<string | null> {
  // Intentar desde sesión (cookie auth_token decodificada por getCurrentUserServer)
  const user = getCurrentUserServer(req as any);
  if (user?.email) return user.email;
  // Fallback en local: header x-user-email
  const emailHeader = req.headers.get('x-user-email');
  if (emailHeader) return emailHeader;
  return null;
}

export async function requirePlatformAdmin(req: NextRequest): Promise<void> {
  const email = await getUserEmail(req);
  if (!email) throw new Error('UNAUTHORIZED');
  try {
    const result = await vercelSql`
      select public.fn_usuario_tiene_permiso(${email}, 'rbac.platform_admin') as allowed
    `;
    const allowed = Boolean((result as any)?.rows?.[0]?.allowed ?? (result as any)?.[0]?.allowed);
    if (!allowed) throw new Error('FORBIDDEN');
  } catch (e) {
    throw new Error('FORBIDDEN');
  }
}


