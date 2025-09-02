// API functions para optimización de asignaciones
import { getApiBaseUrl } from '@/lib/config';

export interface LocationData {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  comuna: string;
  latitud: number;
  longitud: number;
  tipo: 'guardia' | 'instalacion';
  email?: string;
  telefono?: string;
  estado?: string;
  cliente_nombre?: string;
  valor_turno_extra?: number;
  rut?: string;
}

export interface SearchResult {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  comuna: string;
  distancia: number;
  tipo: 'guardia' | 'instalacion';
  email?: string;
  telefono?: string;
  estado?: string;
  cliente_nombre?: string;
  valor_turno_extra?: number;
  rut?: string;
}

// Obtener guardias con coordenadas
export const obtenerGuardiasConCoordenadas = async (): Promise<GuardiaConCoordenadas[]> => {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/guardias-con-coordenadas`);
    const result = await response.json();
    
    console.log('API Guardias - Response:', result);
    
    if (!result.success) {
      throw new Error(result.error || "Error al obtener guardias");
    }
    
    const guardias = result.data.map((guardia: any) => ({
      ...guardia,
      tipo: 'guardia' as const
    }));
    
    console.log('API Guardias - Procesados:', guardias.length);
    return guardias;
  } catch (error) {
    console.error('Error obteniendo guardias con coordenadas:', error);
    return [];
  }
}

// Obtener instalaciones con coordenadas
export const obtenerInstalacionesConCoordenadas = async (): Promise<InstalacionConCoordenadas[]> => {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/instalaciones-con-coordenadas`);
    const result = await response.json();
    
    console.log('API Instalaciones - Response:', result);
    
    if (!result.success) {
      throw new Error(result.error || "Error al obtener instalaciones");
    }
    
    const instalaciones = result.data.map((instalacion: any) => ({
      ...instalacion,
      tipo: 'instalacion' as const
    }));
    
    console.log('API Instalaciones - Procesados:', instalaciones.length);
    return instalaciones;
  } catch (error) {
    console.error('Error obteniendo instalaciones con coordenadas:', error);
    return [];
  }
}

// Función para calcular distancia usando fórmula de Haversine
export function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Buscar ubicaciones cercanas
export function buscarUbicacionesCercanas(
  referencia: LocationData,
  ubicaciones: LocationData[],
  distanciaMaxima: number
): SearchResult[] {
  return ubicaciones
    .filter(ubicacion => ubicacion.id !== referencia.id) // Excluir la referencia
    .map(ubicacion => ({
      ...ubicacion,
      distancia: calcularDistancia(
        referencia.latitud,
        referencia.longitud,
        ubicacion.latitud,
        ubicacion.longitud
      )
    }))
    .filter(resultado => resultado.distancia <= distanciaMaxima)
    .sort((a, b) => a.distancia - b.distancia);
}

// Obtener tenant ID del usuario actual
export function getCurrentTenantId(): string {
  // Por ahora usar un tenant ID por defecto
  // En el futuro se puede implementar obtención desde cookies o contexto
  return 'accebf8a-bacc-41fa-9601-ed39cb320a52';
} 