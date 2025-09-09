import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { estructura_id, item_id, monto, vigencia_desde, vigencia_hasta } = body;

    if (!estructura_id || !item_id || monto === undefined || !vigencia_desde) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: estructura_id, item_id, monto, vigencia_desde' },
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

    // Validar que el item sea de clase HABER
    const itemResult = await sql`
      SELECT id, codigo, nombre, clase, naturaleza
      FROM sueldo_item
      WHERE id = ${item_id} AND clase = 'HABER';
    `;

    if (itemResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'El ítem no existe o no es de clase HABER' },
        { status: 400 }
      );
    }

    // Verificar solape con otros items del mismo tipo
    const solapeResult = await sql`
      WITH nueva AS (
        SELECT ${vigencia_desde}::date AS vd, ${vigencia_hasta || null}::date AS vh
      )
      SELECT 1
      FROM sueldo_estructura_guardia_item x, nueva n
      WHERE x.estructura_guardia_id = ${estructura_id}
        AND x.item_id = ${item_id}
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

    // Insertar el nuevo item
    const nuevoItem = await sql`
      INSERT INTO sueldo_estructura_guardia_item 
        (estructura_guardia_id, item_id, monto, vigencia_desde, vigencia_hasta, activo)
      VALUES (${estructura_id}, ${item_id}, ${monto}, ${vigencia_desde}::date, ${vigencia_hasta || null}::date, TRUE)
      RETURNING id, estructura_guardia_id, item_id, monto, vigencia_desde, vigencia_hasta, activo;
    `;

    return NextResponse.json({
      item: nuevoItem.rows[0],
      message: 'Ítem creado exitosamente'
    });

  } catch (error) {
    logger.error('Error al crear item::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
