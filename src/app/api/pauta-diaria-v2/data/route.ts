import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { getHoyChile } from '@/lib/utils/chile-date';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || await getHoyChile();
    const incluirLibres = searchParams.get('incluirLibres') === 'true';

    logger.debug(`🔍 Obteniendo datos de pauta diaria para fecha: ${fecha}, incluirLibres: ${incluirLibres}`);
    
    // Construir la consulta base
    let query = `
      SELECT 
        pd.*
      FROM as_turnos_v_pauta_diaria_unificada pd
      WHERE pd.fecha = $1
    `;

    // NO filtrar en el backend - dejar que el frontend maneje el filtro
    // El frontend filtrará según el toggle "Ver libres"

    query += ` ORDER BY pd.es_ppc DESC, pd.instalacion_nombre NULLS LAST, pd.puesto_id, pd.pauta_id DESC`;

    const { rows } = await pool.query(query, [fecha]);
    
    logger.debug(`✅ Datos obtenidos exitosamente: ${rows.length} registros`);
    
    return NextResponse.json({
      success: true,
      data: rows,
      fecha,
      total: rows.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo datos de pauta diaria:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
