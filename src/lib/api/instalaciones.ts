import { 
  Instalacion, 
  CrearInstalacionData, 
  GuardiaAsignado, 
  PuestoOperativo,
  DocumentoInstalacion,
  LogInstalacion,
  Comuna,
  Cliente,
  TurnoInstalacionConDetalles,
  RolServicio,
  CrearTurnoInstalacionData,
  TurnoInstalacion
} from "../schemas/instalaciones";

// Obtener todas las instalaciones
export const obtenerInstalaciones = async (): Promise<Instalacion[]> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const response = await fetch(`${baseUrl}/api/instalaciones`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener instalaciones");
  }
  
  return result.data;
};

// Obtener una instalación específica
export const getInstalacion = async (id: string): Promise<Instalacion> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const response = await fetch(`${baseUrl}/api/instalaciones/${id}`);
  
  if (!response.ok) {
    throw new Error(`Error al obtener instalación: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener instalación");
  }
  
  return result.data;
};

// Crear nueva instalación
export const crearInstalacion = async (data: CrearInstalacionData): Promise<Instalacion> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const response = await fetch(`${baseUrl}/api/instalaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al crear instalación");
  }
  
  return result.data;
};

// Actualizar instalación
export const actualizarInstalacion = async (id: string, data: Partial<CrearInstalacionData>): Promise<Instalacion> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const response = await fetch(`${baseUrl}/api/instalaciones`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...data }),
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al actualizar instalación");
  }
  
  return result.data;
};

// Eliminar instalación
export const eliminarInstalacion = async (id: string): Promise<void> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const response = await fetch(`${baseUrl}/api/instalaciones?id=${id}`, {
    method: "DELETE",
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al eliminar instalación");
  }
};

// Cambiar estado de instalación
export const cambiarEstadoInstalacion = async (id: string, estado: "Activo" | "Inactivo"): Promise<Instalacion> => {
  const response = await fetch(`/api/instalaciones/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al cambiar estado de instalación");
  }
  
  return result.data;
};

// Obtener guardias asignados a una instalación
export const obtenerGuardiasAsignados = async (instalacionId: string): Promise<GuardiaAsignado[]> => {
  const response = await fetch(`/api/instalaciones/${instalacionId}/guardias`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener guardias asignados");
  }
  
  return result.data;
};

// Obtener puestos operativos de una instalación
export const obtenerPuestosOperativos = async (instalacionId: string): Promise<PuestoOperativo[]> => {
  const response = await fetch(`/api/instalaciones/${instalacionId}/puestos`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener puestos operativos");
  }
  
  return result.data;
};

// Obtener documentos de una instalación
export const obtenerDocumentosInstalacion = async (instalacionId: string): Promise<DocumentoInstalacion[]> => {
  const response = await fetch(`/api/instalaciones/${instalacionId}/documentos`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener documentos");
  }
  
  return result.data;
};

// Obtener logs de una instalación
export const obtenerLogsInstalacion = async (instalacionId: string): Promise<LogInstalacion[]> => {
  const response = await fetch(`/api/instalaciones/${instalacionId}/logs`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener logs");
  }
  
  return result.data;
};

// Obtener clientes para dropdown
export const obtenerClientes = async (): Promise<Cliente[]> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const response = await fetch(`${baseUrl}/api/clientes`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener clientes");
  }
  
  return result.data;
};

// Obtener comunas para dropdown
export const obtenerComunas = async (): Promise<Comuna[]> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const response = await fetch(`${baseUrl}/api/comunas`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener comunas");
  }
  
  return result.data;
};

// Obtener estadísticas de instalación
export const obtenerEstadisticasInstalacion = async (instalacionId: string) => {
  const response = await fetch(`/api/instalaciones/${instalacionId}/estadisticas`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener estadísticas");
  }
  
  return result.data;
}; 

// Logs para instalaciones
export const logInstalacionCreada = async (instalacionId: string, detalles: string) => {
  await fetch("/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      modulo: "instalaciones",
      entidadId: instalacionId,
      accion: "CREAR",
      detalles
    }),
  });
};

export const logEdicionInstalacion = async (instalacionId: string, detalles: string) => {
  await fetch("/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      modulo: "instalaciones",
      entidadId: instalacionId,
      accion: "EDITAR",
      detalles
    }),
  });
};

export const logCambioEstadoInstalacion = async (instalacionId: string, nuevoEstado: string) => {
  await fetch("/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      modulo: "instalaciones",
      entidadId: instalacionId,
      accion: "CAMBIAR_ESTADO",
      detalles: `Estado cambiado a: ${nuevoEstado}`
    }),
  });
}; 

// Funciones para turnos de instalación
export async function getTurnosInstalacion(instalacionId: string): Promise<TurnoInstalacionConDetalles[]> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/turnos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener turnos: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error obteniendo turnos de instalación:', error);
    throw error;
  }
}

export async function getRolesServicio(): Promise<RolServicio[]> {
  try {
    const response = await fetch('/api/roles-servicio', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener roles de servicio: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error obteniendo roles de servicio:', error);
    throw error;
  }
}

export async function crearTurnoInstalacion(data: CrearTurnoInstalacionData): Promise<TurnoInstalacion> {
  try {
    const response = await fetch(`/api/instalaciones/${data.instalacion_id}/turnos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error al crear turno: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creando turno de instalación:', error);
    throw error;
  }
}

// Funciones para PPCs
export async function getPPCsInstalacion(instalacionId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/ppc`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener PPCs: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error obteniendo PPCs:', error);
    throw error;
  }
}

export async function asignarGuardiaPPC(instalacionId: string, ppcId: string, guardiaId: string): Promise<any> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/ppc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ppc_id: ppcId,
        guardia_id: guardiaId
      }),
    });

    if (!response.ok) {
      throw new Error(`Error al asignar guardia: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error asignando guardia:', error);
    throw error;
  }
}

export async function eliminarRolServicio(rolId: string): Promise<any> {
  try {
    const response = await fetch(`/api/roles-servicio/${rolId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error al eliminar rol: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error eliminando rol de servicio:', error);
    throw error;
  }
}

export async function eliminarTurnoInstalacion(instalacionId: string, turnoId: string): Promise<any> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/turnos/${turnoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error al eliminar turno: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error eliminando turno de instalación:', error);
    throw error;
  }
} 