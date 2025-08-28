import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@/lib/db';

// GET /api/clientes/[id] - Obtener cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'read:detail' });
  if (deny) return deny;

  try {
    const ctx = (request as any).ctx as { tenantId: string; selectedTenantId?: string; isPlatformAdmin?: boolean } | undefined;
    // Solo usar selectedTenantId si es Platform Admin, sino usar el tenantId del usuario
    const tenantId = ctx?.isPlatformAdmin ? (ctx?.selectedTenantId || ctx?.tenantId) : ctx?.tenantId;
    
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'TENANT_REQUIRED', code: 'TENANT_REQUIRED' }, { status: 400 });
    }

    const clienteId = params.id;
    const result = await sql`SELECT * FROM clientes WHERE id = ${clienteId} AND tenant_id = ${tenantId}::uuid`;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/clientes/[id] - Actualizar cliente por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'update' });
  if (deny) return deny;

  try {
    const ctx = (request as any).ctx as { tenantId: string; selectedTenantId?: string; isPlatformAdmin?: boolean } | undefined;
    const tenantId = ctx?.isPlatformAdmin ? (ctx?.selectedTenantId || ctx?.tenantId) : ctx?.tenantId;
    
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'TENANT_REQUIRED', code: 'TENANT_REQUIRED' }, { status: 400 });
    }

    const clienteId = params.id;
    const body = await request.json();
    const { nombre, email, telefono, direccion, rut, razon_social, representante_legal, rut_representante, ciudad, comuna, estado } = body;
    
    const updateResult = await sql`UPDATE clientes SET nombre = ${nombre}, email = ${email}, telefono = ${telefono}, direccion = ${direccion}, rut = ${rut}, razon_social = ${razon_social}, representante_legal = ${representante_legal}, rut_representante = ${rut_representante}, ciudad = ${ciudad}, comuna = ${comuna}, estado = ${estado} WHERE id = ${clienteId} AND tenant_id = ${tenantId}::uuid RETURNING *`;

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/clientes/[id] - Eliminar cliente por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'clientes', action: 'delete' });
  if (deny) return deny;

  try {
    const ctx = (request as any).ctx as { tenantId: string; selectedTenantId?: string; isPlatformAdmin?: boolean } | undefined;
    const tenantId = ctx?.isPlatformAdmin ? (ctx?.selectedTenantId || ctx?.tenantId) : ctx?.tenantId;
    
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'TENANT_REQUIRED', code: 'TENANT_REQUIRED' }, { status: 400 });
    }

    const clienteId = params.id;
    const result = await sql`DELETE FROM clientes WHERE id = ${clienteId} AND tenant_id = ${tenantId}::uuid RETURNING *`;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

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