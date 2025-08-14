import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Endpoint público temporal: asigna TODOS los permisos existentes al rol indicado
// IMPORTANTE: será eliminado luego de ejecutar la operación solicitada
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(req, { resource: 'admin', action: 'create' });
  if (deny) return deny;
  try {
    const roleId = params.id;

    // Verificar que el rol exista
    const rol = await sql`SELECT id, nombre FROM roles WHERE id = ${roleId}`;
    if (rol.rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'role_not_found' }, { status: 404 });
    }

    // Obtener todos los permisos
    const permisos = await sql`SELECT id FROM permisos`;

    // Reemplazar permisos actuales del rol por TODOS los permisos
    await sql`DELETE FROM roles_permisos WHERE rol_id = ${roleId}`;
    for (const p of permisos.rows) {
      await sql`
        INSERT INTO roles_permisos (rol_id, permiso_id)
        VALUES (${roleId}, ${p.id})
        ON CONFLICT DO NOTHING
      `;
    }

    return NextResponse.json({
      ok: true,
      roleId,
      assigned: permisos.rows.length
    });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error:'internal', detail:String(err?.message ?? err) }, { status: 500 });
  }
}


