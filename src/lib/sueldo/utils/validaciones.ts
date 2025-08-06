import { SueldoInput, SueldoError } from '../tipos/sueldo';

export function validarSueldoInput(input: SueldoInput): void {
  // Validar sueldo base
  if (!input.sueldoBase || input.sueldoBase <= 0) {
    throw new SueldoError(
      'El sueldo base debe ser mayor a 0',
      'SUELDO_BASE_INVALIDO',
      { sueldoBase: input.sueldoBase }
    );
  }

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

  // Validar mutualidad
  if (!input.mutualidad || input.mutualidad.trim() === '') {
    throw new SueldoError(
      'La mutualidad es requerida',
      'MUTUALIDAD_REQUERIDA',
      { mutualidad: input.mutualidad }
    );
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

  // Validar ISAPRE
  if (input.isapre) {
    if (input.isapre.plan <= 0) {
      throw new SueldoError(
        'El plan ISAPRE debe ser mayor a 0',
        'PLAN_ISAPRE_INVALIDO',
        { isapre: input.isapre }
      );
    }
  }
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

  if (!parametros.tasaMutualidad || parametros.tasaMutualidad < 0) {
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
