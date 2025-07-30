// API functions para optimización de asignaciones
import { query } from '../database';

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
export async function getGuardiasConCoordenadas(): Promise<LocationData[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    // Obtener token de autenticación desde cookies
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_token='))
      ?.split('=')[1];
    
    if (!token) {
      console.warn('No hay token de autenticación en cookies');
      return [];
    }
    
    const response = await fetch(`${baseUrl}/api/guardias-con-coordenadas`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
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
export async function getInstalacionesConCoordenadas(): Promise<LocationData[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    // Obtener token de autenticación desde cookies
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_token='))
      ?.split('=')[1];
    
    if (!token) {
      console.warn('No hay token de autenticación en cookies');
      return [];
    }
    
    const response = await fetch(`${baseUrl}/api/instalaciones-con-coordenadas`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
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
  // Importar la función de autenticación de forma segura
  try {
    const { getTenantId } = require('../auth');
    const tenantId = getTenantId();
    
    console.log('Tenant ID obtenido:', tenantId);
    
    if (!tenantId) {
      console.warn('No se pudo obtener el tenant ID, usando valor por defecto');
      return 'default-tenant-id';
    }
    
    return tenantId;
  } catch (error) {
    console.warn('Error obteniendo tenant ID, usando valor por defecto:', error);
    return 'default-tenant-id';
  }
} 