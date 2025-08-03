import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Obtener métricas de guardias
    // Migrado al nuevo modelo as_turnos_puestos_operativos
    const guardiaMetrics = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN po.id IS NULL THEN 1 END) as disponibles,
        COUNT(CASE WHEN po.id IS NOT NULL THEN 1 END) as asignados
      FROM guardias g
      LEFT JOIN as_turnos_puestos_operativos po ON g.id = po.guardia_id 
        AND po.es_ppc = false
      WHERE g.activo = true
    `);

    // Obtener guardias con conflictos (múltiples asignaciones activas)
    const conflictos = await query(`
      SELECT COUNT(DISTINCT g.id) as con_conflictos
      FROM guardias g
      INNER JOIN as_turnos_puestos_operativos po ON g.id = po.guardia_id
      WHERE po.es_ppc = false
        AND g.activo = true
      GROUP BY g.id
      HAVING COUNT(po.id) > 1
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