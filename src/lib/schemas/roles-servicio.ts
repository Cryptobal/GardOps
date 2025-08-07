export interface RolServicio {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CrearRolServicioData {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  tenantId?: string;
}

export interface ActualizarRolServicioData {
  nombre?: string;
  descripcion?: string;
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