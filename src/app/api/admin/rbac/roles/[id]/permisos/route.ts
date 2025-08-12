import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm, requirePlatformAdmin, jsonError } from '@/lib/auth/rbac';
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    const canRead = (await userHasPerm(userId, 'rbac.roles.read')) || (await userHasPerm(userId, 'rbac.platform_admin'));
    if (!canRead) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.roles.read', code:'FORBIDDEN' }, { status:403 });

    const { id } = params;
    const rows = await sql`
      SELECT p.id::text AS id, p.clave, p.descripcion
      FROM public.roles_permisos rp
      JOIN public.permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id = ${id}::uuid
      ORDER BY p.clave ASC
    `;
    return NextResponse.json({ ok:true, items: rows.rows });
  } catch (e:any) {
    console.error('[admin/rbac/roles/:id/permisos][GET] error:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    const canWrite = (await userHasPerm(userId, 'rbac.roles.write')) || (await userHasPerm(userId, 'rbac.platform_admin'));
    if (!canWrite) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.roles.write', code:'FORBIDDEN' }, { status:403 });

    const { id } = params; // rol id
    const body = await req.json().catch(() => ({} as any));
    const add: string[] = Array.isArray(body?.add) ? body.add.map(String) : [];
    const remove: string[] = Array.isArray(body?.remove) ? body.remove.map(String) : [];

    if (add.length === 0 && remove.length === 0) {
      return NextResponse.json({ ok:false, error:'empty_changes', detail:'Debe especificar add y/o remove', code:'BAD_REQUEST' }, { status:400 });
    }

    // Validar existencia de permisos por id
    const allIds = Array.from(new Set([...add, ...remove]));
    if (allIds.length > 0) {
      const found = await sql<{ id: string }>`SELECT id::text as id FROM public.permisos WHERE id = ANY(${allIds}::uuid[])`;
      const foundIds = new Set(found.rows.map(r => r.id));
      const missing = allIds.filter(x => !foundIds.has(x));
      if (missing.length > 0) {
        return NextResponse.json({ ok:false, error:'permisos_no_existen', faltantes: missing, code:'BAD_REQUEST' }, { status:400 });
      }
    }

    // Idempotente: ON CONFLICT DO NOTHING para add y DELETE para remove
    let added = 0; let removed = 0;
    if (add.length > 0) {
      await sql`
        INSERT INTO public.roles_permisos(rol_id, permiso_id)
        SELECT ${id}::uuid, p.id
        FROM public.permisos p
        WHERE p.id = ANY(${add}::uuid[])
        ON CONFLICT DO NOTHING
      `;
      added = add.length; // mejor esfuerzo
    }
    if (remove.length > 0) {
      const resDel = await sql`
        DELETE FROM public.roles_permisos
        WHERE rol_id=${id}::uuid AND permiso_id = ANY(${remove}::uuid[])
      `;
      removed = (resDel as any)?.rowCount ?? remove.length;
    }

    return NextResponse.json({ ok:true, added, removed });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('[admin/rbac/roles/:id/permisos][PUT] error:', e);
    return NextResponse.json({ ok:false, error:'internal', detail:String(e?.message ?? e), code:'INTERNAL' }, { status:500 });
  }
}

