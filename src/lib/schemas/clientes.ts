export interface Cliente {
  id: string;
  tenant_id: string;
  nombre: string;
  razon_social?: string;
  rut?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto_principal?: string;
  activo: boolean;
  creado_en: Date;
  actualizado_en?: Date;
}

export interface CreateClienteRequest {
  nombre: string;
  razon_social?: string;
  rut?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto_principal?: string;
}

export interface UpdateClienteRequest extends Partial<CreateClienteRequest> {
  activo?: boolean;
}

export interface ClienteResponse {
  cliente: Cliente;
  instalaciones_count?: number;
}

export interface ClientesListResponse {
  clientes: ClienteResponse[];
  total: number;
  page: number;
  limit: number;
} 