import { sql as vercelSql } from '@vercel/postgres';
import { verifyToken } from '@/lib/auth';

type EffPerm = { resource: string; action: string };

async function getSessionAndTenant(req: Request): Promise<{ userId: string; tenantId: string }> {
  const cookieHeader = req.headers.get('cookie') || '';
  let token: string | null = null;
  for (const part of cookieHeader.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === 'auth_token') token = v || null;
  }
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.substring(7);
  }
  if (!token) throw new Error('UNAUTHENTICATED');
  const decoded = verifyToken(token);
  if (!decoded) throw new Error('UNAUTHENTICATED');
  return { userId: decoded.user_id, tenantId: decoded.tenant_id };
}

async function getEffectivePermissions(userId: string, tenantId: string): Promise<EffPerm[]> {
  try {
    const { rows } = await vercelSql<{ resource: string; action: string }>`
      with user_ctx as (
        select ${userId}::uuid as user_id, ${tenantId}::uuid as tenant_id
      )
      select distinct p.resource, p.action
      from rbac_usuarios_roles ur
      join rbac_roles r on r.id = ur.role_id and r.tenant_id = ${tenantId}::uuid
      join rbac_roles_permisos rp on rp.role_id = r.id
      join rbac_permissions p on p.id = rp.permission_id
      join user_ctx u on u.user_id = ur.usuario_id
    `;
    return rows ?? [];
  } catch {
    return [];
  }
}

export async function requireAuthz(req: Request, { resource, action }: { resource: string; action: string }) {
  try {
    const { userId, tenantId } = await getSessionAndTenant(req);
    (req as any).ctx = { userId, tenantId };
    const eff = await getEffectivePermissions(userId, tenantId);
    const ok = eff.some(p => p.resource === resource && (p.action === action || p.action === 'admin:*'));
    if (!ok) return new Response('Forbidden', { status: 403 });
    return null;
  } catch (e) {
    return new Response('Unauthorized', { status: 401 });
  }
}

export async function loadEffectivePermissions(req: Request): Promise<Record<string, string[]>> {
  try {
    const { userId, tenantId } = await getSessionAndTenant(req);
    const eff = await getEffectivePermissions(userId, tenantId);
    return eff.reduce<Record<string, string[]>>((acc, p) => {
      (acc[p.resource] ||= []).push(p.action);
      return acc;
    }, {});
  } catch {
    return {};
  }
}


