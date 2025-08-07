export interface RolServicio {
  id: string;
  nombre: string; // Calculado automáticamente
  descripcion?: string;
  dias_trabajo: number;
  dias_descanso: number;
  horas_turno: number; // Calculado automáticamente
  hora_inicio: string;
  hora_termino: string;
  estado: "Activo" | "Inactivo";
  tenant_id: string;
  created_at: string;
  updated_at: string;
  fecha_inactivacion?: string;
}

export interface CrearRolServicioData {
  dias_trabajo: number;
  dias_descanso: number;
  hora_inicio: string;
  hora_termino: string;
  estado?: "Activo" | "Inactivo";
  tenantId?: string;
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