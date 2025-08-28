import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET - Obtener estructura de sueldo de un rol específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params; // rolId
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('instalacionId');
    const activoParam = searchParams.get('activo');

    const values: any[] = [id];
    let where = 'WHERE es.rol_servicio_id = $1 AND es.bono_id IS NULL';

    if (activoParam !== null) {
      values.push(activoParam === 'false' ? false : true);
      where += ` AND es.activo = $${values.length}`;
    }

    if (instalacionId) {
      values.push(instalacionId);
      where += ` AND es.instalacion_id = $${values.length}`;
    }

    const query = `
      SELECT es.*
      FROM sueldo_estructuras_servicio es
      ${where}
      ORDER BY es.updated_at DESC NULLS LAST, es.created_at DESC NULLS LAST
      LIMIT 1
    `;

    const result = await sql.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Estructura de sueldo no encontrada para este rol' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo estructura de sueldo:', error);
    return NextResponse.json(
      { error: 'Error al obtener estructura de sueldo' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar estructura de sueldo de un rol específico
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params; // rolId
    const body = await request.json();
    const { instalacion_id, sueldo_base } = body;

    if (!instalacion_id) {
      return NextResponse.json(
        { error: 'instalacion_id es requerido para actualizar la estructura base' },
        { status: 400 }
      );
    }

    const result = await sql.query(
      `UPDATE sueldo_estructuras_servicio
       SET sueldo_base = COALESCE($3, sueldo_base), updated_at = NOW()
       WHERE rol_servicio_id = $1 AND instalacion_id = $2 AND bono_id IS NULL
       RETURNING *`,
      [id, instalacion_id, sueldo_base]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Estructura de sueldo no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando estructura de sueldo:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estructura de sueldo' },
      { status: 500 }
    );
  }
}
