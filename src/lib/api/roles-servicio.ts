import { RolServicio, CrearRolServicioData, ActualizarRolServicioData, ApiResponse } from '@/lib/schemas/roles-servicio';

export async function getRolesServicio(params?: { activo?: boolean; tenantId?: string }): Promise<RolServicio[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.activo !== undefined) {
      searchParams.append('activo', params.activo.toString());
    }
    if (params?.tenantId) {
      searchParams.append('tenantId', params.tenantId);
    }

    const url = `/api/roles-servicio${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo roles de servicio: ${response.statusText}`);
    }

    const result: ApiResponse<RolServicio[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error obteniendo roles de servicio');
    }

    return result.data;
  } catch (error) {
    console.error('Error obteniendo roles de servicio:', error);
    throw error;
  }
}

export async function getRolServicioById(id: string, tenantId?: string): Promise<RolServicio> {
  try {
    const searchParams = new URLSearchParams();
    if (tenantId) {
      searchParams.append('tenantId', tenantId);
    }

    const url = `/api/roles-servicio/${id}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo rol de servicio: ${response.statusText}`);
    }

    const result: ApiResponse<RolServicio> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error obteniendo rol de servicio');
    }

    return result.data;
  } catch (error) {
    console.error('Error obteniendo rol de servicio:', error);
    throw error;
  }
}

export async function crearRolServicio(data: CrearRolServicioData): Promise<RolServicio> {
  try {
    const response = await fetch('/api/roles-servicio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error creando rol de servicio: ${response.statusText}`);
    }

    const result: ApiResponse<RolServicio> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error creando rol de servicio');
    }

    return result.data;
  } catch (error) {
    console.error('Error creando rol de servicio:', error);
    throw error;
  }
}

export async function actualizarRolServicio(id: string, data: ActualizarRolServicioData): Promise<RolServicio> {
  try {
    const response = await fetch(`/api/roles-servicio/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error actualizando rol de servicio: ${response.statusText}`);
    }

    const result: ApiResponse<RolServicio> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error actualizando rol de servicio');
    }

    return result.data;
  } catch (error) {
    console.error('Error actualizando rol de servicio:', error);
    throw error;
  }
}

export async function eliminarRolServicio(id: string, tenantId?: string): Promise<void> {
  try {
    const searchParams = new URLSearchParams();
    if (tenantId) {
      searchParams.append('tenantId', tenantId);
    }

    const url = `/api/roles-servicio/${id}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error eliminando rol de servicio: ${response.statusText}`);
    }

    const result: ApiResponse<any> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error eliminando rol de servicio');
    }
  } catch (error) {
    console.error('Error eliminando rol de servicio:', error);
    throw error;
  }
}

export async function toggleRolServicioActivo(id: string, activo: boolean, tenantId?: string): Promise<RolServicio> {
  try {
    const searchParams = new URLSearchParams();
    if (tenantId) {
      searchParams.append('tenantId', tenantId);
    }

    const url = `/api/roles-servicio/${id}/toggle-activo${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ activo }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error cambiando estado del rol de servicio: ${response.statusText}`);
    }

    const result: ApiResponse<RolServicio> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error cambiando estado del rol de servicio');
    }

    return result.data;
  } catch (error) {
    console.error('Error cambiando estado del rol de servicio:', error);
    throw error;
  }
}

export async function getRolesServicioStats(tenantId?: string): Promise<any> {
  try {
    const searchParams = new URLSearchParams();
    if (tenantId) {
      searchParams.append('tenantId', tenantId);
    }

    const url = `/api/roles-servicio/stats${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo estadísticas: ${response.statusText}`);
    }

    const result: ApiResponse<any> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error obteniendo estadísticas');
    }

    return result.data;
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw error;
  }
}

// Nueva función para inactivar rol de servicio completamente (con liberación de estructuras)
export async function inactivarRolServicioCompleto(
  id: string, 
  motivo?: string, 
  usuario_id?: string
): Promise<any> {
  try {
    const response = await fetch(`/api/roles-servicio/${id}/inactivar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ motivo, usuario_id }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error inactivando rol de servicio: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error inactivando rol de servicio');
    }

    return result;
  } catch (error) {
    console.error('Error inactivando rol de servicio:', error);
    throw error;
  }
}

// Nueva función para reactivar rol de servicio
export async function reactivarRolServicio(id: string): Promise<RolServicio> {
  try {
    const response = await fetch(`/api/roles-servicio/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'reactivar' }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error reactivando rol de servicio: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error reactivando rol de servicio');
    }

    return result.rol;
  } catch (error) {
    console.error('Error reactivando rol de servicio:', error);
    throw error;
  }
}

// Nueva función para crear nueva estructura de servicio
export async function crearNuevaEstructuraServicio(
  rolId: string,
  data: {
    sueldo_base?: number;
    bono_asistencia?: number;
    bono_responsabilidad?: number;
    bono_noche?: number;
    bono_feriado?: number;
    bono_riesgo?: number;
    otros_bonos?: any[];
    motivo?: string;
    usuario_id?: string;
  }
): Promise<any> {
  try {
    const response = await fetch(`/api/roles-servicio/${rolId}/nueva-estructura`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error creando nueva estructura: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Error creando nueva estructura');
    }

    return result;
  } catch (error) {
    console.error('Error creando nueva estructura:', error);
    throw error;
  }
} 