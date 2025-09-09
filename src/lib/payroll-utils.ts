import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

/**
 * Utilidades para el manejo de valores UF/UTM en cálculos de payroll
 */

export interface UFUTMValues {
  uf: {
    valor: number;
    fecha: string;
    error?: string;
  };
  utm: {
    valor: number;
    fecha: string;
    error?: string;
  };
  timestamp: string;
  source: string;
}

/**
 * Obtiene los valores UF/UTM desde las APIs de la CMF
 */
export async function fetchUFUTMValues(): Promise<UFUTMValues | null> {
  try {
    const response = await fetch('/api/payroll/valores-utm-uf');
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    } else {
      throw new Error('Error en la respuesta de la API');
    }
  } catch (error) {
    logger.error('Error al obtener valores UF/UTM::', error);
    return null;
  }
}

/**
 * Obtiene el valor UF actual para cálculos
 */
export async function getCurrentUFValue(): Promise<number> {
  const values = await fetchUFUTMValues();
  return values?.uf?.valor || 39280.76; // Valor por defecto basado en datos reales
}

/**
 * Obtiene el valor UTM actual para cálculos
 */
export async function getCurrentUTMValue(): Promise<number> {
  const values = await fetchUFUTMValues();
  return values?.utm?.valor || 68647; // Valor por defecto basado en datos reales
}

/**
 * Calcula el impuesto único de segunda categoría usando valores UF actuales
 */
export async function calculateImpuestoUnico(rentaImponible: number): Promise<{
  impuesto: number;
  ufValue: number;
  tramo: string;
}> {
  const ufValue = await getCurrentUFValue();
  const rentaUF = rentaImponible / ufValue;
  
  // Tramos del impuesto único (actualizados según legislación vigente)
  const tramos = [
    { desde: 0, hasta: 13.5, tasa: 0, rebaja: 0 },
    { desde: 13.5, hasta: 30, tasa: 4, rebaja: 0.6 },
    { desde: 30, hasta: 50, tasa: 8, rebaja: 1.8 },
    { desde: 50, hasta: 70, tasa: 13.5, rebaja: 4.5 },
    { desde: 70, hasta: 90, tasa: 23, rebaja: 10.5 },
    { desde: 90, hasta: 120, tasa: 30.4, rebaja: 17.1 },
    { desde: 120, hasta: Infinity, tasa: 35, rebaja: 23.1 }
  ];
  
  let tramoAplicable = tramos[0];
  for (const tramo of tramos) {
    if (rentaUF >= tramo.desde && rentaUF <= tramo.hasta) {
      tramoAplicable = tramo;
      break;
    }
  }
  
  const impuestoUF = (rentaUF * tramoAplicable.tasa / 100) - tramoAplicable.rebaja;
  const impuesto = Math.max(0, impuestoUF * ufValue);
  
  return {
    impuesto,
    ufValue,
    tramo: `${tramoAplicable.desde}-${tramoAplicable.hasta === Infinity ? '∞' : tramoAplicable.hasta} UF (${tramoAplicable.tasa}%)`
  };
}

/**
 * Calcula la gratificación legal usando valores UF actuales
 */
export async function calculateGratificacion(sueldoBase: number, mesesTrabajados: number = 12): Promise<{
  gratificacion: number;
  ufValue: number;
}> {
  const ufValue = await getCurrentUFValue();
  const topeGratificacion = 4.75 * ufValue; // 4.75 UF como tope
  const gratificacionBase = sueldoBase * 0.25; // 25% del sueldo base
  const gratificacion = Math.min(gratificacionBase, topeGratificacion) * (mesesTrabajados / 12);
  
  return {
    gratificacion,
    ufValue
  };
}

/**
 * Calcula el tope imponible AFP usando valores UF actuales
 */
export async function calculateTopeImponibleAFP(): Promise<{
  tope: number;
  ufValue: number;
}> {
  const ufValue = await getCurrentUFValue();
  const tope = 80.2 * ufValue; // 80.2 UF como tope imponible AFP
  
  return {
    tope,
    ufValue
  };
}

/**
 * Calcula el tope imponible ISAPRE usando valores UF actuales
 */
export async function calculateTopeImponibleISAPRE(): Promise<{
  tope: number;
  ufValue: number;
}> {
  const ufValue = await getCurrentUFValue();
  const tope = 80.2 * ufValue; // 80.2 UF como tope imponible ISAPRE
  
  return {
    tope,
    ufValue
  };
}

/**
 * Formatea un valor monetario en pesos chilenos
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Formatea un valor en UF
 */
export function formatUF(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value) + ' UF';
}

/**
 * Convierte un valor de pesos a UF usando el valor UF actual
 */
export async function pesosToUF(pesos: number): Promise<number> {
  const ufValue = await getCurrentUFValue();
  return pesos / ufValue;
}

/**
 * Convierte un valor de UF a pesos usando el valor UF actual
 */
export async function ufToPesos(uf: number): Promise<number> {
  const ufValue = await getCurrentUFValue();
  return uf * ufValue;
}

