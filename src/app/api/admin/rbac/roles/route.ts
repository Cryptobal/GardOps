import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm, jsonError } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'admin', action: 'create' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'admin', action: 'read:list' });
if (deny) return deny;

  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') || 1);
    const limit = Number(searchParams.get('limit') || 20);
    const q = (searchParams.get('q') || '').trim();
    const offset = (page - 1) * limit;

    // Nota: solo lectura UI; opcional proteger por 'rbac.roles.read' o 'rbac.platform_admin'
    const email = await getUserEmail(req).catch(() => null);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email!);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    // Si rol admin en JWT, permitir sin consultar
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(req as any);
      if (u?.rol === 'admin') {
        // seguir
      } else {
        const canRead = (await userHasPerm(userId, 'rbac.roles.read')) || (await userHasPerm(userId, 'rbac.platform_admin'));
        if (!canRead) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.roles.read', code:'FORBIDDEN' }, { status:403 });
      }
    } catch {
      const canRead = (await userHasPerm(userId, 'rbac.roles.read')) || (await userHasPerm(userId, 'rbac.platform_admin'));
      if (!canRead) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.roles.read', code:'FORBIDDEN' }, { status:403 });
    }

    // Obtener tenant del usuario (aislamiento estricto por tenant)
    const tu = await sql<{ tenant_id: string | null }>`SELECT tenant_id FROM public.usuarios WHERE id=${userId}::uuid LIMIT 1`;
    const userTenantId = tu.rows[0]?.tenant_id ?? null;

    // roles: columnas reales -> id, nombre, descripcion, tenant_id
    let rows;
    if (q.length > 0) {
      const like = `%${q.toLowerCase()}%`;
      rows = await sql`
        SELECT r.id, r.nombre, r.descripcion, r.tenant_id
        FROM public.roles r
        WHERE r.tenant_id = ${userTenantId}::uuid
          AND lower(r.nombre) LIKE ${like}
        ORDER BY r.nombre ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      rows = await sql`
        SELECT r.id, r.nombre, r.descripcion, r.tenant_id
        FROM public.roles r
        WHERE r.tenant_id = ${userTenantId}::uuid
        ORDER BY r.nombre ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    console.log('[admin/rbac/roles][GET]', { email, userId, q, page, limit })
    return NextResponse.json({ ok: true, items: rows.rows });
  } catch (err: any) {
    console.error('[admin/rbac/roles][GET] error:', err);
    return NextResponse.json({ ok:false, error: 'internal', detail: String(err?.message || err), code:'INTERNAL' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'admin', action: 'create' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'admin', action: 'read:list' });
if (deny) return deny;

  const client = sql;
  try {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });

    const canWrite = (await userHasPerm(userId, 'rbac.platform_admin')) || (await userHasPerm(userId, 'rbac.roles.write'));
    if (!canWrite) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.roles.write', code:'FORBIDDEN' }, { status:403 });

    const body = await req.json().catch(() => null) as { nombre?: string; descripcion?: string; permisos?: string[] } | null;
    const nombre = (body?.nombre || '').trim();
    const descripcion = (body?.descripcion || '').trim() || null;
    const permisos = Array.isArray(body?.permisos) ? Array.from(new Set(body!.permisos!.map(String))) : [] as string[];

    if (!nombre) return NextResponse.json({ ok:false, error:'nombre_requerido', code:'BAD_REQUEST' }, { status:400 });

    // Obtener tenant del usuario
    const tu = await sql<{ tenant_id: string | null }>`SELECT tenant_id FROM public.usuarios WHERE id=${userId}::uuid LIMIT 1`;
    const tenantId = tu.rows[0]?.tenant_id ?? null;

    console.log('[admin/rbac/roles][POST] payload', { email, userId, nombre, descripcion, permisos, tenantId })

    // Insert rol
    let newRoleId: string | null = null;
    try {
      const r = await sql<{ id: string }>`
        INSERT INTO public.roles (id, nombre, descripcion, tenant_id)
        VALUES (gen_random_uuid(), ${nombre}, ${descripcion}, ${tenantId})
        RETURNING id::text as id
      `;
      newRoleId = r.rows[0]?.id ?? null;
    } catch (e: any) {
      // conflicto de unicidad
      const msg = String(e?.message || '')
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
        return NextResponse.json({ ok:false, error:'duplicate_nombre', code:'CONFLICT', detail: msg }, { status:409 });
      }
      throw e;
    }

    if (!newRoleId) return NextResponse.json({ ok:false, error:'insert_failed', code:'INTERNAL' }, { status:500 });

    // Asignar permisos si vienen
    let permisosAsignados: string[] = [];
    if (permisos.length > 0) {
      const perms = await sql<{ id: string; clave: string }>`
        SELECT id::text as id, clave FROM public.permisos WHERE clave = ANY(${permisos}::text[])
      `;
      const found = new Set(perms.rows.map(p => p.clave));
      const faltantes = permisos.filter(p => !found.has(p));
      if (faltantes.length > 0) {
        return NextResponse.json({ ok:false, error:'permisos_no_existen', faltantes, code:'BAD_REQUEST' }, { status:400 });
      }
      console.log('[admin/rbac/roles][POST] asignando permisos', { newRoleId, permisos })
      await sql`
        INSERT INTO public.roles_permisos(rol_id, permiso_id)
        SELECT ${newRoleId}::uuid, p.id
        FROM public.permisos p
        WHERE p.clave = ANY(${permisos}::text[])
        ON CONFLICT DO NOTHING
      `;
      permisosAsignados = permisos;
    }

    return NextResponse.json({ ok:true, id: newRoleId, nombre, descripcion, tenant_id: tenantId, permisos_asignados: permisosAsignados }, { status:201 });
  } catch (err:any) {
    console.error('[admin/rbac/roles][POST] error', err);
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err), code:'INTERNAL' }, { status:500 });
  }
}
