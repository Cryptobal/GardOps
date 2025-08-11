import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requirePlatformAdmin, jsonError } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);
    const tenantId = request.nextUrl.searchParams.get('tenant_id');
    const where = tenantId === null ? sql`` : tenantId ? sql`where tenant_id=${tenantId}::uuid` : sql`where tenant_id is null`;
    const rows = await sql`
      select id, tenant_id, nombre, clave from permisos ${where} order by tenant_id nulls first, clave
    `;
    return NextResponse.json({ success: true, data: (rows as any).rows ?? rows });
  } catch (error) {
    if ((error as any)?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if ((error as any)?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error obteniendo permisos:', error);
    return jsonError(500, 'Error interno');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);
    const { tenant_id, nombre, clave } = await request.json();
    if (!nombre || !clave) return jsonError(400, 'nombre y clave requeridos');
    const res = await sql`
      insert into permisos(id, tenant_id, nombre, clave)
      values(gen_random_uuid(), ${tenant_id || null}, ${nombre}, ${clave})
      on conflict do nothing
      returning id
    `;
    const id = (res as any).rows?.[0]?.id ?? (res as any)[0]?.id;
    return NextResponse.json({ success: true, data: { id } });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error creando permiso:', e);
    return jsonError(500, 'Error interno');
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);
    const { id, nombre, clave, tenant_id } = await request.json();
    if (!id) return jsonError(400, 'id requerido');
    await sql`update permisos set nombre=coalesce(${nombre},nombre), clave=coalesce(${clave},clave), tenant_id=coalesce(${tenant_id}, tenant_id) where id=${id}::uuid`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error actualizando permiso:', e);
    return jsonError(500, 'Error interno');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return jsonError(400, 'id requerido');
    await sql`delete from permisos where id=${id}::uuid`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.message === 'UNAUTHORIZED') return jsonError(401, 'No autenticado');
    if (e?.message === 'FORBIDDEN') return jsonError(403, 'No autorizado');
    console.error('Error eliminando permiso:', e);
    return jsonError(500, 'Error interno');
  }
}
