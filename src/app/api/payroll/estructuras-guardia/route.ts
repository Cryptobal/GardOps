import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guardia_id = searchParams.get('guardia_id');
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    if (!guardia_id || !anio || !mes) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: guardia_id, anio, mes' },
        { status: 400 }
      );
    }

    // Validar formato de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(guardia_id)) {
      return NextResponse.json(
        { error: 'guardia_id debe ser un UUID válido' },
        { status: 400 }
      );
    }

    // Validar formato de año y mes
    const anioNum = parseInt(anio);
    const mesNum = parseInt(mes);
    
    if (isNaN(anioNum) || isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      return NextResponse.json(
        { error: 'Formato inválido para año o mes' },
        { status: 400 }
      );
    }

    // Buscar cabecera vigente
    const cabeceraResult = await sql`
      SELECT id, guardia_id, vigencia_desde, vigencia_hasta
      FROM sueldo_estructura_guardia
      WHERE guardia_id = ${guardia_id}
        AND vigencia_desde <= make_date(${anioNum}, ${mesNum}, 1)
        AND (vigencia_hasta IS NULL OR make_date(${anioNum}, ${mesNum}, 1) <= vigencia_hasta)
      ORDER BY vigencia_desde DESC
      LIMIT 1;
    `;

    if (cabeceraResult.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'No hay estructura personal vigente para el período especificado',
          canCreate: true 
        },
        { status: 404 }
      );
    }

    const cabecera = cabeceraResult.rows[0];

    // Buscar líneas vigentes (solo HABERES)
    const lineasResult = await sql`
      SELECT gitem.id, gitem.item_id, si.codigo, si.nombre, si.clase, si.naturaleza,
             gitem.monto, gitem.vigencia_desde, gitem.vigencia_hasta, gitem.activo
      FROM sueldo_estructura_guardia_item gitem
      JOIN sueldo_item si ON si.id = gitem.item_id
      WHERE gitem.estructura_guardia_id = ${cabecera.id}
        AND gitem.activo = TRUE
        AND si.clase = 'HABER'
        AND gitem.vigencia_desde <= make_date(${anioNum}, ${mesNum}, 1)
        AND (gitem.vigencia_hasta IS NULL OR make_date(${anioNum}, ${mesNum}, 1) <= gitem.vigencia_hasta)
      ORDER BY si.codigo;
    `;

    return NextResponse.json({
      cabecera,
      lineas: lineasResult.rows
    });

  } catch (error) {
    console.error('Error al obtener estructura vigente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
