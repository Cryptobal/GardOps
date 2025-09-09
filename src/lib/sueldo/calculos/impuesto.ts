import { ParametrosSueldo } from '../tipos/sueldo';
import { redondearCLP } from '../utils/redondeo';

export interface CalculoImpuesto {
  baseTributable: number;
  tramo: number;
  factor: number;
  rebaja: number;
  impuestoUnico: number;
}

/**
 * Encuentra el tramo de impuesto correspondiente a la base tributable
 */
function encontrarTramo(baseTributable: number, tramosImpuesto: Array<{
  desde: number;
  hasta: number | null;
  factor: number;
  rebaja: number;
}>): {
  desde: number;
  hasta: number | null;
  factor: number;
  rebaja: number;
  numero: number;
} {
  for (let i = 0; i < tramosImpuesto.length; i++) {
    const tramo = tramosImpuesto[i];
    const desde = tramo.desde;
    const hasta = tramo.hasta || Infinity;
    
    if (baseTributable >= desde && baseTributable <= hasta) {
      return {
        ...tramo,
        numero: i + 1
      };
    }
  }
  
  // Si no encuentra tramo, usar el último
  const ultimoTramo = tramosImpuesto[tramosImpuesto.length - 1];
  return {
    ...ultimoTramo,
    numero: tramosImpuesto.length
  };
}

/**
 * Calcula el impuesto único según la base tributable
 */
export function calcularImpuestoUnico(
  baseTributable: number, 
  parametros: ParametrosSueldo
): CalculoImpuesto {
  if (typeof baseTributable !== 'number' || !parametros.tramosImpuesto || parametros.tramosImpuesto.length === 0) {
    return {
      baseTributable: 0,
      tramo: 1,
      factor: 0,
      rebaja: 0,
      impuestoUnico: 0
    };
  }
  
  const tramo = encontrarTramo(baseTributable, parametros.tramosImpuesto);
  
  // Calcular impuesto: base * factor - rebaja
  const impuestoCalculado = (baseTributable * tramo.factor) - tramo.rebaja;
  const impuestoUnico = redondearCLP(Math.max(0, impuestoCalculado));
  
  return {
    baseTributable: redondearCLP(baseTributable),
    tramo: tramo.numero,
    factor: tramo.factor,
    rebaja: redondearCLP(tramo.rebaja),
    impuestoUnico
  };
}
