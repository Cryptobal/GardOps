import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación usando el sistema personalizado
    const currentUser = getCurrentUserServer(request);
    
    // En producción, permitir acceso si no hay usuario autenticado (modo temporal)
    if (!currentUser && process.env.NODE_ENV === 'production') {
      logger.debug('🔍 Modo producción: permitiendo acceso sin autenticación estricta');
    } else if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const instalacionId = params.id;

    devLogger.search(' Obteniendo PPCs para instalación:', instalacionId);

    // USAR LA MISMA FUENTE QUE EL MÓDULO PPC - Vista de pauta diaria
    const fecha = '2025-09-08'; // Misma fecha que el módulo PPC
    
    // USAR EXACTAMENTE LA MISMA CONSULTA QUE /api/ppc PERO FILTRAR POR INSTALACIÓN
    const allPPCs = await query(`
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
      WHERE pd.fecha = $1 AND pd.es_ppc = true AND pd.estado_ui = 'plan'
      ORDER BY pd.es_ppc DESC, pd.instalacion_nombre NULLS LAST, pd.puesto_id, pd.pauta_id DESC
    `, [fecha]);
    
    logger.debug(`🔍 Total PPCs encontrados: ${allPPCs.rows.length}`);
    
    // Filtrar por instalación en JavaScript
    const result = { rows: allPPCs.rows.filter(row => row.instalacion_id === instalacionId) };

    const ppcs = result.rows.map((row: any) => ({
      id: row.puesto_id,
      instalacion_id: row.instalacion_id,
      instalacion_nombre: row.instalacion_nombre,
      rol_nombre: row.rol_nombre,
      rol_id: row.rol_id,
      nombre_puesto: row.puesto_nombre,
      created_at: row.fecha
    }));

    logger.debug(`✅ PPCs encontrados para instalación ${instalacionId}: ${ppcs.length}`);

    return NextResponse.json({
      success: true,
      data: ppcs
    });

  } catch (error) {
    console.error('❌ Error obteniendo PPCs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
