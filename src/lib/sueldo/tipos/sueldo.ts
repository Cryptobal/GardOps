export interface SueldoInput {
  sueldoBase: number;
  fecha: Date;
  afp: string;
  tipoSalud?: 'fonasa' | 'isapre';
  horasExtras?: {
    cincuenta: number;
    cien: number;
  };
  bonos?: {
    nocturnidad?: number;
    festivo?: number;
    peligrosidad?: number;
    responsabilidad?: number;
    otros?: number;
  };
  comisiones?: number;
  noImponible?: {
    colacion?: number;
    movilizacion?: number;
    viatico?: number;
    desgaste?: number;
    asignacionFamiliar?: number;
  };
  descuentosVoluntarios?: number;
  anticipos?: number;
  judiciales?: number;
  apv?: number;
  cuenta2?: number;
  cotizacionAdicionalUF?: number; // Cotización adicional en UF (formato 0.4)
  diasAusencia?: number; // Días de ausencia a descontar
  tipoContrato: 'indefinido' | 'plazo_fijo' | 'obra_faena';
  excedenteSalud?: number; // Excedente de salud en UF
}

export interface SueldoResultado {
  // Valores de entrada
  entrada: SueldoInput;
  
  // Cálculos intermedios
  imponible: {
    sueldoBase: number;
    descuentoDiasAusencia: number;
    sueldoBaseAjustado: number;
    gratificacionLegal: number;
    horasExtras: number;
    comisiones: number;
    bonos: number;
    total: number;
    topeAplicado: number;
  };
  
  noImponible: {
    colacion: number;
    movilizacion: number;
    viatico: number;
    desgaste: number;
    asignacionFamiliar: number;
    total: number;
  };
  
  cotizaciones: {
    afp: number;
    salud: number;
    afc: number;
    total: number;
  };
  
  impuesto: {
    baseTributable: number;
    tramo: number;
    factor: number;
    rebaja: number;
    impuestoUnico: number;
  };
  
  descuentos: {
    anticipos: number;
    judiciales: number;
    total: number;
  };
  
  // Resultados finales
  sueldoLiquido: number;
  
  // Cálculo empleador
  empleador: {
    sis: number;
    afc: number;
    mutual: number;
    reformaPrevisional: number;
    costoTotal: number;
  };
  
  // Parámetros utilizados
  parametros: {
    ufTopeImponible: number;
    valorUf: number;
    comisionAfp: number;
    tasaMutualidad?: number; // Opcional, solo para cálculo del empleador
    horasSemanalesJornada: number; // Nueva propiedad para jornada semanal
  };
}

export interface ParametrosSueldo {
  ufTopeImponible: number;
  valorUf: number;
  comisionAfp: number;
  tasaMutualidad?: number; // Solo para cálculo del empleador, opcional
  tasaSis: number; // Tasa del SIS desde la base de datos
  horasSemanalesJornada: number; // Nueva propiedad para jornada semanal
  tramosImpuesto: Array<{
    desde: number;
    hasta: number | null;
    factor: number;
    rebaja: number;
  }>;
}

export class SueldoError extends Error {
  constructor(
    message: string, 
    public codigo: string,
    public detalles?: any
  ) {
    super(message);
    this.name = 'SueldoError';
  }
}
