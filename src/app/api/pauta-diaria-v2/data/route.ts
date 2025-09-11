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
        pd.*,
        CASE 
          WHEN pd.meta->>'cobertura_guardia_id' IS NOT NULL THEN
            CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre)
          ELSE NULL
        END AS cobertura_guardia_nombre,
        g.telefono AS cobertura_guardia_telefono,
        gt.telefono AS guardia_titular_telefono,
        gw.telefono AS guardia_trabajo_telefono,
        pd.meta->>'estado_semaforo' AS estado_semaforo,
        pd.meta->>'comentarios' AS comentarios
      FROM as_turnos_v_pauta_diaria_dedup_fixed pd
      LEFT JOIN guardias g ON g.id::text = pd.meta->>'cobertura_guardia_id'
      LEFT JOIN guardias gt ON gt.id::text = pd.guardia_titular_id::text
      LEFT JOIN guardias gw ON gw.id::text = pd.guardia_trabajo_id::text
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
