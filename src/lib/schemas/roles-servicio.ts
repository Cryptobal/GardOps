export interface RolServicio {
  id: string;
  nombre: string; // Calculado automáticamente
  descripcion?: string;
  dias_trabajo: number;
  dias_descanso: number;
  horas_turno: number; // Calculado automáticamente (compatibilidad)
  hora_inicio: string; // Horario fijo (compatibilidad)
  hora_termino: string; // Horario fijo (compatibilidad)
  estado: "Activo" | "Inactivo";
  tenant_id: string;
  created_at: string;
  updated_at: string;
  fecha_inactivacion?: string;
  
  // Nuevos campos para series
  tiene_horarios_variables?: boolean;
  duracion_ciclo_dias?: number;
  horas_turno_promedio?: number;
  
  // Series de días (opcional, solo cuando se solicita)
  series_dias?: SerieDia[];
}

export interface SerieDia {
  id?: number;
  posicion_en_ciclo: number;
  es_dia_trabajo: boolean;
  hora_inicio?: string;
  hora_termino?: string;
  horas_turno: number;
  observaciones?: string;
}

export interface CrearRolServicioData {
  dias_trabajo: number;
  dias_descanso: number;
  hora_inicio: string;
  hora_termino: string;
  estado?: "Activo" | "Inactivo";
  tenantId?: string;
  
  // Nuevos campos para series
  tiene_horarios_variables?: boolean;
  series_dias?: SerieDia[];
}

export interface ActualizarRolServicioData {
  dias_trabajo?: number;
  dias_descanso?: number;
  hora_inicio?: string;
  hora_termino?: string;
  descripcion?: string;
  estado?: "Activo" | "Inactivo";
  fecha_inactivacion?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  count?: number;
} 