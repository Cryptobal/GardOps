import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// PUT - Actualizar ítem de estructura de instalación
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = params.id;
    const body = await request.json();
    const { monto, vigencia_desde, vigencia_hasta } = body;

    // Validar datos requeridos
    if (monto === undefined || !vigencia_desde) {
      return NextResponse.json(
        { success: false, error: 'monto y vigencia_desde son requeridos' },
        { status: 400 }
      );
    }

    // Obtener el ítem actual
    const itemQuery = `
      SELECT seii.*, sei.instalacion_id, sei.rol_servicio_id
      FROM sueldo_estructura_inst_item seii
      INNER JOIN sueldo_estructura_instalacion sei ON seii.estructura_id = sei.id
      WHERE seii.id = $1
    `;
    
    const itemResult = await query(itemQuery, [itemId]);
    const item = Array.isArray(itemResult) ? itemResult[0] : (itemResult.rows || [])[0];

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Ítem no encontrado' },
        { status: 404 }
      );
    }

    // Iniciar transacción
    await query('BEGIN');

    try {
      // Validar que no haya solapamiento de vigencia para el mismo ítem (excluyendo el actual)
      const solapamientoQuery = `
        SELECT id 
        FROM sueldo_estructura_inst_item 
        WHERE estructura_id = $1 
          AND item_id = $2 
          AND id != $3
          AND activo = true
          AND (
            (vigencia_desde <= $4 AND (vigencia_hasta IS NULL OR vigencia_hasta >= $4))
            OR (vigencia_desde <= $5 AND (vigencia_hasta IS NULL OR vigencia_hasta >= $5))
            OR ($4 <= vigencia_desde AND ($5 IS NULL OR $5 >= vigencia_desde))
          )
      `;
      
      const solapamientoResult = await query(solapamientoQuery, [
        item.estructura_id,
        item.item_id,
        itemId,
        vigencia_desde,
        vigencia_hasta || vigencia_desde
      ]);
      
      const solapamiento = Array.isArray(solapamientoResult) ? solapamientoResult : (solapamientoResult.rows || []);
      
      if (solapamiento.length > 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Existe un solapamiento de vigencia para este ítem en la misma estructura' },
          { status: 400 }
        );
      }

      // Actualizar el ítem
      const updateQuery = `
        UPDATE sueldo_estructura_inst_item 
        SET monto = $1, vigencia_desde = $2, vigencia_hasta = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      
      const updateResult = await query(updateQuery, [
        monto,
        vigencia_desde,
        vigencia_hasta || null,
        itemId
      ]);
      
      const updatedItem = Array.isArray(updateResult) ? updateResult[0] : (updateResult.rows || [])[0];

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: updatedItem,
        message: 'Ítem actualizado correctamente'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error actualizando ítem de estructura:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Desactivar ítem de estructura de instalación (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = params.id;

    // Verificar que el ítem existe
    const itemQuery = `
      SELECT id FROM sueldo_estructura_inst_item WHERE id = $1
    `;
    
    const itemResult = await query(itemQuery, [itemId]);
    const item = Array.isArray(itemResult) ? itemResult[0] : (itemResult.rows || [])[0];

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Ítem no encontrado' },
        { status: 404 }
      );
    }

    // Desactivar el ítem (soft delete)
    const deleteQuery = `
      UPDATE sueldo_estructura_inst_item 
      SET activo = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;
    
    const deleteResult = await query(deleteQuery, [itemId]);
    const deletedItem = Array.isArray(deleteResult) ? deleteResult[0] : (deleteResult.rows || [])[0];

    return NextResponse.json({
      success: true,
      data: { id: deletedItem.id },
      message: 'Ítem desactivado correctamente'
    });

  } catch (error) {
    console.error('Error desactivando ítem de estructura:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
