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


