import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// DELETE - Eliminar una estructura de guardia
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'delete' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {}

  try {
    const estructuraId = params.id;

    if (!estructuraId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere ID de estructura' },
        { status: 400 }
      );
    }

    // Eliminar primero los ítems de la estructura
    await sql`
      DELETE FROM sueldo_estructura_guardia_item 
      WHERE estructura_guardia_id = ${estructuraId}
    `;

    // Eliminar la estructura
    const result = await sql`
      DELETE FROM sueldo_estructura_guardia 
      WHERE id = ${estructuraId}
      RETURNING id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Estructura no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: estructuraId }
    });

  } catch (error) {
    logger.error('Error al eliminar estructura::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
