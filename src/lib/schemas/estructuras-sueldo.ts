export interface EstructuraSueldo {
  id: string;
  rol_id: string;
  rol_nombre?: string;
  nombre: string;
  descripcion?: string;
  sueldo_base: number;
  bonificacion_nocturna?: number;
  bonificacion_festivo?: number;
  bonificacion_riesgo?: number;
  bonificacion_zona?: number;
  bonificacion_especialidad?: number;
  bonificacion_antiguedad?: number;
  bonificacion_presentismo?: number;
  bonificacion_rendimiento?: number;
  bonificacion_transporte?: number;
  bonificacion_alimentacion?: number;
  bonificacion_otros?: number;
  descuento_afp?: number;
  descuento_salud?: number;
  descuento_impuesto?: number;
  descuento_otros?: number;
  activo: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CrearEstructuraSueldoData {
  rol_id: string;
  nombre: string;
  descripcion?: string;
  sueldo_base: number;
  bonificacion_nocturna?: number;
  bonificacion_festivo?: number;
  bonificacion_riesgo?: number;
  bonificacion_zona?: number;
  bonificacion_especialidad?: number;
  bonificacion_antiguedad?: number;
  bonificacion_presentismo?: number;
  bonificacion_rendimiento?: number;
  bonificacion_transporte?: number;
  bonificacion_alimentacion?: number;
  bonificacion_otros?: number;
  descuento_afp?: number;
  descuento_salud?: number;
  descuento_impuesto?: number;
  descuento_otros?: number;
  activo?: boolean;
  tenantId?: string;
}

export interface ActualizarEstructuraSueldoData {
  rol_id?: string;
  nombre?: string;
  descripcion?: string;
  sueldo_base?: number;
  bonificacion_nocturna?: number;
  bonificacion_festivo?: number;
  bonificacion_riesgo?: number;
  bonificacion_zona?: number;
  bonificacion_especialidad?: number;
  bonificacion_antiguedad?: number;
  bonificacion_presentismo?: number;
  bonificacion_rendimiento?: number;
  bonificacion_transporte?: number;
  bonificacion_alimentacion?: number;
  bonificacion_otros?: number;
  descuento_afp?: number;
  descuento_salud?: number;
  descuento_impuesto?: number;
  descuento_otros?: number;
  activo?: boolean;
  tenantId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  count?: number;
}

export interface OtroBono {
  nombre: string;
  monto: number;
  imponible: boolean;
}

export interface EstructuraSueldoConRol extends EstructuraSueldo {
  rol_nombre: string;
  dias_trabajo: number;
  dias_descanso: number;
  horas_turno: number;
  hora_inicio: string;
  hora_termino: string;
  rol_estado: string;
}

// Función para calcular el total de la estructura
export function calcularTotalEstructura(estructura: EstructuraSueldo): number {
  return (
    estructura.sueldo_base +
    estructura.bono_asistencia +
    estructura.bono_responsabilidad +
    estructura.bono_noche +
    estructura.bono_feriado +
    estructura.bono_riesgo +
    estructura.otros_bonos.reduce((sum, bono) => sum + bono.monto, 0)
  );
}

// Función para calcular el total imponible
export function calcularTotalImponible(estructura: EstructuraSueldo): number {
  return (
    estructura.sueldo_base +
    estructura.bono_asistencia +
    estructura.bono_responsabilidad +
    estructura.bono_noche +
    estructura.bono_feriado +
    estructura.bono_riesgo +
    estructura.otros_bonos
      .filter(bono => bono.imponible)
      .reduce((sum, bono) => sum + bono.monto, 0)
  );
}

// Función para formatear moneda chilena
export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(monto);
}
