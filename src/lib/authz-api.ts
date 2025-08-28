import { sql as vercelSql } from '@vercel/postgres';
import { verifyToken } from '@/lib/auth';

type EffPerm = { resource: string; action: string };

const RESOURCES: string[] = [
  'clientes','instalaciones','guardias','puestos','pauta_mensual','pauta_diaria','payroll','configuracion','central_monitoring'
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
  
  // Mapeo específico para central_monitoring
  if (resource === 'central_monitoring') {
    if (action === 'view') return 'central_monitoring.view';
    if (action === 'record') return 'central_monitoring.record';
    if (action === 'configure') return 'central_monitoring.configure';
    if (action === 'export') return 'central_monitoring.export';
  }
  
  const suffix = mapActionToSuffix(action);
  if (!suffix) return null;
  return `${resource}.${suffix}`;
}

export async function getSessionAndTenant(req: Request): Promise<{ 
  userId: string; 
  tenantId: string; 
  selectedTenantId?: string | null;
  isPlatformAdmin?: boolean;
}> {
  const cookieHeader = req.headers.get('cookie') || '';
  let token: string | null = null;
  
  // Verificar si es desarrollo y hay un token de desarrollo
  const isDev = process.env.NODE_ENV !== "production";
  const authHeader = req.headers.get('authorization');
  
  if (isDev && authHeader === 'Bearer dev-token') {
    // En desarrollo, usar un usuario de desarrollo
    const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
    if (devEmail) {
      // Buscar el usuario en la base de datos por email
      try {
        const { rows } = await vercelSql<{ id: string; tenant_id: string }>`
          SELECT id, tenant_id::text as tenant_id 
          FROM usuarios 
          WHERE lower(email) = lower(${devEmail}) 
          LIMIT 1
        `;
        
        if (rows.length > 0) {
          return { 
            userId: rows[0].id, 
            tenantId: rows[0].tenant_id,
            selectedTenantId: rows[0].tenant_id,
            isPlatformAdmin: false
          };
        }
      } catch (error) {
        console.error('Error buscando usuario de desarrollo:', error);
      }
    }
    
    // Fallback: usar valores por defecto
    return { 
      userId: 'dev-user-id', 
      tenantId: '1',
      selectedTenantId: '1',
      isPlatformAdmin: false
    };
  }
  
  // Flujo normal de autenticación
  for (const part of cookieHeader.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === 'auth_token') token = v || null;
  }
  if (!token) {
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.substring(7);
  }
  if (!token) throw new Error('UNAUTHENTICATED');
  const decoded = verifyToken(token);
  if (!decoded) throw new Error('UNAUTHENTICATED');
  
  // Obtener selectedTenantId desde headers o cookies
  let selectedTenantId: string | null = null;
  try {
    const h = req.headers;
    selectedTenantId = h.get('x-tenant-id');
    if (!selectedTenantId) {
      const cookie = h.get('cookie') || '';
      const m = cookie.match(/(?:^|;\s*)x_tenant_id=([^;]+)/);
      if (m && m[1]) selectedTenantId = decodeURIComponent(m[1]);
    }
  } catch {}
  
  return { 
    userId: decoded.user_id, 
    tenantId: decoded.tenant_id,
    selectedTenantId,
    isPlatformAdmin: decoded.is_platform_admin || false
  };
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
    const { userId, tenantId, selectedTenantId, isPlatformAdmin } = await getSessionAndTenant(req);
    (req as any).ctx = { userId, tenantId, selectedTenantId, isPlatformAdmin };
    // Si el token indica rol admin (admin de tenant), permitir todas las acciones dentro del tenant
    try {
      const cookieHeader = req.headers.get('cookie') || '';
      let token: string | null = null;
      for (const part of cookieHeader.split(';')) {
        const [k, v] = part.trim().split('=');
        if (k === 'auth_token') token = v || null;
      }
      if (token) {
        const decoded = verifyToken(token);
        if (decoded?.rol === 'admin') {
          return null;
        }
      }
    } catch {}
    const code = toPermCode(resource, action);
    if (!code) return new Response(JSON.stringify({ ok: false, error: 'forbidden', code: 'FORBIDDEN' }), { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    });
    const ok = await hasPerm(userId, code);
    if (!ok) return new Response(JSON.stringify({ ok: false, error: 'forbidden', code: 'FORBIDDEN' }), { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    });
    return null;
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthenticated', code: 'UNAUTHENTICATED' }), { 
      status: 401, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

export async function loadEffectivePermissions(req: Request): Promise<Record<string, string[]>> {
  try {
    const { userId, isPlatformAdmin } = await getSessionAndTenant(req);
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
      if (isPlatformAdmin) (result[resource] ||= []).push('admin:*');
    }
    return result;
  } catch {
    return {};
  }
}


