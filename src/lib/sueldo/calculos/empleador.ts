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
 * Calcula el SIS (1.85% del imponible)
 */
function calcularSIS(imponible: number): number {
  return redondearCLP(imponible * 0.0185);
}

/**
 * Calcula el AFC empleador (2.4% para indefinido, 3% para otros)
 */
function calcularAFCEmpleador(imponible: number, tipoContrato: string): number {
  const tasa = tipoContrato === 'indefinido' ? 0.024 : 0.03;
  return redondearCLP(imponible * tasa);
}

/**
 * Calcula la mutualidad empleador
 */
function calcularMutualEmpleador(imponible: number, tasaMutualidad: number): number {
  return redondearCLP(imponible * (tasaMutualidad / 100));
}

/**
 * Calcula la reforma previsional (1% del imponible)
 */
function calcularReformaPrevisional(imponible: number): number {
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
  const sis = calcularSIS(imponible);
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
