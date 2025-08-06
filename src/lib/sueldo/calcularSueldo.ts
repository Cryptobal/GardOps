import { SueldoInput, SueldoResultado, ParametrosSueldo, SueldoError } from './tipos/sueldo';
import { validarSueldoInput, validarParametros } from './utils/validaciones';
import { redondearObjetoCLP } from './utils/redondeo';
import { calcularImponible } from './calculos/imponible';
import { calcularCotizaciones } from './calculos/cotizaciones';
import { calcularImpuestoUnico } from './calculos/impuesto';
import { calcularEmpleador } from './calculos/empleador';

/**
 * Obtiene los parámetros desde la base de datos
 */
async function obtenerParametros(input: SueldoInput): Promise<ParametrosSueldo> {
  try {
    // TODO: Implementar consultas a la base de datos
    // Por ahora usamos valores de ejemplo
    
    const fechaPrimerDia = new Date(input.fecha.getFullYear(), input.fecha.getMonth(), 1);
    
    // Simular consultas a la base de datos
    const parametros: ParametrosSueldo = {
      ufTopeImponible: 87.8, // UF_TOPE_IMPONIBLE
      valorUf: 35000, // Valor UF para el primer día del mes
      comisionAfp: 1.44, // Comisión según AFP
      tasaMutualidad: 0.93, // Tasa según mutualidad
      tramosImpuesto: [
        { desde: 0, hasta: 1500000, factor: 0, rebaja: 0 },
        { desde: 1500000, hasta: 2500000, factor: 0.04, rebaja: 60000 },
        { desde: 2500000, hasta: 3500000, factor: 0.08, rebaja: 160000 },
        { desde: 3500000, hasta: 4500000, factor: 0.135, rebaja: 327500 },
        { desde: 4500000, hasta: 5500000, factor: 0.23, rebaja: 765000 },
        { desde: 5500000, hasta: 7500000, factor: 0.304, rebaja: 1156500 },
        { desde: 7500000, hasta: 10000000, factor: 0.35, rebaja: 1656500 },
        { desde: 10000000, hasta: null, factor: 0.4, rebaja: 2156500 }
      ]
    };
    
    return parametros;
  } catch (error) {
    throw new SueldoError(
      'Error al obtener parámetros desde la base de datos',
      'ERROR_PARAMETROS',
      { error: error instanceof Error ? error.message : 'Error desconocido' }
    );
  }
}

/**
 * Calcula los valores no imponibles
 */
function calcularNoImponible(input: SueldoInput) {
  const noImponible = input.noImponible || {};
  
  return {
    colacion: noImponible.colacion || 0,
    movilizacion: noImponible.movilizacion || 0,
    viatico: noImponible.viatico || 0,
    desgaste: noImponible.desgaste || 0,
    asignacionFamiliar: noImponible.asignacionFamiliar || 0,
    total: (noImponible.colacion || 0) + 
           (noImponible.movilizacion || 0) + 
           (noImponible.viatico || 0) + 
           (noImponible.desgaste || 0) + 
           (noImponible.asignacionFamiliar || 0)
  };
}

/**
 * Calcula los descuentos
 */
function calcularDescuentos(input: SueldoInput) {
  const anticipos = input.anticipos || 0;
  const judiciales = input.judiciales || 0;
  
  return {
    anticipos,
    judiciales,
    total: anticipos + judiciales
  };
}

/**
 * Función principal para calcular el sueldo
 */
export async function calcularSueldo(input: SueldoInput): Promise<SueldoResultado> {
  try {
    // 1. Validar entrada
    validarSueldoInput(input);
    
    // 2. Obtener parámetros desde la base de datos
    const parametros = await obtenerParametros(input);
    validarParametros(parametros);
    
    // 3. Calcular imponible
    const imponible = calcularImponible(input, parametros);
    
    // 4. Calcular no imponible
    const noImponible = calcularNoImponible(input);
    
    // 5. Calcular cotizaciones
    const cotizaciones = calcularCotizaciones(imponible.total, input, parametros);
    
    // 6. Calcular base tributable
    const baseTributable = imponible.total - cotizaciones.afp - cotizaciones.salud - 
                          cotizaciones.afc - (input.apv || 0) - (input.cuenta2 || 0);
    
    // 7. Calcular impuesto único
    const impuesto = calcularImpuestoUnico(baseTributable, parametros);
    
    // 8. Calcular descuentos
    const descuentos = calcularDescuentos(input);
    
    // 9. Calcular sueldo líquido
    const sueldoLiquido = imponible.total + noImponible.total - 
                         (cotizaciones.total + impuesto.impuestoUnico + descuentos.total);
    
    // 10. Calcular costos empleador
    const empleador = calcularEmpleador(imponible.total, noImponible.total, input, parametros);
    
    // 11. Construir resultado
    const resultado: SueldoResultado = {
      entrada: input,
      imponible,
      noImponible,
      cotizaciones,
      impuesto,
      descuentos,
      sueldoLiquido,
      empleador,
      parametros: {
        ufTopeImponible: parametros.ufTopeImponible,
        valorUf: parametros.valorUf,
        comisionAfp: parametros.comisionAfp,
        tasaMutualidad: parametros.tasaMutualidad
      }
    };
    
    // 12. Redondear todos los valores
    return redondearObjetoCLP(resultado);
    
  } catch (error) {
    if (error instanceof SueldoError) {
      throw error;
    }
    
    throw new SueldoError(
      'Error inesperado en el cálculo de sueldo',
      'ERROR_CALCULO',
      { error: error instanceof Error ? error.message : 'Error desconocido' }
    );
  }
}
