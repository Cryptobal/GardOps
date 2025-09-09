import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guardia_id, vigencia_desde } = body;

    if (!guardia_id || !vigencia_desde) {
      return NextResponse.json(
        { message: 'Faltan parámetros requeridos: guardia_id, vigencia_desde' },
        { status: 400 }
      );
    }

    // Validar UUID simple
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(guardia_id)) {
      return NextResponse.json(
        { message: 'guardia_id debe ser un UUID válido' },
        { status: 400 }
      );
    }

    // Validar formato de fecha (YYYY-MM-DD) y fecha válida
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(vigencia_desde)) {
      return NextResponse.json(
        { message: 'vigencia_desde debe tener formato YYYY-MM-DD' },
        { status: 400 }
      );
    }
    const fecha = new Date(vigencia_desde);
    if (isNaN(fecha.getTime())) {
      return NextResponse.json(
        { message: 'Fecha inválida' },
        { status: 400 }
      );
    }

    // Buscar si existe una cabecera que contenga la fecha
    const cabeceraExistente = await sql`
      SELECT id, guardia_id, vigencia_desde, vigencia_hasta
      FROM sueldo_estructura_guardia
      WHERE guardia_id = ${guardia_id}
        AND vigencia_desde <= ${vigencia_desde}::date
        AND (vigencia_hasta IS NULL OR ${vigencia_desde}::date <= vigencia_hasta)
      ORDER BY vigencia_desde DESC
      LIMIT 1;
    `;

    if (cabeceraExistente.rows.length > 0) {
      return NextResponse.json(
        {
          cabecera: cabeceraExistente.rows[0],
          message: 'Ya existe una estructura que cubre esa fecha',
        },
        { status: 409 }
      );
    }

    // Intentar insertar nueva cabecera
    try {
      const nuevaCabecera = await sql`
        INSERT INTO sueldo_estructura_guardia (guardia_id, vigencia_desde, vigencia_hasta)
        VALUES (${guardia_id}, ${vigencia_desde}::date, NULL)
        RETURNING id, guardia_id, vigencia_desde, vigencia_hasta;
      `;

      return NextResponse.json(
        {
          cabecera: nuevaCabecera.rows[0],
          message: 'Estructura creada exitosamente',
        },
        { status: 201 }
      );

    } catch (error: any) {
      // Verificar si es un error de solape
      if (error.code === '23P01') { // exclusion_violation
        // Buscar la estructura que causa el conflicto
        const vigente = await sql`
          SELECT id, vigencia_desde, vigencia_hasta
          FROM sueldo_estructura_guardia
          WHERE guardia_id = ${guardia_id}
            AND (
              (vigencia_desde <= ${vigencia_desde}::date AND (vigencia_hasta IS NULL OR ${vigencia_desde}::date <= vigencia_hasta)) OR
              (${vigencia_desde}::date <= vigencia_desde AND (vigencia_hasta IS NULL OR vigencia_desde <= ${vigencia_desde}::date))
            )
          ORDER BY vigencia_desde DESC
          LIMIT 1;
        `;

        return NextResponse.json(
          {
            code: 'OVERLAP',
            message: 'Ya existe una estructura que cubre esa fecha',
            vigente: vigente.rows[0] || null,
          },
          { status: 409 }
        );
      }

      throw error;
    }

  } catch (error) {
    logger.error('Error al crear estructura::', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
