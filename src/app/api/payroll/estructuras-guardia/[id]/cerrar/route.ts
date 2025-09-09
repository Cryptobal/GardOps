import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { vigencia_hasta } = body;

    if (!vigencia_hasta) {
      return NextResponse.json(
        { error: 'Falta parámetro requerido: vigencia_hasta' },
        { status: 400 }
      );
    }

    // Validar formato de fecha
    const fecha = new Date(vigencia_hasta);
    if (isNaN(fecha.getTime())) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido' },
        { status: 400 }
      );
    }

    // Obtener la estructura actual para validar
    const estructuraActual = await sql`
      SELECT id, guardia_id, vigencia_desde, vigencia_hasta
      FROM sueldo_estructura_guardia
      WHERE id = ${id};
    `;

    if (estructuraActual.rows.length === 0) {
      return NextResponse.json(
        { error: 'Estructura no encontrada' },
        { status: 404 }
      );
    }

    const estructura = estructuraActual.rows[0];

    // Validar que vigencia_hasta >= vigencia_desde
    if (new Date(vigencia_hasta) < new Date(estructura.vigencia_desde)) {
      return NextResponse.json(
        { error: 'La fecha de cierre debe ser mayor o igual a la fecha de inicio' },
        { status: 400 }
      );
    }

    // Actualizar la estructura
    try {
      const resultado = await sql`
        UPDATE sueldo_estructura_guardia
        SET vigencia_hasta = ${vigencia_hasta}::date
        WHERE id = ${id}
        RETURNING id, guardia_id, vigencia_desde, vigencia_hasta;
      `;

      return NextResponse.json({
        cabecera: resultado.rows[0],
        message: 'Estructura cerrada exitosamente'
      });

    } catch (error: any) {
      // Verificar si es un error de solape
      if (error.code === '23P01') { // exclusion_violation
        return NextResponse.json(
          {
            code: 'OVERLAP',
            message: 'La fecha de cierre genera un conflicto con otra estructura'
          },
          { status: 409 }
        );
      }

      throw error;
    }

  } catch (error) {
    logger.error('Error al cerrar estructura::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
