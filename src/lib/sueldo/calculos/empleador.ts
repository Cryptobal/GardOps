import { SueldoInput, ParametrosSueldo } from '../tipos/sueldo';
import { redondearCLP } from '../utils/redondeo';

export interface CalculoEmpleador {
  sis: number;
  afc: number;
  mutual: number;
  reformaPrevisional: number;
  costoTotal: number;
}

/**
 * Calcula el SIS usando el parámetro de la base de datos
 */
function calcularSIS(imponible: number, tasaSis: number = 0.02): number {
  if (typeof imponible !== 'number') {
    return 0;
  }
  return redondearCLP(imponible * tasaSis);
}

/**
 * Calcula el AFC empleador (2.4% para indefinido, 3% para otros)
 * Según normativa oficial
 */
function calcularAFCEmpleador(imponible: number, tipoContrato: string): number {
  if (typeof imponible !== 'number' || typeof tipoContrato !== 'string') {
    return 0;
  }
  const tasa = tipoContrato === 'indefinido' ? 0.024 : 0.03;
  return redondearCLP(imponible * tasa);
}

/**
 * Calcula la mutualidad empleador (0.90% aprox. según actividad)
 * Según normativa oficial
 */
function calcularMutualEmpleador(imponible: number, tasaMutualidad?: number): number {
  if (typeof imponible !== 'number') {
    return 0;
  }
  // Usar la tasa proporcionada o 0.90% como default
  const tasa = tasaMutualidad !== undefined && tasaMutualidad > 0 ? tasaMutualidad : 0.90;
  return redondearCLP(imponible * (tasa / 100));
}

/**
 * Calcula la reforma previsional (1% del imponible)
 * Según normativa oficial
 */
function calcularReformaPrevisional(imponible: number): number {
  if (typeof imponible !== 'number') {
    return 0;
  }
  return redondearCLP(imponible * 0.01);
}

/**
 * Calcula todos los costos para el empleador
 */
export function calcularEmpleador(
  imponible: number,
  noImponible: number,
  input: SueldoInput,
  parametros: ParametrosSueldo
): CalculoEmpleador {
  if (typeof imponible !== 'number' || typeof noImponible !== 'number') {
    return {
      sis: 0,
      afc: 0,
      mutual: 0,
      reformaPrevisional: 0,
      costoTotal: 0
    };
  }
  
  const sis = calcularSIS(imponible, parametros.tasaSis);
  const afc = calcularAFCEmpleador(imponible, input.tipoContrato);
  const mutual = calcularMutualEmpleador(imponible, parametros.tasaMutualidad);
  const reformaPrevisional = calcularReformaPrevisional(imponible);
  
  // Costo total = imponible + no imponible + todos los aportes
  const costoTotal = redondearCLP(
    imponible + 
    noImponible + 
    sis + 
    afc + 
    mutual + 
    reformaPrevisional
  );
  
  return {
    sis,
    afc,
    mutual,
    reformaPrevisional,
    costoTotal
  };
}
