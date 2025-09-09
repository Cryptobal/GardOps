import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// GET - Obtener ítems de una estructura específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'read:list' });
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

    // Obtener todos los ítems de la estructura
    const itemsResult = await sql`
      SELECT 
        segi.id,
        segi.estructura_guardia_id,
        segi.item_id,
        segi.monto,
        segi.creado_en
      FROM sueldo_estructura_guardia_item segi
      WHERE segi.estructura_guardia_id = ${estructuraId}
      ORDER BY segi.item_id
    `;

    return NextResponse.json({
      success: true,
      data: itemsResult.rows
    });

  } catch (error) {
    logger.error('Error al obtener ítems de estructura::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
