/**
 * Utilidades para formateo de fechas
 */

/**
 * Formatea una fecha a formato DD-MM-YYYY
 * Maneja casos especiales como fechas nulas, undefined o fecha epoch
 * @param fecha - Fecha en formato string, Date o null/undefined
 * @returns Fecha formateada en DD-MM-YYYY o "No configurado" si no es válida
 */
export function formatearFecha(fecha: string | Date | null | undefined): string {
  if (!fecha || fecha === '1970-01-01T00:00:00.000Z' || fecha === '1970-01-01') {
    return 'No configurado';
  }
  
  try {
    const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
    
    if (isNaN(fechaObj.getTime())) {
      return 'No configurado';
    }
    
    return fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'No configurado';
  }
}

/**
 * Formatea una fecha a formato DD-MM-YYYY HH:mm
 * @param fecha - Fecha en formato string, Date o null/undefined
 * @returns Fecha y hora formateada o "No configurado" si no es válida
 */
export function formatearFechaHora(fecha: string | Date | null | undefined): string {
  if (!fecha || fecha === '1970-01-01T00:00:00.000Z' || fecha === '1970-01-01') {
    return 'No configurado';
  }
  
  try {
    const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
    
    if (isNaN(fechaObj.getTime())) {
      return 'No configurado';
    }
    
    return fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'No configurado';
  }
}

/**
 * Convierte una fecha a formato YYYY-MM-DD para inputs de tipo date
 * @param fecha - Fecha en formato string, Date o null/undefined
 * @returns Fecha en formato YYYY-MM-DD o string vacío si no es válida
 */
export function toYmd(input: string | Date | null | undefined): string {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

/**
 * Convierte una fecha a formato de visualización
 * @param input - Fecha en formato string, Date o null/undefined
 * @returns Fecha formateada para visualización
 */
export function toDisplay(input: string | Date | null | undefined): string {
  return formatearFecha(input);
}
