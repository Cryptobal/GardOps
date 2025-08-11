// Consolidación de handlers duplicados. Usar una única implementación segura.
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm, requirePlatformAdmin, jsonError } from '@/lib/auth/rbac';

type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const email = await getUserEmail(req);
    if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const actorId = await getUserIdByEmail(email);
    if (!actorId) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 });

    const usuarioId = ctx.params.id;
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

export async function POST(req: NextRequest, ctx: RouteContext | { params: { id: string } }) {
  try {
    // Permitir platform admin o validar actor/tenant en modo seguro
    const email = await getUserEmail(req).catch(() => null);
    const actorId = email ? await getUserIdByEmail(email) : null;
    const isPlatformAdmin = actorId ? await userHasPerm(actorId, 'rbac.platform_admin') : false;

    const usuarioId = 'params' in ctx ? ctx.params.id : (ctx as any)?.params?.id;
    const { rol_id, action } = (await req.json().catch(() => ({}))) as { rol_id?: string; action?: 'add'|'remove' };
    if (!usuarioId || !rol_id || !action) return jsonError(400, 'usuario_id, rol_id y action requeridos');

    // Si no es platform admin, al menos exigir autenticación
    if (!isPlatformAdmin && !actorId) return jsonError(401, 'No autenticado');

    // Validaciones básicas
    const targetUser = (await sql<{ id: string; tenant_id: string | null }>`
      SELECT id::text AS id, tenant_id FROM public.usuarios WHERE id = ${usuarioId}::uuid LIMIT 1;
    `).rows[0];
    if (!targetUser) return jsonError(404, 'usuario_no_encontrado');

    const role = (await sql<{ id: string; tenant_id: string | null }>`
      SELECT id::text AS id, tenant_id FROM public.roles WHERE id = ${rol_id}::uuid LIMIT 1;
    `).rows[0];
    if (!role) return jsonError(404, 'rol_no_encontrado');

    if (role.tenant_id && targetUser.tenant_id !== role.tenant_id) {
      return jsonError(403, 'rol_de_otro_tenant');
    }

    if (action === 'add') {
      await sql`insert into usuarios_roles(usuario_id, rol_id) values (${usuarioId}::uuid, ${rol_id}::uuid) on conflict do nothing`;
    } else {
      await sql`delete from usuarios_roles where usuario_id=${usuarioId}::uuid and rol_id=${rol_id}::uuid`;
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error asignando rol a usuario:', e);
    return jsonError(500, 'Error interno');
  }
}


