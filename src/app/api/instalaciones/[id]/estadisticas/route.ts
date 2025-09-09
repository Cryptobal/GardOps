import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  logger.debug("🔁 Endpoint activo: /api/instalaciones/[id]/estadisticas");
  
  try {
    const instalacionId = params.id;

    // Obtener estadísticas reales de la instalación
    // Migrado al nuevo modelo as_turnos_puestos_operativos
    const result = await query(`
      SELECT 
        -- Puestos totales (todos los puestos operativos)
        COALESCE(puestos_totales.count, 0) as puestos_creados,
        
        -- Puestos asignados (puestos con guardia asignado)
        COALESCE(puestos_asignados.count, 0) as puestos_asignados,
        
        -- PPC pendientes (puestos sin asignar)
        COALESCE(ppc_pendientes.count, 0) as ppc_pendientes,
        
        -- PPC totales (puestos sin asignar)
        COALESCE(ppc_pendientes.count, 0) as ppc_totales
        
      FROM instalaciones i
      
      -- Puestos totales (solo activos)
      LEFT JOIN (
        SELECT 
          po.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_puestos_operativos po
        WHERE po.activo = true
        GROUP BY po.instalacion_id
      ) puestos_totales ON puestos_totales.instalacion_id = i.id
      
      -- Puestos asignados (con guardia asignado, solo activos)
      LEFT JOIN (
        SELECT 
          po.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_puestos_operativos po
        WHERE po.es_ppc = false AND po.guardia_id IS NOT NULL AND po.activo = true
        GROUP BY po.instalacion_id
      ) puestos_asignados ON puestos_asignados.instalacion_id = i.id
      
      -- PPC pendientes (puestos sin asignar, solo activos)
      LEFT JOIN (
        SELECT 
          po.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_puestos_operativos po
        WHERE po.es_ppc = true AND po.activo = true
        GROUP BY po.instalacion_id
      ) ppc_pendientes ON ppc_pendientes.instalacion_id = i.id
      
      WHERE i.id = $1
    `, [instalacionId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    const stats = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        puestos_creados: parseInt(stats.puestos_creados) || 0,
        puestos_asignados: parseInt(stats.puestos_asignados) || 0,
        ppc_pendientes: parseInt(stats.ppc_pendientes) || 0,
        ppc_totales: parseInt(stats.ppc_totales) || 0,
        puestos_disponibles: (parseInt(stats.puestos_creados) || 0) - (parseInt(stats.puestos_asignados) || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error en GET /api/instalaciones/[id]/estadisticas:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
} 