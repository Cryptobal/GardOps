import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requirePlatformAdmin, jsonError } from '@/lib/auth/rbac';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePlatformAdmin(req);
    const { id } = params; // rol id
    const { permiso_id, action } = await req.json();
    if (!permiso_id || !['add','remove'].includes(action)) return jsonError(400, 'permiso_id y action requeridos');
    if (action === 'add') {
      await sql`insert into roles_permisos(rol_id, permiso_id) values(${id}::uuid, ${permiso_id}::uuid) on conflict do nothing`;
    } else {
      await sql`delete from roles_permisos where rol_id=${id}::uuid and permiso_id=${permiso_id}::uuid`;
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error asignando permiso a rol:', e);
    return jsonError(500, 'Error interno');
  }
}


