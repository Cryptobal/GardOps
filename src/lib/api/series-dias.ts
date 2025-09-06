/**
 * API para obtener series de días de los roles de servicio
 */

export interface SerieDiaApi {
  id: number;
  posicion_en_ciclo: number;
  es_dia_trabajo: boolean;
  hora_inicio: string | null;
  hora_termino: string | null;
  horas_turno: number;
  observaciones: string | null;
}

/**
 * Obtiene las series de días de un rol de servicio
 */
export async function obtenerSeriesDias(rolId: string): Promise<SerieDiaApi[]> {
  try {
    const response = await fetch(`/api/roles-servicio/${rolId}/series`);
    
    if (!response.ok) {
      console.error('Error obteniendo series:', response.status);
      return [];
    }
    
    const result = await response.json();
    
    if (result.success && result.data.series_dias) {
      return result.data.series_dias;
    }
    
    return [];
  } catch (error) {
    console.error('Error obteniendo series de días:', error);
    return [];
  }
}

/**
 * Cache simple para series de días
 */
const seriesCache = new Map<string, SerieDiaApi[]>();

/**
 * Obtiene series con cache para mejor performance
 */
export async function obtenerSeriesDiasConCache(rolId: string): Promise<SerieDiaApi[]> {
  // Si está en cache, devolverlo
  if (seriesCache.has(rolId)) {
    return seriesCache.get(rolId)!;
  }
  
  // Si no está en cache, obtenerlo y guardarlo
  const series = await obtenerSeriesDias(rolId);
  seriesCache.set(rolId, series);
  
  return series;
}

/**
 * Limpiar cache cuando se actualicen los roles
 */
export function limpiarCacheSeries() {
  seriesCache.clear();
}
