import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    let isAdminJwt = false;
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(request as any);
      isAdminJwt = u?.rol === 'admin';
    } catch {}
    if (!isAdminJwt) {
      const canRead = (await userHasPerm(userId, 'rbac.roles.read')) || (await userHasPerm(userId, 'rbac.platform_admin'));
      if (!canRead) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.roles.read', code:'FORBIDDEN' }, { status:403 });
    }

    // Aislamiento por tenant: el rol debe pertenecer al mismo tenant del usuario
    const tu = await sql<{ tenant_id: string | null }>`SELECT tenant_id FROM public.usuarios WHERE id=${userId}::uuid LIMIT 1`;
    const userTenantId = tu.rows[0]?.tenant_id ?? null;

    // Verificar que el rol existe y pertenece al tenant del usuario
    const rolRows = await sql<{ id: string }>`
      SELECT r.id::text as id
      FROM public.roles r
      WHERE r.id=${params.id}::uuid AND r.tenant_id=${userTenantId}::uuid
      LIMIT 1
    `;
    if (rolRows.rows.length === 0) {
      return NextResponse.json({ ok:false, error:'role_not_found_or_not_in_tenant', code:'NOT_FOUND' }, { status:404 });
    }

    console.log('[admin/rbac/roles/[id]/permisos][GET]', { email, userId, rolId: params.id, tenant: userTenantId });

    const rows = await sql`
      SELECT 
        p.id,
        p.clave,
        p.descripcion
      FROM public.roles_permisos rp
      JOIN public.permisos p ON p.id = rp.permiso_id
      JOIN public.roles r ON r.id = rp.rol_id
      WHERE r.id=${params.id}::uuid AND r.tenant_id=${userTenantId}::uuid
      ORDER BY p.clave
    `;

    return NextResponse.json({ 
      ok: true, 
      items: rows.rows
    });
  } catch (err: any) {
    console.error('[admin/rbac/roles/[id]/permisos][GET] error:', err);
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err), code:'INTERNAL' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    let canWrite = false;
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(request as any);
      canWrite = u?.rol === 'admin';
    } catch {}
    if (!canWrite) {
      canWrite = (await userHasPerm(userId, 'rbac.roles.write')) || (await userHasPerm(userId, 'rbac.platform_admin'));
    }
    if (!canWrite) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.roles.write', code:'FORBIDDEN' }, { status:403 });

    const body = await request.json();
    const { permisos } = body;

    if (!Array.isArray(permisos)) {
      return NextResponse.json({ ok:false, error:'invalid_permissions_array', code:'BAD_REQUEST' }, { status: 400 });
    }

    console.log('[admin/rbac/roles/[id]/permisos][PUT]', { 
      email, 
      userId, 
      rolId: params.id, 
      permisosCount: permisos.length 
    });

    // Aislar por tenant: el rol debe existir en el tenant del usuario
    const tu = await sql<{ tenant_id: string | null }>`SELECT tenant_id FROM public.usuarios WHERE id=${userId}::uuid LIMIT 1`;
    const userTenantId = tu.rows[0]?.tenant_id ?? null;
    const rolExists = await sql`
      SELECT id FROM public.roles WHERE id = ${params.id}::uuid AND tenant_id=${userTenantId}::uuid
    `;
    if (rolExists.rows.length === 0) {
      return NextResponse.json({ ok:false, error:'role_not_found_or_not_in_tenant', code:'NOT_FOUND' }, { status: 404 });
    }

    // Verificar que todos los permisos existen
    if (permisos.length > 0) {
      const permisosExistentes = await sql`
        SELECT id FROM permisos WHERE id = ANY(${permisos}::uuid[])
      `;

      if (permisosExistentes.rows.length !== permisos.length) {
        return NextResponse.json({ ok:false, error:'some_permissions_not_found', code:'BAD_REQUEST' }, { status: 400 });
      }
    }

    // Eliminar permisos actuales del rol
    await sql`
      DELETE FROM public.roles_permisos rp
      USING public.roles r
      WHERE rp.rol_id = r.id AND r.id=${params.id}::uuid AND r.tenant_id=${userTenantId}::uuid
    `;

    // Insertar nuevos permisos
    if (permisos.length > 0) {
      for (const permisoId of permisos) {
        await sql`
          INSERT INTO public.roles_permisos (rol_id, permiso_id)
          SELECT r.id, ${permisoId}::uuid
          FROM public.roles r
          WHERE r.id=${params.id}::uuid AND r.tenant_id=${userTenantId}::uuid
        `;
      }
    }

    console.log(`✅ Permisos actualizados para rol ${params.id}: ${permisos.length} permisos`);

    return NextResponse.json({ 
      ok: true, 
      message: 'Permisos actualizados exitosamente',
      permisosCount: permisos.length
    });
  } catch (err: any) {
    console.error('[admin/rbac/roles/[id]/permisos][PUT] error:', err);
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err), code:'INTERNAL' }, { status: 500 });
  }
}

