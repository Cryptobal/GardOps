import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requirePlatformAdmin, jsonError } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);

    // Obtener parámetros de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const usuarios = await sql<any>`
      with roles_usuario as (
        select ur.usuario_id, json_agg(json_build_object('id', r.id, 'nombre', r.nombre, 'clave', r.clave) order by r.nombre) as roles
        from usuarios_roles ur
        join roles r on r.id=ur.rol_id
        group by ur.usuario_id
      )
      select u.id, u.email, u.nombre, u.activo, u.created_at,
             coalesce(ru.roles, '[]'::json) as roles_rbac,
             count(*) over() as total_count
      from usuarios u
      left join roles_usuario ru on ru.usuario_id=u.id
      where (${q} = '' or u.email ilike ${'%' + q + '%'} or u.nombre ilike ${'%' + q + '%'})
      order by u.created_at desc
      limit ${limit} offset ${offset}
    `;

    const rows = (usuarios as any).rows ?? usuarios;
    const totalCount = rows[0]?.total_count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({ success: true, data: rows.map((r: any) => ({ ...r, total_count: undefined })), pagination: { page, limit, total: totalCount, totalPages } });
  } catch (error) {
    if ((error as any)?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if ((error as any)?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error obteniendo usuarios:', error);
    return jsonError(500, 'Error interno');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);
    const body = await request.json();
    const { email, nombre, tenant_id } = body || {};
    if (!email) return jsonError(400, 'email requerido');

    const res = await sql`
      insert into usuarios(id, email, nombre, tenant_id, activo)
      values (gen_random_uuid(), lower(${email}), ${nombre || null}, ${tenant_id || null}, true)
      on conflict (email) do nothing
      returning id
    `;
    const id = (res as any).rows?.[0]?.id ?? (res as any)[0]?.id;
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    if ((error as any)?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if ((error as any)?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error creando usuario:', error);
    return jsonError(500, 'Error interno');
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);

    const { id, activo, roles } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    await sql`BEGIN`;

    try {
      if (activo !== undefined) {
        await sql`update usuarios set activo=${activo} where id=${id}::uuid`;
      }

      if (roles !== undefined && Array.isArray(roles)) {
        await sql`delete from usuarios_roles where usuario_id=${id}::uuid`;
        if (roles.length > 0) {
          for (const rolId of roles) {
            await sql`insert into usuarios_roles(usuario_id, rol_id) values(${id}::uuid, ${rolId}::uuid) on conflict do nothing`;
          }
        }
      }

      await sql`COMMIT`;

      return NextResponse.json({ success: true });
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    if ((error as any)?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if ((error as any)?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error actualizando usuario:', error);
    return jsonError(500, 'Error interno');
  }
}
