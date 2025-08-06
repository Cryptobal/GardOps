import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha_inicio = searchParams.get('fecha_inicio');
    const fecha_fin = searchParams.get('fecha_fin');
    const instalacion_id = searchParams.get('instalacion_id');

    // Construir condiciones WHERE
    let whereConditions = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (fecha_inicio) {
      whereConditions += ` AND te.fecha >= $${paramIndex}`;
      params.push(fecha_inicio);
      paramIndex++;
    }

    if (fecha_fin) {
      whereConditions += ` AND te.fecha <= $${paramIndex}`;
      params.push(fecha_fin);
      paramIndex++;
    }

    if (instalacion_id && instalacion_id !== 'all') {
      whereConditions += ` AND te.instalacion_id = $${paramIndex}`;
      params.push(instalacion_id);
      paramIndex++;
    }

    // Estadísticas generales
    const { rows: statsGenerales } = await query(`
      SELECT 
        COUNT(*) as total_turnos,
        COUNT(CASE WHEN pagado = true THEN 1 END) as turnos_pagados,
        COUNT(CASE WHEN pagado = false THEN 1 END) as turnos_pendientes,
        SUM(valor) as monto_total,
        SUM(CASE WHEN pagado = true THEN valor ELSE 0 END) as monto_pagado,
        SUM(CASE WHEN pagado = false THEN valor ELSE 0 END) as monto_pendiente,
        AVG(valor) as promedio_por_turno,
        COUNT(CASE WHEN estado = 'reemplazo' THEN 1 END) as turnos_reemplazo,
        COUNT(CASE WHEN estado = 'ppc' THEN 1 END) as turnos_ppc
      FROM TE_turnos_extras te
      ${whereConditions}
    `, params);

    // Estadísticas por instalación
    const { rows: statsPorInstalacion } = await query(`
      SELECT 
        i.nombre as instalacion_nombre,
        COUNT(*) as total_turnos,
        SUM(valor) as monto_total,
        COUNT(CASE WHEN pagado = true THEN 1 END) as turnos_pagados,
        COUNT(CASE WHEN pagado = false THEN 1 END) as turnos_pendientes
      FROM TE_turnos_extras te
      JOIN instalaciones i ON i.id = te.instalacion_id
      ${whereConditions}
      GROUP BY i.id, i.nombre
      ORDER BY monto_total DESC
    `, params);

    // Estadísticas por mes (últimos 12 meses)
    const { rows: statsPorMes } = await query(`
      SELECT 
        DATE_TRUNC('month', te.fecha) as mes,
        COUNT(*) as total_turnos,
        SUM(valor) as monto_total,
        COUNT(CASE WHEN pagado = true THEN 1 END) as turnos_pagados,
        COUNT(CASE WHEN pagado = false THEN 1 END) as turnos_pendientes
      FROM TE_turnos_extras te
      ${whereConditions}
      AND te.fecha >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', te.fecha)
      ORDER BY mes DESC
    `, params);

    // Top 10 guardias con más turnos extras
    const { rows: topGuardias } = await query(`
      SELECT 
        g.nombre,
        g.apellido_paterno,
        g.rut,
        COUNT(*) as total_turnos,
        SUM(te.valor) as monto_total,
        COUNT(CASE WHEN te.pagado = true THEN 1 END) as turnos_pagados,
        COUNT(CASE WHEN te.pagado = false THEN 1 END) as turnos_pendientes
      FROM TE_turnos_extras te
      JOIN guardias g ON g.id = te.guardia_id
      ${whereConditions}
      GROUP BY g.id, g.nombre, g.apellido_paterno, g.rut
      ORDER BY total_turnos DESC
      LIMIT 10
    `, params);

    const estadisticas = statsGenerales[0] || {
      total_turnos: 0,
      turnos_pagados: 0,
      turnos_pendientes: 0,
      monto_total: 0,
      monto_pagado: 0,
      monto_pendiente: 0,
      promedio_por_turno: 0,
      turnos_reemplazo: 0,
      turnos_ppc: 0
    };

    return NextResponse.json({
      ok: true,
      estadisticas: {
        generales: estadisticas,
        porInstalacion: statsPorInstalacion,
        porMes: statsPorMes,
        topGuardias: topGuardias
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 