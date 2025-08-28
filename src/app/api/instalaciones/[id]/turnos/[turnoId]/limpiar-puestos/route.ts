import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; turnoId: string } }
) {
  try {
    const { id: instalacionId, turnoId } = params;

    // 1. Eliminar TODOS los puestos del turno
    const deleteResult = await sql`
      DELETE FROM as_turnos_puestos_operativos 
      WHERE rol_id = ${turnoId} AND instalacion_id = ${instalacionId}
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Todos los puestos eliminados. Puedes crear nuevos puestos con numeración correlativa.',
      puestos_eliminados: deleteResult.rowCount
    });

  } catch (error) {
    console.error('Error eliminando puestos:', error);
    return NextResponse.json(
      { error: 'No se pudieron eliminar los puestos' },
      { status: 500 }
    );
  }
}
