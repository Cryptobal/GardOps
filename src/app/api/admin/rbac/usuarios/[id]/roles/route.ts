import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const actorId = await getUserIdByEmail(email);
    if (!actorId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 });

    const usuarioId = ctx.params.id;
    // Verificar que el usuario existe
    const userRow = await sql<{ id: string }>`
      SELECT id::text AS id FROM public.usuarios WHERE id = ${usuarioId}::uuid LIMIT 1;
    `;
    if (!userRow.rows[0]?.id) {
      return NextResponse.json({ error: 'usuario_no_encontrado' }, { status: 404 });
    }

    const roles = await sql<{ id: string; nombre: string; descripcion: string | null; tenant_id: string | null }>`
      SELECT r.id::text AS id, r.nombre, r.descripcion, r.tenant_id
      FROM public.usuarios_roles ur
      JOIN public.roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ${usuarioId}::uuid
      ORDER BY lower(r.nombre) ASC;
    `;
    return NextResponse.json({ ok: true, roles: roles.rows });
  } catch (err: any) {
    console.error('[rbac/usuarios/:id/roles][GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const actorId = await getUserIdByEmail(email);
    if (!actorId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 });

    const { rol_id, action } = (await req.json().catch(() => ({}))) as {
      rol_id?: string;
      action?: 'add' | 'remove';
    };
    const usuarioId = ctx.params.id;

    if (!rol_id || !action) {
      return NextResponse.json({ error: 'faltan_campos' }, { status: 400 });
    }

    // Obtener info del usuario destino
    const u = await sql<{ id: string; tenant_id: string | null }>`
      SELECT id::text AS id, tenant_id FROM public.usuarios WHERE id = ${usuarioId}::uuid LIMIT 1;
    `;
    const targetUser = u.rows[0];
    if (!targetUser) {
      return NextResponse.json({ error: 'usuario_no_encontrado' }, { status: 404 });
    }

    // Rol info
    const r = await sql<{ id: string; tenant_id: string | null }>`
      SELECT id::text AS id, tenant_id FROM public.roles WHERE id = ${rol_id}::uuid LIMIT 1;
    `;
    const role = r.rows[0];
    if (!role) {
      return NextResponse.json({ error: 'rol_no_encontrado' }, { status: 404 });
    }

    // Validación de tenant: rol debe pertenecer al mismo tenant del usuario o ser global y actor Platform Admin
    if (role.tenant_id) {
      if (targetUser.tenant_id !== role.tenant_id) {
        return NextResponse.json({ error: 'rol_de_otro_tenant' }, { status: 403 });
      }
    } else {
      const isPlatformAdmin = await userHasPerm(actorId, 'rbac.platform_admin');
      if (!isPlatformAdmin) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }

    if (action === 'add') {
      await sql`
        INSERT INTO public.usuarios_roles (usuario_id, rol_id)
        VALUES (${usuarioId}::uuid, ${rol_id}::uuid)
        ON CONFLICT (usuario_id, rol_id) DO NOTHING;
      `;
      return NextResponse.json({ ok: true });
    } else {
      await sql`
        DELETE FROM public.usuarios_roles WHERE usuario_id = ${usuarioId}::uuid AND rol_id = ${rol_id}::uuid;
      `;
      return NextResponse.json({ ok: true });
    }
  } catch (err: any) {
    console.error('[rbac/usuarios/:id/roles][POST]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requirePlatformAdmin, jsonError } from '@/lib/auth/rbac';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePlatformAdmin(req);
    const { id } = params; // usuario id
    const { rol_id, action } = await req.json();
    if (!rol_id || !['add','remove'].includes(action)) return jsonError(400, 'rol_id y action requeridos');

    if (action === 'add') {
      await sql`insert into usuarios_roles(usuario_id, rol_id) values (${id}::uuid, ${rol_id}::uuid) on conflict do nothing`;
    } else {
      await sql`delete from usuarios_roles where usuario_id=${id}::uuid and rol_id=${rol_id}::uuid`;
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error asignando rol a usuario:', e);
    return jsonError(500, 'Error interno');
  }
}


