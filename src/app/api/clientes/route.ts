import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@/lib/db';

// GET /api/clientes - Obtener lista de clientes
export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'read:list' });
  if (deny) return deny;

  try {
    const ctx = (request as any).ctx as { tenantId: string; selectedTenantId?: string; isPlatformAdmin?: boolean } | undefined;
    // Solo usar selectedTenantId si es Platform Admin, sino usar el tenantId del usuario
    const tenantId = ctx?.isPlatformAdmin ? (ctx?.selectedTenantId || ctx?.tenantId) : ctx?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'TENANT_REQUIRED', code: 'TENANT_REQUIRED' }, { status: 400 });
    }
    const result = await sql`SELECT * FROM clientes WHERE tenant_id = ${tenantId} ORDER BY nombre ASC`;

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/clientes - Crear nuevo cliente
export async function POST(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'create' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const ctx = (request as any).ctx as { tenantId: string } | undefined;
    const tenantId = ctx?.tenantId;
    const { nombre, email, telefono, direccion, rut, razon_social, representante_legal, rut_representante, ciudad, comuna } = body;
    
    const result = await sql`INSERT INTO clientes (tenant_id, nombre, email, telefono, direccion, rut, razon_social, representante_legal, rut_representante, ciudad, comuna, estado) VALUES (${tenantId}, ${nombre}, ${email}, ${telefono}, ${direccion}, ${rut}, ${razon_social}, ${representante_legal}, ${rut_representante}, ${ciudad}, ${comuna}, 'Activo') RETURNING *`;

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creando cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/clientes - Actualizar cliente
export async function PUT(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'update' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const ctx = (request as any).ctx as { tenantId: string } | undefined;
    const tenantId = ctx?.tenantId;
    const { id, nombre, email, telefono, direccion, rut, razon_social, representante_legal, rut_representante, ciudad, comuna, estado } = body;
    
    const result = await sql`UPDATE clientes SET nombre = ${nombre}, email = ${email}, telefono = ${telefono}, direccion = ${direccion}, rut = ${rut}, razon_social = ${razon_social}, representante_legal = ${representante_legal}, rut_representante = ${rut_representante}, ciudad = ${ciudad}, comuna = ${comuna}, estado = ${estado} WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *`;

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/clientes - Eliminar cliente
export async function DELETE(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'delete' });
  if (deny) return deny;

  try {
    const body = await request.json();
    const ctx = (request as any).ctx as { tenantId: string } | undefined;
    const tenantId = ctx?.tenantId;
    const { id } = body;
    
    const result = await sql`DELETE FROM clientes WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *`;

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}