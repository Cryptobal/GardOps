import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// GET - Obtener todas las estructuras de un guardia
export async function GET(request: NextRequest) {
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'read:list' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {}

  try {
    const { searchParams } = new URL(request.url);
    const guardiaId = searchParams.get('guardia_id');

    if (!guardiaId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere guardia_id' },
        { status: 400 }
      );
    }

    // Buscar todas las estructuras del guardia
    const estructurasResult = await sql`
      SELECT 
        seg.id,
        seg.guardia_id,
        seg.vigencia_desde,
        seg.vigencia_hasta,
        seg.activo,
        seg.creado_en
      FROM sueldo_estructura_guardia seg
      WHERE seg.guardia_id = ${guardiaId}
      ORDER BY seg.vigencia_desde DESC
    `;

    return NextResponse.json({
      success: true,
      data: {
        estructuras: estructurasResult.rows
      }
    });

  } catch (error) {
    logger.error('Error al obtener estructuras de guardia::', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
