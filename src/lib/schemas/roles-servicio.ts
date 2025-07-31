export interface RolServicio {
  id: string;
  nombre: string;
  dias_trabajo: number;
  dias_descanso: number;
  horas_turno: number;
  hora_inicio: string;
  hora_termino: string;
  estado: string;
  tenant_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrearRolServicioData {
  nombre: string;
  dias_trabajo: number;
  dias_descanso: number;
  horas_turno: number;
  hora_inicio: string;
  hora_termino: string;
  estado: string;
}

export interface ActualizarRolServicioData extends CrearRolServicioData {} 