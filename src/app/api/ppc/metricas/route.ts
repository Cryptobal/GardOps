import { NextResponse } from "next/server";
import { query } from "@/lib/database";

export async function GET() {
  try {
    // Obtener datos de las últimas 6 semanas
    const metricas = await query(`
      WITH semanas AS (
        SELECT 
          DATE_TRUNC('week', CURRENT_DATE - INTERVAL '5 weeks') + (n || ' weeks')::interval as semana_inicio,
          DATE_TRUNC('week', CURRENT_DATE - INTERVAL '5 weeks') + (n || ' weeks')::interval + INTERVAL '6 days' as semana_fin
        FROM generate_series(0, 5) n
      ),
      ppc_semanales AS (
        SELECT 
          s.semana_inicio,
          s.semana_fin,
          COUNT(CASE WHEN po.guardia_id IS NULL THEN 1 END) as ppc_abiertos,
          COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as ppc_cubiertos,
          COUNT(*) as total_ppc
        FROM semanas s
        LEFT JOIN as_turnos_puestos_operativos po ON 
          po.es_ppc = true AND
          po.activo = true AND
          po.creado_en >= s.semana_inicio AND 
          po.creado_en <= s.semana_fin
        GROUP BY s.semana_inicio, s.semana_fin
      )
      SELECT 
        TO_CHAR(semana_inicio, 'YYYY-"W"IW') as semana,
        ppc_abiertos,
        ppc_cubiertos,
        total_ppc,
        CASE 
          WHEN total_ppc > 0 THEN 
            ROUND((ppc_abiertos::float / total_ppc * 100)::numeric, 1)
          ELSE 0 
        END as tasa_ppc
      FROM ppc_semanales
      ORDER BY semana_inicio
    `);

    // Obtener estadísticas generales
    // Migrado al nuevo modelo as_turnos_puestos_operativos
    const stats = await query(`
      SELECT 
        COUNT(CASE WHEN guardia_id IS NULL THEN 1 END) as total_abiertos,
        COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as total_cubiertos,
        COUNT(*) as total_ppc
      FROM as_turnos_puestos_operativos
      WHERE es_ppc = true AND activo = true
    `);

    const estadisticas = stats.rows[0];

    return NextResponse.json({
      metricas: metricas.rows,
      estadisticas: {
        total_abiertos: parseInt(estadisticas.total_abiertos) || 0,
        total_cubiertos: parseInt(estadisticas.total_cubiertos) || 0,
        total_ppc: parseInt(estadisticas.total_ppc) || 0,
        tasa_actual: estadisticas.total_ppc > 0 
          ? Math.round((parseInt(estadisticas.total_abiertos) / parseInt(estadisticas.total_ppc)) * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('Error obteniendo métricas PPC:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 