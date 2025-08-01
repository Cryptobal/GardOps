import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;

    // Terminar la asignación actual activa
    const result = await query(`
      UPDATE as_turnos_asignaciones 
      SET 
        estado = 'Finalizada',
        fecha_termino = CURRENT_DATE,
        motivo_termino = 'Cambio de asignación'
      WHERE guardia_id = $1 AND estado = 'Activa'
      RETURNING *
    `, [guardiaId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No hay asignación activa para terminar' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Asignación terminada correctamente',
      asignacion: result.rows[0]
    });

  } catch (error) {
    console.error('Error terminando asignación del guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 