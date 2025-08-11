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

/**
 * Versión para cliente (navegador)
 * Prioriza NEXT_PUBLIC_ sobre la variable de servidor
 */
export const useNewTurnosApiClient = () => {
  // Usar la nueva API por defecto ya que fn_deshacer ya existe
  // Se puede desactivar con NEXT_PUBLIC_USE_NEW_TURNOS_API=false si es necesario
  
  // En el cliente, primero intentamos con NEXT_PUBLIC_
  if (typeof window !== 'undefined') {
    const publicFlag = process.env.NEXT_PUBLIC_USE_NEW_TURNOS_API;
    if (publicFlag !== undefined) {
      return publicFlag.toLowerCase() !== 'false'; // Cambio: true por defecto
    }
  }
  
  // Por defecto usar la nueva API
  return true;
};