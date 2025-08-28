import { SueldoInput, SueldoResultado, ParametrosSueldo, SueldoError } from './tipos/sueldo';
import { validarSueldoInput, validarParametros } from './utils/validaciones';
import { redondearObjetoCLP } from './utils/redondeo';
import { calcularImponible } from './calculos/imponible';
import { calcularCotizaciones } from './calculos/cotizaciones';
import { calcularImpuestoUnico } from './calculos/impuesto';
import { calcularEmpleador } from './calculos/empleador';
import { sql } from '@vercel/postgres';

/**
 * Obtiene los parámetros desde la base de datos
 */
async function obtenerParametros(input: SueldoInput): Promise<ParametrosSueldo> {
  try {
    const fechaPrimerDia = new Date(input.fecha.getFullYear(), input.fecha.getMonth(), 1);
    
    // 1. Obtener valor UF para el mes
    const resultUF = await sql`
      SELECT valor FROM sueldo_valor_uf 
      WHERE fecha = ${fechaPrimerDia.toISOString().split('T')[0]}
      LIMIT 1
    `;
    
    let valorUf = 38000; // Valor por defecto
    if (resultUF.rows.length > 0) {
      valorUf = Number(resultUF.rows[0].valor);
    } else {
      // Si no hay valor exacto, buscar el más cercano anterior
      const resultUFCercano = await sql`
        SELECT valor FROM sueldo_valor_uf 
        WHERE fecha <= ${fechaPrimerDia.toISOString().split('T')[0]}
        ORDER BY fecha DESC
        LIMIT 1
      `;
      if (resultUFCercano.rows.length > 0) {
        valorUf = Number(resultUFCercano.rows[0].valor);
      }
    }
    
    // 2. Obtener tope imponible y otros parámetros generales
    const resultParametros = await sql`
      SELECT parametro, valor FROM sueldo_parametros_generales 
      ORDER BY id
    `;
    
    const parametrosMap: { [key: string]: number } = {};
    resultParametros.rows.forEach((row: any) => {
      parametrosMap[row.parametro] = Number(row.valor);
    });
    
    // 3. Obtener jornada semanal según fecha
    const resultJornada = await sql`
      SELECT valor 
      FROM sueldo_parametros_generales 
      WHERE parametro = 'HORAS_SEMANALES_JORNADA' 
      ORDER BY id DESC 
      LIMIT 1
    `;
    
    let horasSemanalesJornada = 44; // Default: 44 horas desde abril 2024
    if (resultJornada.rows.length > 0) {
      horasSemanalesJornada = Number(resultJornada.rows[0].valor);
    }
    
    // 4. Obtener tasa de mutualidad (solo para cálculo del empleador)
    // Se usa una tasa default del 0.90% ya que no viene del input
    let tasaMutualidad = 0.90; // Default para cálculo del empleador
    
    // 5. Obtener tasa AFP
    let comisionAfp = 11.44; // Default
    if (input.afp) {
      const resultAFP = await sql`
        SELECT tasa FROM sueldo_afp 
        WHERE codigo = ${input.afp.toLowerCase()}
        LIMIT 1
      `;
      if (resultAFP.rows.length > 0) {
        comisionAfp = Number(resultAFP.rows[0].tasa);
      }
    }
    
    // 6. Obtener tramos de impuesto
    const resultTramos = await sql`
      SELECT tramo, desde, hasta, factor, rebaja 
      FROM sueldo_tramos_impuesto 
      ORDER BY tramo ASC
    `;
    
    const tramosImpuesto = resultTramos.rows.map((row: any) => ({
      desde: Number(row.desde),
      hasta: row.hasta ? Number(row.hasta) : null,
      factor: Number(row.factor),
      rebaja: Number(row.rebaja)
    }));
    
    // Si no hay tramos en BD, usar los valores por defecto
    const tramosFinales = tramosImpuesto.length > 0 ? tramosImpuesto : [
      { desde: 0, hasta: 1500000, factor: 0, rebaja: 0 },
      { desde: 1500000, hasta: 2500000, factor: 0.04, rebaja: 60000 },
      { desde: 2500000, hasta: 3500000, factor: 0.08, rebaja: 160000 },
      { desde: 3500000, hasta: 4500000, factor: 0.135, rebaja: 327500 },
      { desde: 4500000, hasta: 5500000, factor: 0.23, rebaja: 765000 },
      { desde: 5500000, hasta: 7500000, factor: 0.304, rebaja: 1156500 },
      { desde: 7500000, hasta: 10000000, factor: 0.35, rebaja: 1656500 },
      { desde: 10000000, hasta: null, factor: 0.4, rebaja: 2156500 }
    ];
    
    const parametros: ParametrosSueldo = {
      ufTopeImponible: parametrosMap['UF_TOPE_IMPONIBLE'] || 87.8,
      valorUf: valorUf,
      comisionAfp: comisionAfp,
      tasaMutualidad: tasaMutualidad, // Es opcional, puede ser undefined
      tasaSis: parametrosMap['TASA_SIS'] || 0.02, // Tasa SIS desde la base de datos
      tramosImpuesto: tramosFinales,
      horasSemanalesJornada: horasSemanalesJornada
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
  
  const colacion = typeof noImponible.colacion === 'number' ? noImponible.colacion : 0;
  const movilizacion = typeof noImponible.movilizacion === 'number' ? noImponible.movilizacion : 0;
  const viatico = typeof noImponible.viatico === 'number' ? noImponible.viatico : 0;
  const desgaste = typeof noImponible.desgaste === 'number' ? noImponible.desgaste : 0;
  const asignacionFamiliar = typeof noImponible.asignacionFamiliar === 'number' ? noImponible.asignacionFamiliar : 0;
  
  return {
    colacion,
    movilizacion,
    viatico,
    desgaste,
    asignacionFamiliar,
    total: colacion + movilizacion + viatico + desgaste + asignacionFamiliar
  };
}

/**
 * Calcula los descuentos
 */
function calcularDescuentos(input: SueldoInput) {
  const anticipos = typeof input.anticipos === 'number' ? input.anticipos : 0;
  const judiciales = typeof input.judiciales === 'number' ? input.judiciales : 0;
  
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
        tasaMutualidad: parametros.tasaMutualidad,
        horasSemanalesJornada: parametros.horasSemanalesJornada
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
