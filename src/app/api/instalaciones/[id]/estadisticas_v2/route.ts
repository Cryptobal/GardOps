import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("🔁 Endpoint activo: /api/instalaciones/[id]/estadisticas_v2");
  
  try {
    const instalacionId = params.id;

    // Obtener estadísticas usando exclusivamente as_turnos_puestos_operativos
    const result = await query(`
      SELECT 
        -- Puestos totales
        COUNT(*) as puestos_creados,
        
        -- Puestos asignados (con guardia_id)
        COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as puestos_asignados,
        
        -- PPCs activos (es_ppc = true)
        COUNT(CASE WHEN es_ppc = true THEN 1 END) as ppc_pendientes,
        
        -- PPCs totales (es_ppc = true)
        COUNT(CASE WHEN es_ppc = true THEN 1 END) as ppc_totales,
        
        -- Puestos disponibles (sin guardia asignado)
        COUNT(CASE WHEN guardia_id IS NULL THEN 1 END) as puestos_disponibles
        
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1 AND po.activo = true
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
        puestos_disponibles: parseInt(stats.puestos_disponibles) || 0
      }
    });

  } catch (error) {
    console.error('❌ Error en GET /api/instalaciones/[id]/estadisticas_v2:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
} 