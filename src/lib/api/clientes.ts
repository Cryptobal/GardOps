import { 
  Cliente, 
  CreateClienteRequest, 
  UpdateClienteRequest, 
  ClienteResponse, 
  ClientesListResponse 
} from '../schemas/clientes';

const API_BASE_URL = '/api/clientes';

export async function getClientes(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ClientesListResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.search) searchParams.set('search', params.search);

  const response = await fetch(`${API_BASE_URL}?${searchParams.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error obteniendo clientes');
  }
  
  return response.json();
}

export async function getCliente(id: string): Promise<ClienteResponse> {
  const response = await fetch(`${API_BASE_URL}/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error obteniendo cliente');
  }
  
  return response.json();
}

export async function createCliente(data: CreateClienteRequest): Promise<ClienteResponse> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error creando cliente');
  }
  
  return response.json();
}

export async function updateCliente(id: string, data: UpdateClienteRequest): Promise<ClienteResponse> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error actualizando cliente');
  }
  
  return response.json();
}

export async function deleteCliente(id: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error eliminando cliente');
  }
  
  return response.json();
} 