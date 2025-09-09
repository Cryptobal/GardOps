import { NextRequest, NextResponse } from 'next/server';
import { obtenerAsignacionActual, obtenerHistorialAsignaciones } from '@/lib/historial-asignaciones';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

/**
 * API para obtener historial de asignaciones usando el nuevo sistema
 * CONSERVADOR - No afecta APIs existentes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardiaId = params.id;

    if (!guardiaId) {
      return NextResponse.json(
        { error: 'ID de guardia es requerido' },
        { status: 400 }
      );
    }

    logger.debug(`🔍 Obteniendo historial de asignaciones para guardia: ${guardiaId}`);

    // Usar nuevas funciones de historial
    const asignacionActual = await obtenerAsignacionActual(guardiaId);
    const historialCompleto = await obtenerHistorialAsignaciones(guardiaId);

    logger.debug(`✅ Historial obtenido: ${historialCompleto.length} asignaciones`);

    return NextResponse.json({
      success: true,
      asignacionActual,
      historial: historialCompleto,
      total: historialCompleto.length
    });

  } catch (error) {
    logger.error('Error al obtener historial de asignaciones::', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
