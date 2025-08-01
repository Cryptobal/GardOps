import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;

    // Obtener estadísticas reales de la instalación
    const result = await query(`
      SELECT 
        -- Puestos creados (suma de cantidad_guardias de requisitos)
        COALESCE(puestos_creados.count, 0) as puestos_creados,
        
        -- Puestos asignados (asignaciones activas)
        COALESCE(puestos_asignados.count, 0) as puestos_asignados,
        
        -- PPC pendientes (puestos - asignaciones)
        COALESCE(puestos_creados.count, 0) - COALESCE(puestos_asignados.count, 0) as ppc_pendientes,
        
        -- PPC totales (puestos - asignaciones)
        COALESCE(puestos_creados.count, 0) - COALESCE(puestos_asignados.count, 0) as ppc_totales
        
      FROM instalaciones i
      
      -- Puestos creados (suma de cantidad_guardias de requisitos)
      LEFT JOIN (
        SELECT 
          tr.instalacion_id,
          SUM(tr.cantidad_guardias) as count
        FROM as_turnos_requisitos tr
        GROUP BY tr.instalacion_id
      ) puestos_creados ON puestos_creados.instalacion_id = i.id
      
      -- Puestos asignados (asignaciones activas)
      LEFT JOIN (
        SELECT 
          tr.instalacion_id,
          SUM(ta.cantidad_guardias) as count
        FROM as_turnos_asignaciones ta
        INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
        WHERE ta.estado = 'Activa'
        GROUP BY tr.instalacion_id
      ) puestos_asignados ON puestos_asignados.instalacion_id = i.id
      
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