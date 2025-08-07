export interface EstructuraSueldo {
  id: string;
  rol_id: string;
  rol_nombre?: string;
  rol_descripcion?: string;
  nombre: string;
  descripcion?: string;
  sueldo_base: number;
  bono_asistencia?: number;
  bono_responsabilidad?: number;
  bono_noche?: number;
  bono_feriado?: number;
  bono_riesgo?: number;
  otros_bonos?: any;
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
  fecha_inactivacion?: string;
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
    (estructura.bono_asistencia || 0) +
    (estructura.bono_responsabilidad || 0) +
    (estructura.bono_noche || 0) +
    (estructura.bono_feriado || 0) +
    (estructura.bono_riesgo || 0) +
    (estructura.otros_bonos && Array.isArray(estructura.otros_bonos) 
      ? estructura.otros_bonos.reduce((sum: number, bono: any) => sum + (bono.monto || 0), 0)
      : 0)
  );
}

// Función para calcular el total imponible
export function calcularTotalImponible(estructura: EstructuraSueldo): number {
  return (
    estructura.sueldo_base +
    (estructura.bono_asistencia || 0) +
    (estructura.bono_responsabilidad || 0) +
    (estructura.bono_noche || 0) +
    (estructura.bono_feriado || 0) +
    (estructura.bono_riesgo || 0) +
    (estructura.otros_bonos && Array.isArray(estructura.otros_bonos)
      ? estructura.otros_bonos
          .filter((bono: any) => bono.imponible)
          .reduce((sum: number, bono: any) => sum + (bono.monto || 0), 0)
      : 0)
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
