import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// PUT - Actualizar ítem global
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      nombre, 
      clase, 
      naturaleza, 
      descripcion, 
      formula_json, 
      tope_modo, 
      tope_valor, 
      activo 
    } = body;

    // Verificar que el ítem existe
    const existingItem = await query(
      'SELECT id FROM sueldo_item WHERE id = $1',
      [id]
    );

    if (!existingItem.rows || existingItem.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ítem no encontrado' },
        { status: 404 }
      );
    }

    // Construir query de actualización dinámicamente
    const updateFields: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (nombre !== undefined) {
      updateFields.push(`nombre = $${paramIndex}`);
      params.push(nombre);
      paramIndex++;
    }

    if (clase !== undefined) {
      updateFields.push(`clase = $${paramIndex}`);
      params.push(clase);
      paramIndex++;
    }

    if (naturaleza !== undefined) {
      updateFields.push(`naturaleza = $${paramIndex}`);
      params.push(naturaleza);
      paramIndex++;
    }

    if (descripcion !== undefined) {
      updateFields.push(`descripcion = $${paramIndex}`);
      params.push(descripcion);
      paramIndex++;
    }

    if (formula_json !== undefined) {
      updateFields.push(`formula_json = $${paramIndex}`);
      params.push(formula_json);
      paramIndex++;
    }

    if (tope_modo !== undefined) {
      updateFields.push(`tope_modo = $${paramIndex}`);
      params.push(tope_modo);
      paramIndex++;
    }

    if (tope_valor !== undefined) {
      updateFields.push(`tope_valor = $${paramIndex}`);
      params.push(tope_valor);
      paramIndex++;
    }

    if (activo !== undefined) {
      updateFields.push(`activo = $${paramIndex}`);
      params.push(activo);
      paramIndex++;
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      return NextResponse.json(
        { success: false, error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    const sqlQuery = `
      UPDATE sueldo_item 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(sqlQuery, params);
    const updatedItem = Array.isArray(result) ? result[0] : result.rows[0];

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Ítem global actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando ítem global:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar ítem global' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete ítem global (marcar como inactivo)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Verificar que el ítem existe
    const existingItem = await query(
      'SELECT id, activo FROM sueldo_item WHERE id = $1',
      [id]
    );

    if (!existingItem.rows || existingItem.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ítem no encontrado' },
        { status: 404 }
      );
    }

    // Soft delete - marcar como inactivo
    const result = await query(
      `UPDATE sueldo_item 
       SET activo = false, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    const deletedItem = Array.isArray(result) ? result[0] : result.rows[0];

    return NextResponse.json({
      success: true,
      data: deletedItem,
      message: 'Ítem global desactivado exitosamente'
    });
  } catch (error) {
    console.error('Error desactivando ítem global:', error);
    return NextResponse.json(
      { success: false, error: 'Error al desactivar ítem global' },
      { status: 500 }
    );
  }
}
