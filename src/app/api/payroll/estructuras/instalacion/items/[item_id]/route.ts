import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// DELETE: eliminar item de estructura (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { item_id: string } }
) {
  const deny = await requireAuthz(request as any, { resource: 'payroll', action: 'delete' });
  if (deny) return deny;

  try {
    const { item_id } = params;

    // Verificar que el item existe
    const itemResult = await sql`
      SELECT id, estructura_id, item_id 
      FROM sueldo_estructura_inst_item 
      WHERE id = ${item_id}
      LIMIT 1
    `;

    if (itemResult.rows.length === 0) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
    }

    // Soft delete del item
    await sql`
      UPDATE sueldo_estructura_inst_item 
      SET activo = false, vigencia_hasta = CURRENT_DATE, updated_at = NOW()
      WHERE id = ${item_id}
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Item eliminado correctamente' 
    });

  } catch (error) {
    console.error('Error eliminando item:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT: actualizar item de estructura
export async function PUT(
  request: NextRequest,
  { params }: { params: { item_id: string } }
) {
  const deny = await requireAuthz(request as any, { resource: 'payroll', action: 'update' });
  if (deny) return deny;

  try {
    const { item_id } = params;
    const body = await request.json();
    const { monto } = body || {};

    if (monto === undefined || monto === null) {
      return NextResponse.json({ error: 'monto es requerido' }, { status: 400 });
    }

    // Verificar que el item existe
    const itemResult = await sql`
      SELECT id FROM sueldo_estructura_inst_item 
      WHERE id = ${item_id}
      LIMIT 1
    `;

    if (itemResult.rows.length === 0) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
    }

    // Actualizar el monto del item
    await sql`
      UPDATE sueldo_estructura_inst_item 
      SET monto = ${monto}, updated_at = NOW()
      WHERE id = ${item_id}
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Item actualizado correctamente' 
    });

  } catch (error) {
    console.error('Error actualizando item:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

