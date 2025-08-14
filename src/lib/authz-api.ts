import { sql as vercelSql } from '@vercel/postgres';
import { verifyToken } from '@/lib/auth';

type EffPerm = { resource: string; action: string };

const RESOURCES: string[] = [
  'clientes','instalaciones','guardias','puestos','pauta_mensual','pauta_diaria','payroll','configuracion'
];

function mapActionToSuffix(action: string): string | null {
  if (action === 'read:list' || action === 'read:detail') return 'view';
  if (action === 'create' || action === 'update') return 'edit';
  if (action === 'delete') return 'delete';
  if (action === 'export') return 'export';
  if (action === 'manage:roles') return 'manage';
  return null;
}

function toPermCode(resource: string, action: string): string | null {
  if (resource === 'configuracion' && action === 'manage:roles') return 'config.manage';
  const suffix = mapActionToSuffix(action);
  if (!suffix) return null;
  return `${resource}.${suffix}`;
}

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

async function hasPerm(userId: string, perm: string): Promise<boolean> {
  try {
    const { rows } = await vercelSql<{ ok: boolean }>`
      select (
        public.fn_usuario_tiene_permiso(${userId}::uuid, ${perm})
        or public.fn_usuario_tiene_permiso(${userId}::uuid, ${'rbac.platform_admin'})
      ) as ok
    `;
    return rows?.[0]?.ok === true;
  } catch {
    return false;
  }
}

export async function requireAuthz(req: Request, { resource, action }: { resource: string; action: string }) {
  try {
    const { userId, tenantId } = await getSessionAndTenant(req);
    (req as any).ctx = { userId, tenantId };
    const code = toPermCode(resource, action);
    if (!code) return new Response('Forbidden', { status: 403 });
    const ok = await hasPerm(userId, code);
    if (!ok) return new Response('Forbidden', { status: 403 });
    return null;
  } catch (e) {
    return new Response('Unauthorized', { status: 401 });
  }
}

export async function loadEffectivePermissions(req: Request): Promise<Record<string, string[]>> {
  try {
    const { userId } = await getSessionAndTenant(req);
    const result: Record<string, string[]> = {};
    for (const resource of RESOURCES) {
      const actions = ['read:list','read:detail','create','update','delete','export','manage:roles','admin:*'];
      for (const action of actions) {
        const code = toPermCode(resource, action);
        if (!code) continue;
        const ok = await hasPerm(userId, code);
        if (ok) {
          (result[resource] ||= []).push(action);
        }
      }
      // Si el usuario es platform admin, añadir wildcard por cada recurso
      const isAdmin = await hasPerm(userId, 'rbac.platform_admin');
      if (isAdmin) (result[resource] ||= []).push('admin:*');
    }
    return result;
  } catch {
    return {};
  }
}


