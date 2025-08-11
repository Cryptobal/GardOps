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
  // TEMPORAL: Desactivar la nueva API hasta que se creen las funciones en la base de datos
  // La función fn_deshacer no existe aún, causando problemas
  return false;
  
  // Código original comentado temporalmente
  /*
  // En el cliente, primero intentamos con NEXT_PUBLIC_
  if (typeof window !== 'undefined') {
    const publicFlag = process.env.NEXT_PUBLIC_USE_NEW_TURNOS_API;
    if (publicFlag !== undefined) {
      return publicFlag.toLowerCase() === 'true';
    }
  }
  
  // Fallback a la variable de servidor
  return (process.env.USE_NEW_TURNOS_API ?? 'false').toLowerCase() === 'true';
  */
};