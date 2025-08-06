import { SueldoInput, ParametrosSueldo } from '../tipos/sueldo';
import { redondearCLP } from '../utils/redondeo';

export interface CalculoCotizaciones {
  afp: number;
  salud: number;
  afc: number;
  total: number;
}

/**
 * Calcula la cotización AFP (10% + comisión)
 */
function calcularAFP(imponible: number, comisionAfp: number): number {
  const cotizacionBase = imponible * 0.10;
  const comision = imponible * (comisionAfp / 100);
  
  return redondearCLP(cotizacionBase + comision);
}

/**
 * Calcula la cotización de salud
 */
function calcularSalud(
  imponible: number, 
  input: SueldoInput, 
  parametros: ParametrosSueldo
): number {
  // Si tiene ISAPRE, usar el plan ISAPRE
  if (input.isapre) {
    const cotizacionIsapre = parametros.valorUf * input.isapre.plan;
    return redondearCLP(cotizacionIsapre);
  }
  
  // Si no tiene ISAPRE, usar FONASA (7%)
  const cotizacionFonasa = imponible * 0.07;
  return redondearCLP(cotizacionFonasa);
}

/**
 * Calcula la cotización AFC (0.6% solo para contratos indefinidos)
 */
function calcularAFC(imponible: number, tipoContrato: string): number {
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
  const afp = calcularAFP(imponible, parametros.comisionAfp);
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
