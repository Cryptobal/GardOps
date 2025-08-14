import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PUT(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'update' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { monto, vigencia_desde, vigencia_hasta } = body;

    if (monto === undefined || !vigencia_desde) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: monto, vigencia_desde' },
        { status: 400 }
      );
    }

    // Validar formato de fechas
    const fechaDesde = new Date(vigencia_desde);
    if (isNaN(fechaDesde.getTime())) {
      return NextResponse.json(
        { error: 'Formato de fecha desde inválido' },
        { status: 400 }
      );
    }

    if (vigencia_hasta) {
      const fechaHasta = new Date(vigencia_hasta);
      if (isNaN(fechaHasta.getTime())) {
        return NextResponse.json(
          { error: 'Formato de fecha hasta inválido' },
          { status: 400 }
        );
      }
    }

    // Obtener el item actual
    const itemActual = await sql`
      SELECT id, estructura_guardia_id, item_id, monto, vigencia_desde, vigencia_hasta, activo
      FROM sueldo_estructura_guardia_item
      WHERE id = ${id};
    `;

    if (itemActual.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ítem no encontrado' },
        { status: 404 }
      );
    }

    const item = itemActual.rows[0];

    // Verificar solape con otros items del mismo tipo (excluyendo el actual)
    const solapeResult = await sql`
      WITH nueva AS (
        SELECT ${vigencia_desde}::date AS vd, ${vigencia_hasta || null}::date AS vh
      )
      SELECT 1
      FROM sueldo_estructura_guardia_item x, nueva n
      WHERE x.estructura_guardia_id = ${item.estructura_guardia_id}
        AND x.item_id = ${item.item_id}
        AND x.id != ${id}
        AND x.activo = TRUE
        AND NOT (
          (x.vigencia_hasta IS NOT NULL AND x.vigencia_hasta < n.vd) OR
          (n.vh IS NOT NULL AND n.vh < x.vigencia_desde)
        )
      LIMIT 1;
    `;

    if (solapeResult.rows.length > 0) {
      return NextResponse.json(
        {
          code: 'ITEM_OVERLAP',
          message: 'Este ítem ya tiene una vigencia que se cruza con el período especificado'
        },
        { status: 409 }
      );
    }

    // Actualizar el item
    const itemActualizado = await sql`
      UPDATE sueldo_estructura_guardia_item
      SET monto = ${monto}, vigencia_desde = ${vigencia_desde}::date, vigencia_hasta = ${vigencia_hasta || null}::date
      WHERE id = ${id}
      RETURNING id, estructura_guardia_id, item_id, monto, vigencia_desde, vigencia_hasta, activo;
    `;

    return NextResponse.json({
      item: itemActualizado.rows[0],
      message: 'Ítem actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar item:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'payroll', action: 'update' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Verificar que el item existe
    const itemExistente = await sql`
      SELECT id, activo
      FROM sueldo_estructura_guardia_item
      WHERE id = ${id};
    `;

    if (itemExistente.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ítem no encontrado' },
        { status: 404 }
      );
    }

    // Desactivar el item (soft delete)
    const itemDesactivado = await sql`
      UPDATE sueldo_estructura_guardia_item
      SET activo = FALSE
      WHERE id = ${id}
      RETURNING id, activo;
    `;

    return NextResponse.json({
      message: 'Ítem desactivado exitosamente'
    });

  } catch (error) {
    console.error('Error al desactivar item:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
