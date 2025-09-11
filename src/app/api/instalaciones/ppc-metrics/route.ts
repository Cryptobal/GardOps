import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET() {
  try {
    // Obtener métricas de PPCs
    const ppcMetrics = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'Pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'Asignado' THEN 1 END) as asignados,
        COUNT(CASE WHEN estado = 'Cancelado' THEN 1 END) as cancelados,
        COUNT(CASE WHEN estado = 'Completado' THEN 1 END) as completados
      FROM puestos_por_cubrir
    `);

    const metrics = ppcMetrics.rows[0];

    return NextResponse.json({
      total: parseInt(metrics.total) || 0,
      pendientes: parseInt(metrics.pendientes) || 0,
      asignados: parseInt(metrics.asignados) || 0,
      cancelados: parseInt(metrics.cancelados) || 0,
      completados: parseInt(metrics.completados) || 0
    });

  } catch (error) {
    logger.error('Error obteniendo métricas de PPCs::', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 