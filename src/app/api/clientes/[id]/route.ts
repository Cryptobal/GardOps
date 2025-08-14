import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@/lib/db';

// GET /api/clientes/[id] - Obtener cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(req, { resource: 'clientes', action: 'read:detail' });
  if (deny) return deny;

  try {
    const clienteId = params.id;
    const result = await sql`SELECT * FROM clientes WHERE id = ${clienteId}`;

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
  const deny = await requireAuthz(req, { resource: 'clientes', action: 'update' });
  if (deny) return deny;

  try {
    const clienteId = params.id;
    const body = await request.json();
    const { nombre, email, telefono, direccion, activo } = body;
    
    const updateResult = await sql`UPDATE clientes SET nombre = ${nombre}, email = ${email}, telefono = ${telefono}, direccion = ${direccion}, activo = ${activo} WHERE id = ${clienteId} RETURNING *`;

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
  const deny = await requireAuthz(req, { resource: 'clientes', action: 'delete' });
  if (deny) return deny;

  try {
    const clienteId = params.id;
    const result = await sql`DELETE FROM clientes WHERE id = ${clienteId} RETURNING *`;

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