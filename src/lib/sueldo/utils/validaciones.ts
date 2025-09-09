import { SueldoInput, SueldoError } from '../tipos/sueldo';

/**
 * Validaciones especiales según normativa chilena 2025
 */
export const LIMITES_LEGALES = {
  SUELDO_MINIMO: 529000, // Ingreso mínimo 2025
  SUELDO_MAXIMO_IMPONIBLE: 3436982, // 87.8 UF aprox con UF a $39,100
  HORAS_EXTRAS_MAX_MES: 60, // Máximo legal de horas extras al mes
  TOPE_GRATIFICACION_MENSUAL: 209396, // Tope mensual gratificación
  TOPE_COLACION_MOVILIZACION_EXENTO: 100000, // Aproximado para exención tributaria
  PORCENTAJE_MAX_DESCUENTOS: 0.45, // Máximo 45% del sueldo puede ser descontado
  PORCENTAJE_MIN_LIQUIDO: 0.30 // Mínimo 30% del sueldo debe quedar líquido
};

/**
 * Valida que el sueldo cumpla con los mínimos legales
 */
function validarSueldoMinimo(sueldoBase: number): void {
  if (sueldoBase < LIMITES_LEGALES.SUELDO_MINIMO) {
    console.warn(
      `⚠️ Advertencia: El sueldo base ($${sueldoBase}) es menor al ingreso mínimo legal ($${LIMITES_LEGALES.SUELDO_MINIMO})`
    );
  }
}

/**
 * Valida que las horas extras no excedan el límite legal
 */
function validarHorasExtrasLegales(horasExtras?: { cincuenta: number; cien: number }): void {
  if (!horasExtras) return;
  
  const totalHoras = (horasExtras.cincuenta || 0) + (horasExtras.cien || 0);
  
  if (totalHoras > LIMITES_LEGALES.HORAS_EXTRAS_MAX_MES) {
    throw new SueldoError(
      `Las horas extras (${totalHoras}) exceden el máximo legal de ${LIMITES_LEGALES.HORAS_EXTRAS_MAX_MES} horas al mes`,
      'HORAS_EXTRAS_EXCEDEN_LIMITE',
      { horasExtras, limite: LIMITES_LEGALES.HORAS_EXTRAS_MAX_MES }
    );
  }
}

/**
 * Valida que los descuentos no excedan los límites legales
 */
function validarDescuentosLegales(input: SueldoInput): void {
  const sueldoBase = input.sueldoBase;
  const totalDescuentos = (input.anticipos || 0) + 
                          (input.judiciales || 0) + 
                          (input.descuentosVoluntarios || 0) +
                          (input.apv || 0) +
                          (input.cuenta2 || 0);
  
  const porcentajeDescuentos = totalDescuentos / sueldoBase;
  
  if (porcentajeDescuentos > LIMITES_LEGALES.PORCENTAJE_MAX_DESCUENTOS) {
    console.warn(
      `⚠️ Advertencia: Los descuentos totales (${(porcentajeDescuentos * 100).toFixed(1)}%) ` +
      `exceden el límite recomendado de ${LIMITES_LEGALES.PORCENTAJE_MAX_DESCUENTOS * 100}%`
    );
  }
}

/**
 * Valida los valores no imponibles
 */
function validarNoImponiblesLegales(noImponible?: any): void {
  if (!noImponible) return;
  
  const totalColacionMovilizacion = (noImponible.colacion || 0) + 
                                    (noImponible.movilizacion || 0);
  
  if (totalColacionMovilizacion > LIMITES_LEGALES.TOPE_COLACION_MOVILIZACION_EXENTO) {
    console.warn(
      `⚠️ Advertencia: Colación + Movilización ($${totalColacionMovilizacion}) ` +
      `podría estar sujeto a impuestos si excede el límite de exención`
    );
  }
}

export function validarSueldoInput(input: SueldoInput): void {
  // Validar sueldo base
  if (!input.sueldoBase || input.sueldoBase <= 0) {
    throw new SueldoError(
      'El sueldo base debe ser mayor a 0',
      'SUELDO_BASE_INVALIDO',
      { sueldoBase: input.sueldoBase }
    );
  }
  
  // Validaciones adicionales según normativa
  validarSueldoMinimo(input.sueldoBase);
  validarHorasExtrasLegales(input.horasExtras);
  validarDescuentosLegales(input);
  validarNoImponiblesLegales(input.noImponible);

  // Validar fecha
  if (!input.fecha || isNaN(input.fecha.getTime())) {
    throw new SueldoError(
      'La fecha debe ser válida',
      'FECHA_INVALIDA',
      { fecha: input.fecha }
    );
  }

  // Validar AFP
  if (!input.afp || input.afp.trim() === '') {
    throw new SueldoError(
      'La AFP es requerida',
      'AFP_REQUERIDA',
      { afp: input.afp }
    );
  }

  // Validar cotización adicional en UF
  if (input.cotizacionAdicionalUF !== undefined && input.cotizacionAdicionalUF < 0) {
    throw new SueldoError(
      'La cotización adicional en UF no puede ser negativa',
      'COTIZACION_ADICIONAL_NEGATIVA',
      { cotizacionAdicionalUF: input.cotizacionAdicionalUF }
    );
  }

  // Validar días de ausencia
  if (input.diasAusencia !== undefined) {
    if (input.diasAusencia < 0) {
      throw new SueldoError(
        'Los días de ausencia no pueden ser negativos',
        'DIAS_AUSENCIA_NEGATIVOS',
        { diasAusencia: input.diasAusencia }
      );
    }
    if (input.diasAusencia > 30) {
      throw new SueldoError(
        'Los días de ausencia no pueden ser mayores a 30',
        'DIAS_AUSENCIA_EXCEDEN_MES',
        { diasAusencia: input.diasAusencia }
      );
    }
  }

  // Validar tipo de contrato
  if (!input.tipoContrato || !['indefinido', 'plazo_fijo', 'obra_faena'].includes(input.tipoContrato)) {
    throw new SueldoError(
      'El tipo de contrato debe ser válido',
      'TIPO_CONTRATO_INVALIDO',
      { tipoContrato: input.tipoContrato }
    );
  }

  // Validar horas extras
  if (input.horasExtras) {
    if (input.horasExtras.cincuenta < 0 || input.horasExtras.cien < 0) {
      throw new SueldoError(
        'Las horas extras no pueden ser negativas',
        'HORAS_EXTRAS_NEGATIVAS',
        { horasExtras: input.horasExtras }
      );
    }
  }

  // Validar bonos
  if (input.bonos) {
    const bonosNegativos = Object.entries(input.bonos).filter(([_, valor]) => valor && valor < 0);
    if (bonosNegativos.length > 0) {
      throw new SueldoError(
        'Los bonos no pueden ser negativos',
        'BONOS_NEGATIVOS',
        { bonos: input.bonos }
      );
    }
  }

  // Validar no imponible
  if (input.noImponible) {
    const noImponibleNegativo = Object.entries(input.noImponible).filter(([_, valor]) => valor && valor < 0);
    if (noImponibleNegativo.length > 0) {
      throw new SueldoError(
        'Los valores no imponibles no pueden ser negativos',
        'NO_IMPONIBLE_NEGATIVO',
        { noImponible: input.noImponible }
      );
    }
  }

  // Validar descuentos
  if (input.anticipos && input.anticipos < 0) {
    throw new SueldoError(
      'Los anticipos no pueden ser negativos',
      'ANTICIPOS_NEGATIVOS',
      { anticipos: input.anticipos }
    );
  }

  if (input.judiciales && input.judiciales < 0) {
    throw new SueldoError(
      'Los descuentos judiciales no pueden ser negativos',
      'JUDICIALES_NEGATIVOS',
      { judiciales: input.judiciales }
    );
  }

  // La validación de ISAPRE ya no es necesaria porque se usa cotización adicional en UF
}

export function validarParametros(parametros: any): void {
  if (!parametros.valorUf || parametros.valorUf <= 0) {
    throw new SueldoError(
      'El valor UF no puede ser 0 o negativo',
      'VALOR_UF_INVALIDO',
      { valorUf: parametros.valorUf }
    );
  }

  if (!parametros.ufTopeImponible || parametros.ufTopeImponible <= 0) {
    throw new SueldoError(
      'El tope UF imponible no puede ser 0 o negativo',
      'TOPE_UF_INVALIDO',
      { ufTopeImponible: parametros.ufTopeImponible }
    );
  }

  if (!parametros.comisionAfp || parametros.comisionAfp < 0) {
    throw new SueldoError(
      'La comisión AFP no puede ser negativa',
      'COMISION_AFP_INVALIDA',
      { comisionAfp: parametros.comisionAfp }
    );
  }

  // La tasa de mutualidad es opcional ahora
  if (parametros.tasaMutualidad !== undefined && parametros.tasaMutualidad < 0) {
    throw new SueldoError(
      'La tasa de mutualidad no puede ser negativa',
      'TASA_MUTUALIDAD_INVALIDA',
      { tasaMutualidad: parametros.tasaMutualidad }
    );
  }

  if (!parametros.tramosImpuesto || parametros.tramosImpuesto.length === 0) {
    throw new SueldoError(
      'Los tramos de impuesto son requeridos',
      'TRAMOS_IMPUESTO_REQUERIDOS',
      { tramosImpuesto: parametros.tramosImpuesto }
    );
  }
}
