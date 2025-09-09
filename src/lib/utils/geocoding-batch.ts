import { query } from '@/lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export interface GeocodingResult {
  latitud: number;
  longitud: number;
  direccionCompleta: string;
  comuna: string;
  ciudad: string;
  region: string;
}

/**
 * Geocodifica una dirección usando Google Maps Geocoding API REST
 * @param direccion - Dirección a geocodificar
 * @returns Resultado de geocodificación o null si falla
 */
export async function geocodificarDireccion(direccion: string): Promise<GeocodingResult | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key no está configurada');
      return null;
    }

    const encodedAddress = encodeURIComponent(direccion);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&region=CL&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      // Extraer componentes de dirección
      const componentes = {
        comuna: '',
        ciudad: '',
        region: '',
        direccionCompleta: result.formatted_address
      };

      if (result.address_components) {
        result.address_components.forEach((component: any) => {
          const types = component.types;
          const name = component.long_name;

          if (types.includes('locality')) {
            componentes.ciudad = name;
          } else if (types.includes('administrative_area_level_2')) {
            componentes.comuna = name;
          } else if (types.includes('administrative_area_level_1')) {
            componentes.region = name;
          }
        });
      }

      return {
        latitud: location.lat,
        longitud: location.lng,
        direccionCompleta: componentes.direccionCompleta,
        comuna: componentes.comuna,
        ciudad: componentes.ciudad,
        region: componentes.region
      };
    } else {
      logger.warn(`Geocodificación falló para "${direccion}": ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error geocodificando "${direccion}":`, error);
    return null;
  }
}

/**
 * Geocodifica múltiples direcciones en lote
 * @param direcciones - Array de direcciones a geocodificar
 * @param delay - Delay entre requests (ms) para evitar rate limiting
 * @returns Array de resultados de geocodificación
 */
export async function geocodificarLote(
  direcciones: string[], 
  delay: number = 100
): Promise<Array<{ direccion: string; resultado: GeocodingResult | null }>> {
  const resultados: Array<{ direccion: string; resultado: GeocodingResult | null }> = [];
  
  logger.debug(`🗺️ Iniciando geocodificación de ${direcciones.length} direcciones...`);
  
  for (let i = 0; i < direcciones.length; i++) {
    const direccion = direcciones[i];
    logger.debug(`📍 Geocodificando ${i + 1}/${direcciones.length}: ${direccion}`);
    
    try {
      const resultado = await geocodificarDireccion(direccion);
      resultados.push({ direccion, resultado });
      
      // Delay para evitar rate limiting
      if (i < direcciones.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`Error geocodificando "${direccion}":`, error);
      resultados.push({ direccion, resultado: null });
    }
  }
  
  const exitosos = resultados.filter(r => r.resultado !== null).length;
  logger.debug(`✅ Geocodificación completada: ${exitosos}/${direcciones.length} exitosos`);
  
  return resultados;
}

/**
 * Actualiza las coordenadas de un guardia en la base de datos
 * @param guardiaId - ID del guardia
 * @param coordenadas - Coordenadas a actualizar
 */
export async function actualizarCoordenadasGuardia(
  guardiaId: string, 
  coordenadas: GeocodingResult
): Promise<void> {
  try {
    await query(`
      UPDATE guardias 
      SET 
        latitud = $1,
        longitud = $2,
        direccion = $3,
        comuna = $4,
        ciudad = $5,
        region = $6,
        updated_at = NOW()
      WHERE id = $7
    `, [
      coordenadas.latitud,
      coordenadas.longitud,
      coordenadas.direccionCompleta,
      coordenadas.comuna,
      coordenadas.ciudad,
      coordenadas.region,
      guardiaId
    ]);
    
    logger.debug(`✅ Coordenadas actualizadas para guardia ${guardiaId}`);
  } catch (error) {
    console.error(`❌ Error actualizando coordenadas para guardia ${guardiaId}:`, error);
    throw error;
  }
}

/**
 * Obtiene guardias que necesitan geocodificación
 * @returns Array de guardias sin coordenadas
 */
export async function obtenerGuardiasSinCoordenadas(): Promise<Array<{
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  direccion: string;
  comuna: string;
  ciudad: string;
}>> {
  try {
    const result = await query(`
      SELECT 
        id,
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
    `);
    
    return result.rows;
  } catch (error) {
    logger.error('Error obteniendo guardias sin coordenadas::', error);
    throw error;
  }
}

/**
 * Construye una dirección completa para geocodificación
 * @param direccion - Dirección base
 * @param comuna - Comuna
 * @param ciudad - Ciudad
 * @returns Dirección completa formateada
 */
export function construirDireccionCompleta(
  direccion: string, 
  comuna?: string, 
  ciudad?: string
): string {
  let direccionCompleta = direccion.trim();
  
  if (comuna && comuna.trim()) {
    direccionCompleta += `, ${comuna.trim()}`;
  }
  
  if (ciudad && ciudad.trim()) {
    direccionCompleta += `, ${ciudad.trim()}`;
  }
  
  // Agregar Chile para mejorar la precisión
  direccionCompleta += ', Chile';
  
  return direccionCompleta;
}
