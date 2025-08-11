import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requirePlatformAdmin, jsonError } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);

    // Obtener todos los roles con sus permisos
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id');
    const where = tenantId ? sql`where tenant_id=${tenantId}::uuid` : sql``;
    const rows = await sql`
      select id, tenant_id, nombre, clave from roles ${where} order by tenant_id nulls first, nombre
    `;
    return NextResponse.json({ success: true, data: (rows as any).rows ?? rows });
  } catch (error) {
    if ((error as any)?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if ((error as any)?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error obteniendo roles:', error);
    return jsonError(500, 'Error interno');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);

    const { tenant_id, nombre, clave } = await request.json();
    if (!nombre || !clave) return jsonError(400, 'nombre y clave requeridos');
    const res = await sql`
      insert into roles(id, tenant_id, nombre, clave)
      values(gen_random_uuid(), ${tenant_id || null}, ${nombre}, ${clave})
      on conflict do nothing
      returning id
    `;
    const id = (res as any).rows?.[0]?.id ?? (res as any)[0]?.id;
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    if ((error as any)?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if ((error as any)?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error creando rol:', error);
    return jsonError(500, 'Error interno');
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);

    const { id, nombre, clave, tenant_id } = await request.json();
    if (!id) return jsonError(400, 'id requerido');
    await sql`
      update roles set nombre=coalesce(${nombre},nombre), clave=coalesce(${clave},clave), tenant_id=coalesce(${tenant_id}, tenant_id) where id=${id}::uuid
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as any)?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if ((error as any)?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error actualizando rol:', error);
    return jsonError(500, 'Error interno');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return jsonError(400, 'ID del rol requerido');
    }

    await sql`delete from roles where id=${id}::uuid`;
    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as any)?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if ((error as any)?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error eliminando rol:', error);
    return jsonError(500, 'Error interno');
  }
}
