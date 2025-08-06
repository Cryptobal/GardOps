import { SueldoInput, ParametrosSueldo } from '../tipos/sueldo';
import { redondearCLP } from '../utils/redondeo';

export interface CalculoCotizaciones {
  afp: number;
  salud: number;
  afc: number;
  total: number;
}

/**
 * Obtiene la tasa AFP según la administradora seleccionada
 * Según normativa 2025 - tasas oficiales
 */
function obtenerTasaAFP(afp: string): number {
  const tasasAFP: { [key: string]: number } = {
    'capital': 11.44,      // Capital
    'cuprum': 11.44,       // Cuprum
    'habitat': 11.27,      // Habitat
    'modelo': 10.77,       // Modelo
    'planvital': 11.10,    // PlanVital
    'provida': 11.45,      // ProVida
    'uno': 10.69,          // UNO
    'default': 11.44       // Default
  };
  
  return tasasAFP[afp.toLowerCase()] || tasasAFP.default;
}

/**
 * Calcula la cotización AFP (tasa completa según administradora)
 * Incluye seguro de invalidez y sobrevivencia (SIS)
 */
function calcularAFP(imponible: number, afp: string): number {
  if (typeof imponible !== 'number') {
    return 0;
  }
  
  const tasaAFP = obtenerTasaAFP(afp);
  const cotizacion = imponible * (tasaAFP / 100);
  
  return redondearCLP(cotizacion);
}

/**
 * Calcula la cotización de salud
 * Siempre es el 7% del imponible más la cotización adicional en UF si existe
 */
function calcularSalud(
  imponible: number, 
  input: SueldoInput, 
  parametros: ParametrosSueldo
): number {
  // Siempre es el 7% del imponible
  const cotizacionBase = imponible * 0.07;
  
  // Si hay cotización adicional en UF, se suma
  let cotizacionAdicional = 0;
  if (input.cotizacionAdicionalUF && typeof input.cotizacionAdicionalUF === 'number') {
    cotizacionAdicional = parametros.valorUf * input.cotizacionAdicionalUF;
  }
  
  return redondearCLP(cotizacionBase + cotizacionAdicional);
}

/**
 * Calcula la cotización AFC (0.6% solo para contratos indefinidos)
 */
function calcularAFC(imponible: number, tipoContrato: string): number {
  if (typeof imponible !== 'number' || typeof tipoContrato !== 'string') {
    return 0;
  }
  
  if (tipoContrato === 'indefinido') {
    return redondearCLP(imponible * 0.006);
  }
  
  return 0;
}

/**
 * Calcula todas las cotizaciones
 */
export function calcularCotizaciones(
  imponible: number, 
  input: SueldoInput, 
  parametros: ParametrosSueldo
): CalculoCotizaciones {
  if (typeof imponible !== 'number') {
    return {
      afp: 0,
      salud: 0,
      afc: 0,
      total: 0
    };
  }
  
  const afp = calcularAFP(imponible, input.afp);
  const salud = calcularSalud(imponible, input, parametros);
  const afc = calcularAFC(imponible, input.tipoContrato);
  
  const total = redondearCLP(afp + salud + afc);
  
  return {
    afp,
    salud,
    afc,
    total
  };
}
