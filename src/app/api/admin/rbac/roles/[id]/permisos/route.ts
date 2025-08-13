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
    const canRead = (await userHasPerm(userId, 'rbac.roles.read')) || (await userHasPerm(userId, 'rbac.platform_admin'));
    if (!canRead) return NextResponse.json({ ok:false, error:'forbidden', perm:'rbac.roles.read', code:'FORBIDDEN' }, { status:403 });

    console.log('[admin/rbac/roles/[id]/permisos][GET]', { email, userId, rolId: params.id });

    const rows = await sql`
      SELECT rp.permiso_id, rp.rol_id
      FROM roles_permisos rp
      WHERE rp.rol_id = ${params.id}
    `;

    return NextResponse.json({ 
      ok: true, 
      permisos: rows.rows
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
    const canWrite = (await userHasPerm(userId, 'rbac.roles.write')) || (await userHasPerm(userId, 'rbac.platform_admin'));
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

    // Verificar que el rol existe
    const rolExists = await sql`
      SELECT id FROM roles WHERE id = ${params.id}
    `;

    if (rolExists.rows.length === 0) {
      return NextResponse.json({ ok:false, error:'role_not_found', code:'NOT_FOUND' }, { status: 404 });
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
      DELETE FROM roles_permisos WHERE rol_id = ${params.id}
    `;

    // Insertar nuevos permisos
    if (permisos.length > 0) {
      for (const permisoId of permisos) {
        await sql`
          INSERT INTO roles_permisos (rol_id, permiso_id)
          VALUES (${params.id}, ${permisoId})
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

