import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Obtener la asignación actual del guardia
    const asignacionResult = await sql`
      SELECT 
        ga.id,
        ga.guardia_id,
        ga.instalacion_id,
        ga.rol_servicio_id as rol_id,
        ga.fecha_inicio,
        ga.fecha_fin,
        ga.activo,
        i.nombre as instalacion_nombre,
        rs.nombre as rol_nombre
      FROM guardias_asignaciones ga
      LEFT JOIN instalaciones i ON i.id = ga.instalacion_id
      LEFT JOIN as_turnos_roles_servicio rs ON rs.id = ga.rol_servicio_id
      WHERE ga.guardia_id = ${id}
        AND ga.activo = TRUE
      ORDER BY ga.fecha_inicio DESC
      LIMIT 1;
    `;

    if (asignacionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No hay asignación activa para este guardia' },
        { status: 404 }
      );
    }

    return NextResponse.json(asignacionResult.rows[0]);

  } catch (error) {
    console.error('Error al obtener asignación del guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
