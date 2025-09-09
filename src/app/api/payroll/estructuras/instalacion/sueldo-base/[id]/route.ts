import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// PUT: actualizar monto/fechas de la línea sueldo_base de esa estructura
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { monto, vigencia_desde, vigencia_hasta } = body || {};

    if (monto === undefined || monto === null || !vigencia_desde) {
      return NextResponse.json({ error: 'monto y vigencia_desde son requeridos' }, { status: 400 });
    }

    await query('BEGIN');
    try {
      // buscar línea sueldo_base
      const lineaRes = await query(
        `SELECT id, estructura_id, item_codigo
         FROM sueldo_estructura_inst_item
         WHERE estructura_id = $1 AND item_codigo = 'sueldo_base' AND activo = TRUE
         ORDER BY vigencia_desde DESC
         LIMIT 1`,
        [id]
      );
      const linea = Array.isArray(lineaRes) ? lineaRes[0] : (lineaRes.rows || [])[0];
      if (!linea) {
        await query('ROLLBACK');
        return NextResponse.json({ error: 'Línea de sueldo_base no encontrada' }, { status: 404 });
      }

      // validar solape propio para sueldo_base
      const solapeRes = await query(
        `SELECT 1 FROM sueldo_estructura_inst_item x
         WHERE x.estructura_id = $1
           AND x.item_codigo = 'sueldo_base'
           AND x.id != $2
           AND x.activo = TRUE
           AND daterange(x.vigencia_desde, COALESCE(x.vigencia_hasta, 'infinity'::date), '[]')
               && daterange($3::date, COALESCE($4::date, 'infinity'::date), '[]')
         LIMIT 1`,
        [id, linea.id, vigencia_desde, vigencia_hasta || null]
      );
      const solape = Array.isArray(solapeRes) ? solapeRes : (solapeRes.rows || []);
      if (solape.length > 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { code: 'ITEM_OVERLAP', error: 'El sueldo_base se solapa con otro período.' },
          { status: 409 }
        );
      }

      // actualizar
      const updRes = await query(
        `UPDATE sueldo_estructura_inst_item
         SET monto = $1, vigencia_desde = $2, vigencia_hasta = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, estructura_id, item_codigo, item_nombre, item_clase, item_naturaleza, monto, vigencia_desde, vigencia_hasta, activo`,
        [monto, vigencia_desde, vigencia_hasta || null, linea.id]
      );
      const updated = Array.isArray(updRes) ? updRes[0] : (updRes.rows || [])[0];

      await query('COMMIT');
      return NextResponse.json({ linea: updated, message: 'Sueldo base actualizado' });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (error: any) {
    logger.error('Error actualizando sueldo base::', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: soft delete de sueldo_base
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    await query('BEGIN');
    try {
      const lineaRes = await query(
        `SELECT id FROM sueldo_estructura_inst_item
         WHERE estructura_id = $1 AND item_codigo = 'sueldo_base' AND activo = TRUE
         ORDER BY vigencia_desde DESC
         LIMIT 1`,
        [id]
      );
      const linea = Array.isArray(lineaRes) ? lineaRes[0] : (lineaRes.rows || [])[0];
      if (!linea) {
        await query('ROLLBACK');
        return NextResponse.json({ error: 'Línea de sueldo_base no encontrada' }, { status: 404 });
      }

      await query(
        `UPDATE sueldo_estructura_inst_item
         SET activo = FALSE, updated_at = NOW()
         WHERE id = $1`,
        [linea.id]
      );

      await query('COMMIT');
      return NextResponse.json({ message: 'Sueldo base eliminado' });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (error: any) {
    logger.error('Error eliminando sueldo base::', error);
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
