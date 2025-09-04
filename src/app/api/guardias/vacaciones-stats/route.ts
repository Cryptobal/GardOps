import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Obteniendo estadísticas de vacaciones...');

    // Usar el tenant_id correcto de Gard
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';

    // Estadísticas generales
    const stats = await query(`
      SELECT 
        COUNT(*) as total_guardias,
        COUNT(CASE WHEN activo = true THEN 1 END) as guardias_activos,
        COUNT(CASE WHEN activo = true AND fecha_ingreso IS NOT NULL THEN 1 END) as con_fecha_ingreso,
        ROUND(AVG(CASE WHEN activo = true THEN dias_vacaciones_pendientes END), 2) as promedio_dias,
        ROUND(SUM(CASE WHEN activo = true THEN dias_vacaciones_pendientes END), 2) as total_dias_acumulados,
        COUNT(CASE WHEN activo = true AND (dias_vacaciones_pendientes IS NULL OR dias_vacaciones_pendientes = 0) THEN 1 END) as sin_vacaciones
      FROM guardias
      WHERE tenant_id = $1
    `, [tenantId]);

    // Guardias con más días de vacaciones
    const topVacaciones = await query(`
      SELECT 
        nombre,
        apellido_paterno,
        apellido_materno,
        dias_vacaciones_pendientes,
        fecha_ingreso
      FROM guardias 
      WHERE activo = true 
        AND dias_vacaciones_pendientes > 0
        AND tenant_id = $1
      ORDER BY dias_vacaciones_pendientes DESC 
      LIMIT 10
    `, [tenantId]);

    // Guardias sin días de vacaciones
    const sinVacaciones = await query(`
      SELECT 
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_ingreso
      FROM guardias 
      WHERE activo = true 
        AND (dias_vacaciones_pendientes IS NULL OR dias_vacaciones_pendientes = 0)
        AND fecha_ingreso IS NOT NULL
        AND tenant_id = $1
      ORDER BY fecha_ingreso ASC
      LIMIT 10
    `, [tenantId]);

    // Distribución de días de vacaciones
    const distribucion = await query(`
      SELECT 
        CASE 
          WHEN dias_vacaciones_pendientes IS NULL OR dias_vacaciones_pendientes = 0 THEN 'Sin vacaciones'
          WHEN dias_vacaciones_pendientes <= 5 THEN '1-5 días'
          WHEN dias_vacaciones_pendientes <= 10 THEN '6-10 días'
          WHEN dias_vacaciones_pendientes <= 15 THEN '11-15 días'
          WHEN dias_vacaciones_pendientes <= 20 THEN '16-20 días'
          ELSE 'Más de 20 días'
        END as rango,
        COUNT(*) as cantidad
      FROM guardias 
      WHERE activo = true AND tenant_id = $1
      GROUP BY 
        CASE 
          WHEN dias_vacaciones_pendientes IS NULL OR dias_vacaciones_pendientes = 0 THEN 'Sin vacaciones'
          WHEN dias_vacaciones_pendientes <= 5 THEN '1-5 días'
          WHEN dias_vacaciones_pendientes <= 10 THEN '6-10 días'
          WHEN dias_vacaciones_pendientes <= 15 THEN '11-15 días'
          WHEN dias_vacaciones_pendientes <= 20 THEN '16-20 días'
          ELSE 'Más de 20 días'
        END
      ORDER BY 
        CASE 
          WHEN dias_vacaciones_pendientes IS NULL OR dias_vacaciones_pendientes = 0 THEN 1
          WHEN dias_vacaciones_pendientes <= 5 THEN 2
          WHEN dias_vacaciones_pendientes <= 10 THEN 3
          WHEN dias_vacaciones_pendientes <= 15 THEN 4
          WHEN dias_vacaciones_pendientes <= 20 THEN 5
          ELSE 6
        END
    `, [tenantId]);

    const response = {
      success: true,
      estadisticas: {
        ...stats.rows[0],
        fecha_consulta: new Date().toISOString().split('T')[0]
      },
      top_vacaciones: topVacaciones.rows,
      sin_vacaciones: sinVacaciones.rows,
      distribucion: distribucion.rows
    };

    console.log('✅ Estadísticas obtenidas exitosamente');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor al obtener estadísticas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
