import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@vercel/postgres';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'central_monitoring', action: 'record' });
  if (deny) return deny;

  try {
    const llamadoId = params.id;
    const body = await request.json();
    const { observaciones } = body;

    // Obtener la llamada actual
    const llamadaActual = await sql`
      SELECT estado, observaciones
      FROM central_llamados
      WHERE id = ${llamadoId}
    `;

    if (llamadaActual.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Llamada no encontrada' },
        { status: 404 }
      );
    }

    const llamada = llamadaActual.rows[0];

    // Verificar que la llamada esté completada (no pendiente)
    if (llamada.estado === 'pendiente') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden actualizar observaciones de llamadas completadas' },
        { status: 400 }
      );
    }

    // Actualizar solo las observaciones
    const result = await sql`
      UPDATE central_llamados SET
        observaciones = ${observaciones || null},
        updated_at = now()
      WHERE id = ${llamadoId}
      RETURNING id, estado, observaciones, updated_at
    `;

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando observaciones:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
