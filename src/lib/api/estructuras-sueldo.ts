import { EstructuraSueldo, CrearEstructuraSueldoData, ActualizarEstructuraSueldoData, ApiResponse } from '@/lib/schemas/estructuras-sueldo';

export async function getEstructurasSueldo(params?: { activo?: boolean; tenantId?: string; rolId?: string }): Promise<EstructuraSueldo[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.activo !== undefined) {
      searchParams.append('activo', params.activo.toString());
    }
    if (params?.tenantId) {
      searchParams.append('tenantId', params.tenantId);
    }
    if (params?.rolId) {
      searchParams.append('rolId', params.rolId);
    }

    const url = `/api/estructuras-sueldo${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo estructuras de sueldo: ${response.statusText}`);
    }

    const result: ApiResponse<EstructuraSueldo[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error obteniendo estructuras de sueldo');
    }

    return result.data;
  } catch (error) {
    console.error('Error obteniendo estructuras de sueldo:', error);
    throw error;
  }
}

export async function getEstructuraSueldoById(id: string, tenantId?: string): Promise<EstructuraSueldo> {
  try {
    const searchParams = new URLSearchParams();
    if (tenantId) {
      searchParams.append('tenantId', tenantId);
    }

    const url = `/api/estructuras-sueldo/${id}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo estructura de sueldo: ${response.statusText}`);
    }

    const result: ApiResponse<EstructuraSueldo> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error obteniendo estructura de sueldo');
    }

    return result.data;
  } catch (error) {
    console.error('Error obteniendo estructura de sueldo:', error);
    throw error;
  }
}

export async function getEstructurasSueldoByRol(rolId: string, params?: { activo?: boolean; tenantId?: string }): Promise<EstructuraSueldo[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.activo !== undefined) {
      searchParams.append('activo', params.activo.toString());
    }
    if (params?.tenantId) {
      searchParams.append('tenantId', params.tenantId);
    }

    const url = `/api/estructuras-sueldo/rol/${rolId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo estructuras de sueldo por rol: ${response.statusText}`);
    }

    const result: ApiResponse<EstructuraSueldo[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error obteniendo estructuras de sueldo por rol');
    }

    return result.data;
  } catch (error) {
    console.error('Error obteniendo estructuras de sueldo por rol:', error);
    throw error;
  }
}

export async function crearEstructuraSueldo(data: CrearEstructuraSueldoData): Promise<EstructuraSueldo> {
  try {
    const response = await fetch('/api/estructuras-sueldo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error creando estructura de sueldo: ${response.statusText}`);
    }

    const result: ApiResponse<EstructuraSueldo> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error creando estructura de sueldo');
    }

    return result.data;
  } catch (error) {
    console.error('Error creando estructura de sueldo:', error);
    throw error;
  }
}

export async function actualizarEstructuraSueldo(id: string, data: ActualizarEstructuraSueldoData): Promise<EstructuraSueldo> {
  try {
    const response = await fetch(`/api/estructuras-sueldo/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error actualizando estructura de sueldo: ${response.statusText}`);
    }

    const result: ApiResponse<EstructuraSueldo> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error actualizando estructura de sueldo');
    }

    return result.data;
  } catch (error) {
    console.error('Error actualizando estructura de sueldo:', error);
    throw error;
  }
}

export async function eliminarEstructuraSueldo(id: string, tenantId?: string): Promise<void> {
  try {
    const searchParams = new URLSearchParams();
    if (tenantId) {
      searchParams.append('tenantId', tenantId);
    }

    const url = `/api/estructuras-sueldo/${id}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error eliminando estructura de sueldo: ${response.statusText}`);
    }

    const result: ApiResponse<any> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error eliminando estructura de sueldo');
    }
  } catch (error) {
    console.error('Error eliminando estructura de sueldo:', error);
    throw error;
  }
}

export async function toggleEstructuraSueldoActivo(id: string, activo: boolean, tenantId?: string): Promise<EstructuraSueldo> {
  try {
    const searchParams = new URLSearchParams();
    if (tenantId) {
      searchParams.append('tenantId', tenantId);
    }

    const url = `/api/estructuras-sueldo/${id}/toggle-activo${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ activo }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error cambiando estado de la estructura de sueldo: ${response.statusText}`);
    }

    const result: ApiResponse<EstructuraSueldo> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error cambiando estado de la estructura de sueldo');
    }

    return result.data;
  } catch (error) {
    console.error('Error cambiando estado de la estructura de sueldo:', error);
    throw error;
  }
}

// Nueva función para inactivar estructura de servicio independientemente
export async function inactivarEstructuraServicio(
  id: string,
  motivo?: string,
  usuario_id?: string,
  crear_nueva_automaticamente: boolean = true
): Promise<any> {
  try {
    const response = await fetch(`/api/estructuras-sueldo/${id}/inactivar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        motivo, 
        usuario_id, 
        crear_nueva_automaticamente 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error inactivando estructura de servicio: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error inactivando estructura de servicio');
    }

    return result;
  } catch (error) {
    console.error('Error inactivando estructura de servicio:', error);
    throw error;
  }
}
