import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
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

    await query('BEGIN');

    try {
      // 1. Obtener el ítem actual
      const itemQuery = `
        SELECT id, estructura_id, item_codigo, monto, vigencia_desde, vigencia_hasta
        FROM sueldo_estructura_inst_item 
        WHERE id = $1 AND activo = true
      `;
      
      const itemResult = await query(itemQuery, [itemId]);
      const item = Array.isArray(itemResult) ? itemResult[0] : (itemResult.rows || [])[0];

      if (!item) {
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Ítem no encontrado' },
          { status: 404 }
        );
      }

      // 2. Validar que no haya solapamiento con otros ítems del mismo tipo
      const solapamientoQuery = `
        SELECT 1
        FROM sueldo_estructura_inst_item x
        WHERE x.estructura_id = $1
          AND x.item_codigo = $2
          AND x.id != $3
          AND x.activo = TRUE
          AND daterange(x.vigencia_desde, COALESCE(x.vigencia_hasta, 'infinity'::date), '[]') 
            && daterange($4::date, COALESCE($5::date, 'infinity'::date), '[]')
        LIMIT 1
      `;
      
      const solapamientoResult = await query(solapamientoQuery, [
        item.estructura_id,
        item.item_codigo,
        itemId,
        vigencia_desde,
        vigencia_hasta || null
      ]);
      
      const solapamiento = Array.isArray(solapamientoResult) ? solapamientoResult : (solapamientoResult.rows || []);
      
      if (solapamiento.length > 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Este ítem ya tiene una vigencia que se cruza con el período especificado',
            code: 'ITEM_OVERLAP'
          },
          { status: 409 }
        );
      }

      // 3. Actualizar el ítem
      const updateQuery = `
        UPDATE sueldo_estructura_inst_item 
        SET monto = $1, vigencia_desde = $2, vigencia_hasta = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING id, monto, vigencia_desde, vigencia_hasta
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
    logger.error('Error actualizando ítem de estructura::', error);
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

    await query('BEGIN');

    try {
      // 1. Verificar que el ítem existe
      const itemQuery = `
        SELECT id, item_id, monto
        FROM sueldo_estructura_inst_item 
        WHERE id = $1 AND activo = true
      `;
      
      const itemResult = await query(itemQuery, [itemId]);
      const item = Array.isArray(itemResult) ? itemResult[0] : (itemResult.rows || [])[0];

      if (!item) {
        await query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Ítem no encontrado' },
          { status: 404 }
        );
      }

      // 2. Soft delete
      const deleteQuery = `
        UPDATE sueldo_estructura_inst_item 
        SET activo = false, updated_at = NOW()
        WHERE id = $1
      `;
      
      await query(deleteQuery, [itemId]);

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Ítem desactivado correctamente'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    logger.error('Error desactivando ítem de estructura::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
