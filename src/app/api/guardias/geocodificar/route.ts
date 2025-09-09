import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { 
  geocodificarLote, 
  actualizarCoordenadasGuardia, 
  obtenerGuardiasSinCoordenadas,
  construirDireccionCompleta 
} from '@/lib/utils/geocoding-batch';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    logger.debug('🗺️ Iniciando geocodificación masiva de guardias...');

    // Obtener guardias que necesitan geocodificación
    const guardiasSinCoordenadas = await obtenerGuardiasSinCoordenadas();
    
    if (guardiasSinCoordenadas.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay guardias que necesiten geocodificación',
        procesados: 0,
        actualizados: 0
      });
    }

    logger.debug(`📊 Procesando ${guardiasSinCoordenadas.length} guardias sin coordenadas...`);

    // Construir direcciones completas
    const direcciones = guardiasSinCoordenadas.map(guardia => 
      construirDireccionCompleta(guardia.direccion, guardia.comuna, guardia.ciudad)
    );

    // Geocodificar en lote
    const resultados = await geocodificarLote(direcciones, 200); // 200ms delay entre requests

    // Actualizar guardias con coordenadas obtenidas
    let actualizados = 0;
    const errores: string[] = [];

    for (let i = 0; i < resultados.length; i++) {
      const { direccion, resultado } = resultados[i];
      const guardia = guardiasSinCoordenadas[i];

      if (resultado) {
        try {
          await actualizarCoordenadasGuardia(guardia.id, resultado);
          actualizados++;
          logger.debug(`✅ ${guardia.nombre} ${guardia.apellido_paterno}: coordenadas actualizadas`);
        } catch (error) {
          const errorMsg = `Error actualizando coordenadas para ${guardia.nombre} ${guardia.apellido_paterno}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
          errores.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      } else {
        const errorMsg = `No se pudo geocodificar dirección para ${guardia.nombre} ${guardia.apellido_paterno}: ${direccion}`;
        errores.push(errorMsg);
        logger.warn(`⚠️ ${errorMsg}`);
      }
    }

    const response = {
      success: true,
      message: `Geocodificación completada`,
      procesados: guardiasSinCoordenadas.length,
      actualizados,
      errores: errores.length > 0 ? errores : undefined,
      fecha_proceso: new Date().toISOString().split('T')[0]
    };

    devLogger.success(' Geocodificación masiva completada:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error en geocodificación masiva:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor al geocodificar direcciones',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET - Obtener estadísticas de geocodificación
export async function GET(request: NextRequest) {
  try {
    logger.debug('📊 Obteniendo estadísticas de geocodificación...');

    // Estadísticas generales
    const stats = await query(`
      SELECT 
        COUNT(*) as total_guardias,
        COUNT(CASE WHEN latitud IS NOT NULL AND longitud IS NOT NULL THEN 1 END) as con_coordenadas,
        COUNT(CASE WHEN latitud IS NULL OR longitud IS NULL THEN 1 END) as sin_coordenadas,
        COUNT(CASE WHEN direccion IS NOT NULL AND direccion != '' THEN 1 END) as con_direccion
      FROM guardias
    `);

    // Guardias sin coordenadas
    const sinCoordenadas = await query(`
      SELECT 
        nombre,
        apellido_paterno,
        apellido_materno,
        direccion,
        comuna,
        ciudad
      FROM guardias 
      WHERE (latitud IS NULL OR longitud IS NULL)
        AND direccion IS NOT NULL 
        AND direccion != ''
      ORDER BY nombre, apellido_paterno
      LIMIT 10
    `);

    const response = {
      success: true,
      estadisticas: stats.rows[0],
      sin_coordenadas: sinCoordenadas.rows,
      fecha_consulta: new Date().toISOString().split('T')[0]
    };

    logger.debug('✅ Estadísticas de geocodificación obtenidas');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de geocodificación:', error);
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
