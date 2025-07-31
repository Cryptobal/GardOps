import { RolServicio, CrearRolServicioData, ActualizarRolServicioData } from '@/lib/schemas/roles-servicio';

export async function getRolesServicio(): Promise<RolServicio[]> {
  try {
    const response = await fetch('/api/roles-servicio', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo roles de servicio: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error obteniendo roles de servicio:', error);
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

    return await response.json();
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

    return await response.json();
  } catch (error) {
    console.error('Error actualizando rol de servicio:', error);
    throw error;
  }
}

export async function eliminarRolServicio(id: string): Promise<any> {
  try {
    const response = await fetch(`/api/roles-servicio/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error eliminando rol de servicio: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error eliminando rol de servicio:', error);
    throw error;
  }
} 