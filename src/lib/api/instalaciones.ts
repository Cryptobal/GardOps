import { 
  Instalacion, 
  CreateInstalacionRequest, 
  UpdateInstalacionRequest, 
  InstalacionResponse, 
  InstalacionesListResponse 
} from '../schemas/instalaciones';

const API_BASE_URL = '/api/instalaciones';

export async function getInstalaciones(params?: {
  page?: number;
  limit?: number;
  search?: string;
  cliente_id?: string;
  tipo?: string;
}): Promise<InstalacionesListResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.search) searchParams.set('search', params.search);
  if (params?.cliente_id) searchParams.set('cliente_id', params.cliente_id);
  if (params?.tipo) searchParams.set('tipo', params.tipo);

  const response = await fetch(`${API_BASE_URL}?${searchParams.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error obteniendo instalaciones');
  }
  
  return response.json();
}

export async function getInstalacion(id: string): Promise<InstalacionResponse> {
  const response = await fetch(`${API_BASE_URL}/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error obteniendo instalación');
  }
  
  return response.json();
}

export async function createInstalacion(data: CreateInstalacionRequest): Promise<InstalacionResponse> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error creando instalación');
  }
  
  return response.json();
}

export async function updateInstalacion(id: string, data: UpdateInstalacionRequest): Promise<InstalacionResponse> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error actualizando instalación');
  }
  
  return response.json();
}

export async function deleteInstalacion(id: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error eliminando instalación');
  }
  
  return response.json();
} 