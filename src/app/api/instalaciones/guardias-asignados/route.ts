import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = getCurrentUserServer(request);
    
    // En desarrollo, usar tenant por defecto si no hay autenticación
    let tenantId = user?.tenant_id;
    if (!tenantId && process.env.NODE_ENV === 'development') {
      tenantId = '903edee6-6964-42b8-bcc4-14d23d4bbe1b'; // Tenant por defecto en desarrollo
      logger.debug('🔍 [DEV] Usando tenant por defecto:', tenantId);
    }
    
    if (!tenantId) {
      logger.debug('🔍 [AUTH] No se encontró tenant_id:', { user, hasUser: !!user });
      return NextResponse.json(
        { success: false, error: 'No autorizado - falta tenant_id' },
        { status: 401 }
      );
    }

    logger.debug('🔍 Obteniendo guardias asignados por instalación...', { tenantId });

    // Obtener guardias asignados con información de instalación y distancia
    // Usar tenant_id si está disponible, sino obtener todos los puestos con es_ppc = false
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
        AND (po.tenant_id = $1 OR po.tenant_id IS NULL)
        AND g.latitud IS NOT NULL 
        AND g.longitud IS NOT NULL
        AND i.latitud IS NOT NULL 
        AND i.longitud IS NOT NULL
      ORDER BY i.nombre, g.apellido_paterno, g.nombre
    `, [tenantId]);

    // Calcular distancias usando fórmula de Haversine
    const guardiasConDistancia = result.rows.map((row: any) => {
      const guardLat = parseFloat(row.guardia_lat);
      const guardLng = parseFloat(row.guardia_lng);
      const instLat = parseFloat(row.instalacion_lat);
      const instLng = parseFloat(row.instalacion_lng);
      
      const distancia = calcularDistancia(guardLat, guardLng, instLat, instLng);
      
      return {
        ...row,
        distancia: Math.round(distancia * 10) / 10 // Redondear a 1 decimal
      };
    });

    // Agrupar por instalación
    const instalacionesMap = new Map();
    
    guardiasConDistancia.forEach((guardia: any) => {
      const instId = guardia.instalacion_id;
      
      if (!instalacionesMap.has(instId)) {
        instalacionesMap.set(instId, {
          instalacion_id: instId,
          instalacion_nombre: guardia.instalacion_nombre,
          instalacion_lat: parseFloat(guardia.instalacion_lat),
          instalacion_lng: parseFloat(guardia.instalacion_lng),
          guardias: [],
          distancias: []
        });
      }
      
      const instalacion = instalacionesMap.get(instId);
      instalacion.guardias.push({
        guardia_id: guardia.guardia_id,
        guardia_nombre: guardia.guardia_nombre,
        telefono: guardia.telefono,
        guardia_comuna: guardia.guardia_comuna,
        guardia_lat: parseFloat(guardia.guardia_lat),
        guardia_lng: parseFloat(guardia.guardia_lng),
        rol_nombre: guardia.rol_nombre,
        fecha_asignacion: guardia.fecha_asignacion,
        asignado_desde: guardia.asignado_desde,
        distancia: guardia.distancia
      });
      
      instalacion.distancias.push(guardia.distancia);
    });

    // Calcular métricas de optimización para cada instalación
    const instalacionesOptimizadas = Array.from(instalacionesMap.values()).map((inst: any) => {
      const distancias = inst.distancias;
      const distanciaPromedio = distancias.reduce((sum: number, dist: number) => sum + dist, 0) / distancias.length;
      const distanciaMaxima = Math.max(...distancias);
      const distanciaMinima = Math.min(...distancias);
      
      // Calcular puntuación de optimización (inversa de la distancia promedio)
      // Menor distancia promedio = mayor puntuación
      // Fórmula ajustada: 100 - (distancia_promedio * 2) para que sea más realista
      const puntuacionOptimizacion = Math.max(0, Math.min(100, 100 - (distanciaPromedio * 2)));
      
      return {
        ...inst,
        total_guardias: inst.guardias.length,
        distancia_promedio: Math.round(distanciaPromedio * 10) / 10,
        distancia_maxima: Math.round(distanciaMaxima * 10) / 10,
        distancia_minima: Math.round(distanciaMinima * 10) / 10,
        puntuacion_optimizacion: Math.round(puntuacionOptimizacion)
      };
    });

    // Ordenar por puntuación de optimización (mayor a menor)
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