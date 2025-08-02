import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Obtener métricas de guardias
    const guardiaMetrics = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ag.id IS NULL THEN 1 END) as disponibles,
        COUNT(CASE WHEN ag.id IS NOT NULL THEN 1 END) as asignados
      FROM guardias g
      LEFT JOIN as_turnos_asignaciones ag ON g.id = ag.guardia_id 
        AND ag.estado = 'Activa' 
        AND ag.fecha_termino IS NULL
      WHERE g.estado = 'Activo'
    `);

    // Obtener guardias con conflictos (múltiples asignaciones activas)
    const conflictos = await query(`
      SELECT COUNT(DISTINCT g.id) as con_conflictos
      FROM guardias g
      INNER JOIN as_turnos_asignaciones ag ON g.id = ag.guardia_id
      WHERE ag.estado = 'Activa'
        AND ag.fecha_termino IS NULL
        AND g.estado = 'Activo'
      GROUP BY g.id
      HAVING COUNT(ag.id) > 1
    `);

    const metrics = guardiaMetrics.rows[0];
    const conflictosCount = conflictos.rows.length;

    return NextResponse.json({
      total: parseInt(metrics.total) || 0,
      disponibles: parseInt(metrics.disponibles) || 0,
      asignados: parseInt(metrics.asignados) || 0,
      conConflictos: conflictosCount
    });

  } catch (error) {
    console.error('Error obteniendo métricas de guardias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 