export interface SueldoInput {
  sueldoBase: number;
  fecha: Date;
  afp: string;
  mutualidad: string;
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
  isapre?: {
    plan: number;
    monto?: number;
  };
  tipoContrato: 'indefinido' | 'plazo_fijo' | 'obra_faena';
}

export interface SueldoResultado {
  // Valores de entrada
  entrada: SueldoInput;
  
  // Cálculos intermedios
  imponible: {
    sueldoBase: number;
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
    tasaMutualidad: number;
  };
}

export interface ParametrosSueldo {
  ufTopeImponible: number;
  valorUf: number;
  comisionAfp: number;
  tasaMutualidad: number;
  tramosImpuesto: Array<{
    desde: number;
    hasta: number;
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
