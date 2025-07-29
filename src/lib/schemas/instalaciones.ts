export interface Instalacion {
  id: string;
  tenant_id: string;
  cliente_id?: string;
  nombre: string;
  direccion: string;
  codigo?: string;
  tipo?: 'residencial' | 'comercial' | 'industrial' | 'institucional';
  telefono?: string;
  observaciones?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
  activo: boolean;
  creado_en: Date;
  actualizado_en?: Date;
}

export interface CreateInstalacionRequest {
  cliente_id?: string;
  nombre: string;
  direccion: string;
  codigo?: string;
  tipo?: 'residencial' | 'comercial' | 'industrial' | 'institucional';
  telefono?: string;
  observaciones?: string;
  coordenadas_lat?: number;
  coordenadas_lng?: number;
}

export interface UpdateInstalacionRequest extends Partial<CreateInstalacionRequest> {
  activo?: boolean;
}

export interface InstalacionResponse {
  instalacion: Instalacion;
  cliente?: {
    id: string;
    nombre: string;
  };
  guardias_count?: number;
}

export interface InstalacionesListResponse {
  instalaciones: InstalacionResponse[];
  total: number;
  page: number;
  limit: number;
} 