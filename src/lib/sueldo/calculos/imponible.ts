import { SueldoInput, ParametrosSueldo } from '../tipos/sueldo';
import { redondearCLP } from '../utils/redondeo';

export interface CalculoImponible {
  sueldoBase: number;
  gratificacionLegal: number;
  horasExtras: number;
  comisiones: number;
  bonos: number;
  total: number;
  topeAplicado: number;
}

/**
 * Calcula la gratificación legal (25% con tope de 4.75 ingresos mínimos)
 */
function calcularGratificacionLegal(sueldoBase: number, valorUf: number): number {
  const gratificacion = sueldoBase * 0.25;
  const topeGratificacion = valorUf * 4.75 * 500000; // Aproximación del ingreso mínimo
  
  return redondearCLP(Math.min(gratificacion, topeGratificacion));
}

/**
 * Calcula el valor de las horas extras
 */
function calcularHorasExtras(input: SueldoInput): number {
  if (!input.horasExtras) return 0;
  
  const valorHora = input.sueldoBase / 180; // 180 horas mensuales
  const horas50 = input.horasExtras.cincuenta * valorHora * 0.5;
  const horas100 = input.horasExtras.cien * valorHora * 1.0;
  
  return redondearCLP(horas50 + horas100);
}

/**
 * Calcula el total de bonos
 */
function calcularBonos(input: SueldoInput): number {
  if (!input.bonos) return 0;
  
  const total = Object.values(input.bonos).reduce((sum, valor) => {
    return sum + (valor || 0);
  }, 0);
  
  return redondearCLP(total);
}

/**
 * Calcula todos los valores imponibles
 */
export function calcularImponible(input: SueldoInput, parametros: ParametrosSueldo): CalculoImponible {
  const sueldoBase = redondearCLP(input.sueldoBase);
  const gratificacionLegal = calcularGratificacionLegal(sueldoBase, parametros.valorUf);
  const horasExtras = calcularHorasExtras(input);
  const comisiones = redondearCLP(input.comisiones || 0);
  const bonos = calcularBonos(input);
  
  // Calcular total antes del tope
  const totalAntesTope = sueldoBase + gratificacionLegal + horasExtras + comisiones + bonos;
  
  // Aplicar tope imponible
  const topeImponible = parametros.ufTopeImponible * parametros.valorUf;
  const topeAplicado = Math.max(0, totalAntesTope - topeImponible);
  const total = redondearCLP(Math.min(totalAntesTope, topeImponible));
  
  return {
    sueldoBase,
    gratificacionLegal,
    horasExtras,
    comisiones,
    bonos,
    total,
    topeAplicado
  };
}
