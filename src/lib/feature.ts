/**
 * Feature flags para el sistema
 * Permite activar/desactivar funcionalidades sin cambiar código
 */

/**
 * Determina si se debe usar la nueva API de turnos con funciones de Neon
 * @returns true si está habilitada la nueva API, false para usar el flujo anterior
 */
export const useNewTurnosApi = () =>
  (process.env.USE_NEW_TURNOS_API ?? 'false').toLowerCase() === 'true';

// Versiones no-Hook para evitar reglas de hooks en server/archivos utilitarios
export const isNewTurnosApiEnabledServer = () =>
  (process.env.USE_NEW_TURNOS_API ?? 'false').toLowerCase() === 'true';

/**
 * Versión para cliente (navegador)
 * Prioriza NEXT_PUBLIC_ sobre la variable de servidor
 */
export const useNewTurnosApiClient = () => {
  // DESHABILITAR nueva API - usar endpoints viejos que funcionan
  // Se puede activar con NEXT_PUBLIC_USE_NEW_TURNOS_API=true si es necesario
  
  // En el cliente, primero intentamos con NEXT_PUBLIC_
  if (typeof window !== 'undefined') {
    const publicFlag = process.env.NEXT_PUBLIC_USE_NEW_TURNOS_API;
    if (publicFlag !== undefined) {
      return publicFlag.toLowerCase() === 'true'; // Solo true si explícitamente se activa
    }
  }
  
  // Por defecto usar endpoints viejos que funcionan
  return false;
};

// Helper unificado seguro para server/client
export const isNewTurnosApiEnabled = () => {
  if (typeof window === 'undefined') return isNewTurnosApiEnabledServer();
  // Evitar regla de hooks: no llamar funciones que empiezan con use* aquí
  const publicFlag = process.env.NEXT_PUBLIC_USE_NEW_TURNOS_API;
  if (publicFlag !== undefined) {
    return publicFlag.toLowerCase() === 'true';
  }
  return false; // CAMBIAR A FALSE PARA USAR ENDPOINTS VIEJOS QUE FUNCIONAN
};