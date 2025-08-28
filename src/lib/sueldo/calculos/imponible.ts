import { SueldoInput, ParametrosSueldo } from '../tipos/sueldo';
import { redondearCLP } from '../utils/redondeo';

export interface CalculoImponible {
  sueldoBase: number;
  descuentoDiasAusencia: number;
  sueldoBaseAjustado: number;
  gratificacionLegal: number;
  horasExtras: number;
  comisiones: number;
  bonos: number;
  total: number;
  topeAplicado: number;
}

/**
 * Calcula la gratificación legal (25% del sueldo base con tope de 4.75 ingresos mínimos)
 * Según normativa 2025: $529.000 × 4,75 / 12 = $209.396 mensual
 */
function calcularGratificacionLegal(sueldoBase: number): number {
  if (typeof sueldoBase !== 'number') {
    return 0;
  }
  
  const gratificacion = sueldoBase * 0.25;
  const topeGratificacion = 209396; // $209.396 según normativa 2025
  
  return redondearCLP(Math.min(gratificacion, topeGratificacion));
}

/**
 * Calcula el descuento por días de ausencia
 * Descuento = (sueldo base / 30) * días de ausencia
 */
function calcularDescuentoDiasAusencia(sueldoBase: number, diasAusencia?: number): number {
  if (!diasAusencia || diasAusencia <= 0) return 0;
  
  const valorDia = sueldoBase / 30;
  return redondearCLP(valorDia * diasAusencia);
}

/**
 * Calcula el valor de las horas extras según normativa oficial
 * Valor por hora: (sueldo base ajustado / 30 / jornada diaria) × 1,5
 * Jornada diaria calculada desde jornada semanal: jornada semanal / 5 días laborales
 * SOLO considera horas extras al 50%, excluye las horas al 100%
 */
function calcularHorasExtras(sueldoBaseAjustado: number, parametros: ParametrosSueldo, horasExtras?: { cincuenta?: number; cien?: number }): number {
  if (!horasExtras) return 0;
  
  // Usar jornada semanal desde parámetros en lugar de 8 horas fijas
  const jornadaSemanal = parametros.horasSemanalesJornada || 44; // Default 44 horas desde abril 2024
  const jornadaDiaria = jornadaSemanal / 5; // 5 días laborales
  
  const valorHora = (sueldoBaseAjustado / 30 / jornadaDiaria) * 1.5;
  
  // Solo considerar horas extras al 50%, excluir las horas al 100%
  const horas50 = (horasExtras.cincuenta || 0) * valorHora * 1.5;
  
  return redondearCLP(horas50);
}

/**
 * Calcula el total de bonos
 */
function calcularBonos(input: SueldoInput): number {
  if (!input.bonos) return 0;
  
  const total = Object.values(input.bonos).reduce((sum, valor) => {
    return sum + (typeof valor === 'number' ? valor : 0);
  }, 0);
  
  return redondearCLP(total);
}

/**
 * Calcula todos los valores imponibles
 */
export function calcularImponible(input: SueldoInput, parametros: ParametrosSueldo): CalculoImponible {
  if (typeof input.sueldoBase !== 'number' || typeof parametros.valorUf !== 'number') {
    return {
      sueldoBase: 0,
      descuentoDiasAusencia: 0,
      sueldoBaseAjustado: 0,
      gratificacionLegal: 0,
      horasExtras: 0,
      comisiones: 0,
      bonos: 0,
      total: 0,
      topeAplicado: 0
    };
  }
  
  const sueldoBase = redondearCLP(input.sueldoBase);
  
  // Calcular descuento por días de ausencia
  const descuentoDiasAusencia = calcularDescuentoDiasAusencia(sueldoBase, input.diasAusencia);
  
  // Sueldo base ajustado (después de descontar días de ausencia)
  const sueldoBaseAjustado = redondearCLP(sueldoBase - descuentoDiasAusencia);
  
  // Calcular horas extras basado en el sueldo base ajustado
  const horasExtras = calcularHorasExtras(sueldoBaseAjustado, parametros, input.horasExtras);
  const comisiones = redondearCLP(input.comisiones || 0);
  const bonos = calcularBonos(input);
  
  // Calcular gratificación legal sobre el sueldo base (25%)
  const gratificacionLegal = calcularGratificacionLegal(sueldoBaseAjustado);
  
  // Calcular total imponible bruto (incluyendo gratificación)
  const totalImponibleBruto = sueldoBaseAjustado + gratificacionLegal + horasExtras + comisiones + bonos;
  
  // Calcular total antes del tope
  const totalAntesTope = totalImponibleBruto + gratificacionLegal;
  
  // Aplicar tope imponible
  const topeImponible = parametros.ufTopeImponible * parametros.valorUf;
  const topeAplicado = Math.max(0, totalAntesTope - topeImponible);
  const total = redondearCLP(Math.min(totalAntesTope, topeImponible));
  
  return {
    sueldoBase,
    descuentoDiasAusencia,
    sueldoBaseAjustado,
    gratificacionLegal,
    horasExtras,
    comisiones,
    bonos,
    total,
    topeAplicado
  };
}
