import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = getCurrentUserServer(request);
    if (!user || !user.tenant_id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    logger.debug('🔍 Obteniendo guardias asignados por instalación...');

    // Obtener guardias asignados con información de instalación y distancia
    const result = await query(`
      SELECT 
        g.id as guardia_id,
        CONCAT(g.nombre, ' ', g.apellido_paterno) as guardia_nombre,
        g.telefono,
        g.comuna as guardia_comuna,
        g.latitud as guardia_lat,
        g.longitud as guardia_lng,
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.latitud as instalacion_lat,
        i.longitud as instalacion_lng,
        rs.nombre as rol_nombre,
        po.creado_en as fecha_asignacion,
        po.creado_en as asignado_desde
      FROM as_turnos_puestos_operativos po
      JOIN guardias g ON po.guardia_id = g.id
      JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.es_ppc = false
        AND po.tenant_id = $1
        AND g.latitud IS NOT NULL 
        AND g.longitud IS NOT NULL
        AND i.latitud IS NOT NULL 
        AND i.longitud IS NOT NULL
      ORDER BY i.nombre, g.apellido_paterno, g.nombre
    `, [user.tenant_id]);

    // Calcular distancias usando fórmula de Haversine
    const guardiasConDistancia = result.rows.map((row: any) => {
      const guardLat = parseFloat(row.guardia_lat);
      const guardLng = parseFloat(row.guardia_lng);
      const instLat = parseFloat(row.instalacion_lat);
      const instLng = parseFloat(row.instalacion_lng);

      if (isNaN(guardLat) || isNaN(guardLng) || isNaN(instLat) || isNaN(instLng)) {
        return null;
      }

      const distancia = calcularDistancia(instLat, instLng, guardLat, guardLng);

      return {
        guardia_id: row.guardia_id,
        guardia_nombre: row.guardia_nombre,
        telefono: row.telefono || '',
        guardia_comuna: row.guardia_comuna,
        guardia_lat: guardLat,
        guardia_lng: guardLng,
        instalacion_id: row.instalacion_id,
        instalacion_nombre: row.instalacion_nombre,
        instalacion_lat: instLat,
        instalacion_lng: instLng,
        rol_nombre: row.rol_nombre,
        fecha_asignacion: row.fecha_asignacion,
        asignado_desde: row.asignado_desde,
        distancia: distancia
      };
    }).filter(item => item !== null);

    // Agrupar por instalación y calcular estadísticas
    const instalacionesConEstadisticas = guardiasConDistancia.reduce((acc: any, guardia: any) => {
      const instId = guardia.instalacion_id;
      
      if (!acc[instId]) {
        acc[instId] = {
          instalacion_id: instId,
          instalacion_nombre: guardia.instalacion_nombre,
          instalacion_lat: guardia.instalacion_lat,
          instalacion_lng: guardia.instalacion_lng,
          guardias: [],
          total_guardias: 0,
          distancia_promedio: 0,
          distancia_maxima: 0,
          distancia_minima: Infinity,
          puntuacion_optimizacion: 0
        };
      }

      acc[instId].guardias.push(guardia);
      acc[instId].total_guardias++;
      acc[instId].distancia_maxima = Math.max(acc[instId].distancia_maxima, guardia.distancia);
      acc[instId].distancia_minima = Math.min(acc[instId].distancia_minima, guardia.distancia);

      return acc;
    }, {});

    // Calcular estadísticas finales y puntuación de optimización
    const instalacionesOptimizadas = Object.values(instalacionesConEstadisticas).map((inst: any) => {
      const distancias = inst.guardias.map((g: any) => g.distancia);
      inst.distancia_promedio = distancias.reduce((sum: number, dist: number) => sum + dist, 0) / distancias.length;
      inst.distancia_minima = inst.distancia_minima === Infinity ? 0 : inst.distancia_minima;

      // Puntuación de optimización (menor distancia promedio = mejor puntuación)
      // Escala de 0-100, donde 100 es la mejor optimización
      inst.puntuacion_optimizacion = Math.max(0, 100 - (inst.distancia_promedio * 2));

      return inst;
    });

    // Ordenar por puntuación de optimización (mejor primero)
    instalacionesOptimizadas.sort((a: any, b: any) => b.puntuacion_optimizacion - a.puntuacion_optimizacion);

    logger.debug(`✅ Instalaciones con guardias asignados: ${instalacionesOptimizadas.length}`);

    return NextResponse.json({
      success: true,
      data: instalacionesOptimizadas
    });

  } catch (error) {
    console.error('❌ Error obteniendo guardias asignados:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Función para calcular distancia usando fórmula de Haversine
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distancia = R * c;
  return distancia;
}
