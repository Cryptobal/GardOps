/**
 * Utilidad centralizada para manejo de fechas con configuración de sistema
 * 
 * PROBLEMA SOLUCIONADO:
 * - 83 archivos usaban new Date().toISOString().split('T')[0] (UTC - INCORRECTO)
 * - Solo 2 archivos usaban zona horaria de Chile correctamente
 * - Inconsistencia masiva causando datos incorrectos 21:00-23:59 Chile
 * 
 * SOLUCIÓN:
 * - Utilidad centralizada que lee configuración de sistema
 * - Fallback a America/Santiago si no hay configuración
 * - Todas las fechas consistentes en toda la aplicación
 */

import { sql } from '@vercel/postgres';

/**
 * Cache para evitar múltiples consultas a la DB en la misma sesión
 */
let timezoneCache: { value: string; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene la zona horaria configurada en el sistema
 * Con cache para evitar consultas innecesarias
 */
export async function getSystemTimezone(): Promise<string> {
  try {
    // Verificar cache
    if (timezoneCache && (Date.now() - timezoneCache.timestamp) < CACHE_DURATION) {
      return timezoneCache.value;
    }

    // Consultar configuración de sistema
    const config = await sql`
      SELECT zona_horaria FROM configuracion_sistema 
      WHERE tenant_id IS NULL OR tenant_id = '1397e653-a702-4020-9702-3ae4f3f8b337'
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const timezone = config.rows[0]?.zona_horaria || 'America/Santiago';
    
    // Actualizar cache
    timezoneCache = {
      value: timezone,
      timestamp: Date.now()
    };

    return timezone;
  } catch (error) {
    console.warn('⚠️ Error obteniendo zona horaria del sistema, usando fallback:', error);
    return 'America/Santiago';
  }
}

/**
 * Obtiene la fecha HOY en formato YYYY-MM-DD usando configuración de sistema
 * 
 * ANTES: new Date().toISOString().split('T')[0] (UTC - INCORRECTO)
 * AHORA: Usa zona horaria configurada en sistema
 */
export async function getHoyChile(): Promise<string> {
  const timezone = await getSystemTimezone();
  return new Date().toLocaleString("en-CA", { timeZone: timezone }).split(',')[0];
}

/**
 * Obtiene la fecha y hora actual en formato YYYY-MM-DD HH:mm:ss usando configuración de sistema
 */
export async function getNowChile(): Promise<string> {
  const timezone = await getSystemTimezone();
  return new Date().toLocaleString("sv-SE", { timeZone: timezone });
}

/**
 * Versión síncrona para casos donde ya se conoce la zona horaria
 * Útil para componentes que ya tienen la configuración cargada
 */
export function getHoyChileSync(timezone = 'America/Santiago'): string {
  return new Date().toLocaleString("en-CA", { timeZone: timezone }).split(',')[0];
}

/**
 * Versión síncrona para fecha y hora
 */
export function getNowChileSync(timezone = 'America/Santiago'): string {
  return new Date().toLocaleString("sv-SE", { timeZone: timezone });
}

/**
 * Convierte una fecha a zona horaria de Chile usando configuración de sistema
 */
export async function toChileTimezone(date: Date | string): Promise<string> {
  const timezone = await getSystemTimezone();
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleString("sv-SE", { timeZone: timezone });
}

/**
 * Obtiene solo la fecha (YYYY-MM-DD) de una fecha en zona horaria de Chile
 */
export async function toChileDateOnly(date: Date | string): Promise<string> {
  const timezone = await getSystemTimezone();
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleString("en-CA", { timeZone: timezone }).split(',')[0];
}

/**
 * Utilidad para debugging - muestra diferencias entre UTC y Chile
 */
export async function debugTimezones(): Promise<{
  utc: string;
  chile: string;
  timezone: string;
  diferente: boolean;
}> {
  const timezone = await getSystemTimezone();
  const utc = new Date().toISOString().split('T')[0];
  const chile = new Date().toLocaleString("en-CA", { timeZone: timezone }).split(',')[0];
  
  return {
    utc,
    chile,
    timezone,
    diferente: utc !== chile
  };
}

/**
 * Limpiar cache (útil para testing)
 */
export function clearTimezoneCache(): void {
  timezoneCache = null;
}
