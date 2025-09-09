import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
// GET /api/tramos-asignacion - Obtener tramos de asignación familiar
export async function GET(request: NextRequest) {
  try {
    logger.debug('🔍 API Tramos Asignación - Obteniendo tramos de asignación familiar');
    
    // Obtener el período más reciente disponible
    const periodoResult = await query(`
      SELECT MAX(periodo) as ultimo_periodo
      FROM sueldo_asignacion_familiar
    `);
    
    const ultimoPeriodo = periodoResult.rows[0]?.ultimo_periodo || '2025-08';
    
    const result = await query(`
      SELECT 
        tramo,
        desde,
        hasta,
        monto
      FROM sueldo_asignacion_familiar 
      WHERE periodo = $1
      ORDER BY 
        CASE 
          WHEN tramo = '-' THEN 0 
          WHEN tramo = 'A' THEN 1
          WHEN tramo = 'B' THEN 2
          WHEN tramo = 'C' THEN 3
          WHEN tramo = 'D' THEN 4
          ELSE 5
        END
    `, [ultimoPeriodo]);

    const tramos = result.rows.map(row => ({
      codigo: row.tramo,
      nombre: row.tramo === '-' ? 'Sin asignación familiar' : `Tramo ${row.tramo}`,
      descripcion: row.tramo === '-' 
        ? 'Sin derecho a asignación familiar'
        : `$${row.desde.toLocaleString('es-CL')} - ${row.hasta ? '$' + row.hasta.toLocaleString('es-CL') : 'Sin límite'}`,
      monto: row.monto,
      desde: row.desde,
      hasta: row.hasta
    }));

    devLogger.success(' Tramos de asignación obtenidos exitosamente:', tramos.length);

    return NextResponse.json({
      tramos,
      periodo: ultimoPeriodo,
      success: true
    });

  } catch (error) {
    console.error('❌ Error obteniendo tramos de asignación:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
