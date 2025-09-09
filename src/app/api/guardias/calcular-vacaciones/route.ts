import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    logger.debug('🚀 Calculando días de vacaciones para guardias activos...');

    // Obtener todos los guardias activos
    const guardiasActivos = await query(`
      SELECT 
        id, 
        nombre, 
        apellido_paterno, 
        apellido_materno,
        fecha_ingreso,
        dias_vacaciones_pendientes
      FROM guardias 
      WHERE activo = true 
        AND fecha_ingreso IS NOT NULL
      ORDER BY nombre, apellido_paterno
    `);

    if (guardiasActivos.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay guardias activos con fecha de ingreso para calcular vacaciones',
        procesados: 0,
        actualizados: 0
      });
    }

    logger.debug(`📊 Procesando ${guardiasActivos.rows.length} guardias activos...`);

    let actualizados = 0;
    const errores: string[] = [];
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1; // 1-12
    const añoActual = fechaActual.getFullYear();

    for (const guardia of guardiasActivos.rows) {
      try {
        const fechaIngreso = new Date(guardia.fecha_ingreso);
        const diasActuales = guardia.dias_vacaciones_pendientes || 0;

        // Calcular meses trabajados desde la fecha de ingreso
        const mesesTrabajados = (añoActual - fechaIngreso.getFullYear()) * 12 + 
                               (mesActual - (fechaIngreso.getMonth() + 1));

        // Calcular días de vacaciones acumulados (1.25 días por mes)
        const diasAcumulados = mesesTrabajados * 1.25;

        // Sumar a los días actuales
        const nuevosDias = diasActuales + 1.25;

        // Actualizar en la base de datos
        await query(`
          UPDATE guardias 
          SET dias_vacaciones_pendientes = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [nuevosDias, guardia.id]);

        actualizados++;
        logger.debug(`✅ ${guardia.nombre} ${guardia.apellido_paterno}: ${diasActuales} → ${nuevosDias} días`);

      } catch (error) {
        const errorMsg = `Error procesando guardia ${guardia.nombre} ${guardia.apellido_paterno}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
        errores.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    const response = {
      success: true,
      message: `Cálculo de vacaciones completado`,
      procesados: guardiasActivos.rows.length,
      actualizados,
      errores: errores.length > 0 ? errores : undefined,
      fecha_calculo: fechaActual.toISOString().split('T')[0],
      dias_agregados: 1.25
    };

    devLogger.success(' Cálculo de vacaciones completado:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error calculando vacaciones:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor al calcular vacaciones',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Endpoint GET para obtener estadísticas de vacaciones
export async function GET(request: NextRequest) {
  try {
    logger.debug('📊 Obteniendo estadísticas de vacaciones...');

    // Estadísticas generales
    const stats = await query(`
      SELECT 
        COUNT(*) as total_guardias,
        COUNT(CASE WHEN activo = true THEN 1 END) as guardias_activos,
        COUNT(CASE WHEN activo = true AND fecha_ingreso IS NOT NULL THEN 1 END) as con_fecha_ingreso,
        AVG(CASE WHEN activo = true THEN dias_vacaciones_pendientes END) as promedio_dias,
        SUM(CASE WHEN activo = true THEN dias_vacaciones_pendientes END) as total_dias_acumulados
      FROM guardias
    `);

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
      ORDER BY dias_vacaciones_pendientes DESC 
      LIMIT 10
    `);

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
      ORDER BY fecha_ingreso ASC
      LIMIT 10
    `);

    const response = {
      success: true,
      estadisticas: stats.rows[0],
      top_vacaciones: topVacaciones.rows,
      sin_vacaciones: sinVacaciones.rows,
      fecha_consulta: new Date().toISOString().split('T')[0]
    };

    logger.debug('✅ Estadísticas obtenidas exitosamente');
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
