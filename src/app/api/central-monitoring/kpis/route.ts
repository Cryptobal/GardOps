import { NextRequest, NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz-api';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'central_monitoring', action: 'view' });
  if (deny) return deny;

  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    // Obtener KPIs del día
    const result = await sql`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN estado = 'exitoso' THEN 1 END) as exitosos,
        COUNT(CASE WHEN estado = 'no_contesta' THEN 1 END) as no_contesta,
        COUNT(CASE WHEN estado = 'ocupado' THEN 1 END) as ocupado,
        COUNT(CASE WHEN estado = 'incidente' THEN 1 END) as incidentes,
        COUNT(CASE WHEN estado = 'no_registrado' THEN 1 END) as no_registrado,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        AVG(CASE WHEN sla_segundos IS NOT NULL THEN sla_segundos END) as sla_promedio,
        ROUND(
          (COUNT(CASE WHEN estado = 'exitoso' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
        ) as tasa_exito
      FROM central_llamados
      WHERE DATE(programado_para) = ${fecha}
    `;

    const kpis = result.rows[0];

    // Obtener estadísticas por instalación
    const statsPorInstalacion = await sql`
      SELECT 
        i.nombre as instalacion_nombre,
        COUNT(*) as total_llamadas,
        COUNT(CASE WHEN cl.estado = 'exitoso' THEN 1 END) as exitosas,
        COUNT(CASE WHEN cl.estado = 'no_contesta' THEN 1 END) as no_contesta,
        COUNT(CASE WHEN cl.estado = 'incidente' THEN 1 END) as incidentes,
        ROUND(
          (COUNT(CASE WHEN cl.estado = 'exitoso' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
        ) as tasa_exito
      FROM central_llamados cl
      INNER JOIN instalaciones i ON cl.instalacion_id = i.id
      WHERE DATE(cl.programado_para) = ${fecha}
      GROUP BY i.id, i.nombre
      ORDER BY total_llamadas DESC
    `;

    // Obtener llamadas por hora
    const llamadasPorHora = await sql`
      SELECT 
        EXTRACT(HOUR FROM programado_para) as hora,
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'exitoso' THEN 1 END) as exitosas,
        COUNT(CASE WHEN estado = 'no_contesta' THEN 1 END) as no_contesta,
        COUNT(CASE WHEN estado = 'incidente' THEN 1 END) as incidentes
      FROM central_llamados
      WHERE DATE(programado_para) = ${fecha}
      GROUP BY EXTRACT(HOUR FROM programado_para)
      ORDER BY hora
    `;

    return NextResponse.json({
      success: true,
      data: {
        ...kpis,
        stats_por_instalacion: statsPorInstalacion.rows,
        llamadas_por_hora: llamadasPorHora.rows
      }
    });

  } catch (error) {
    console.error('Error obteniendo KPIs:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
