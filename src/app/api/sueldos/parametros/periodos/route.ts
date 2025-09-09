import { NextRequest, NextResponse } from 'next/server';
import { obtenerPeriodosDisponibles } from '@/lib/sueldo/db/parametros';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    const periodos = await obtenerPeriodosDisponibles();

    return NextResponse.json({
      success: true,
      periodos
    });

  } catch (error) {
    logger.error('Error obteniendo períodos::', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener períodos' },
      { status: 500 }
    );
  }
}
