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
  const response = await fetch(`/api/instalaciones/${instalacionId}/estadisticas_v2`);
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
    const response = await fetch(`/api/instalaciones/${instalacionId}/turnos_v2`, {
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

    const result = await response.json();
    // Soportar ambos formatos: { success, data } y [] (legacy)
    return Array.isArray(result) ? result : (result?.success ? result.data ?? [] : []);
  } catch (error) {
    console.error('Error obteniendo roles de servicio:', error);
    throw error;
  }
}

// Crear turno de instalación
export async function crearTurnoInstalacion(data: {
  instalacion_id: string;
  rol_servicio_id: string;
  cantidad_guardias: number;
  tipo_puesto_id?: string;
}): Promise<any> {
  try {
    const response = await fetch(`/api/instalaciones/${data.instalacion_id}/turnos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rol_servicio_id: data.rol_servicio_id,
        cantidad_guardias: data.cantidad_guardias,
        tipo_puesto_id: data.tipo_puesto_id
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear turno');
    }
    return await response.json();
  } catch (error) {
    console.error('Error creando turno:', error);
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
    const response = await fetch('/api/ppc/asignar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        puesto_operativo_id: ppcId,
        guardia_id: guardiaId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Error al asignar guardia: ${errorData.error || response.statusText}`);
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
    const response = await fetch(`/api/instalaciones/${instalacionId}/turnos/${turnoId}/eliminar_turno_v2`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar turno');
    }

    return await response.json();
  } catch (error) {
    console.error('Error eliminando turno:', error);
    throw error;
  }
} 

// Obtener guardias disponibles (sin asignación activa)
export async function getGuardiasDisponibles(instalacionId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/guardias/disponibles?instalacion_id=${instalacionId}`);
    if (!response.ok) {
      throw new Error('Error al obtener guardias disponibles');
    }
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error obteniendo guardias disponibles:', error);
    return [];
  }
}

// Obtener PPCs activos de una instalación
export async function getPPCsActivosInstalacion(instalacionId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/ppc-activos_v2`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener PPCs activos: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error obteniendo PPCs activos:', error);
    throw error;
  }
}

// Desasignar guardia de un PPC
export async function desasignarGuardiaPPC(instalacionId: string, ppcId: string): Promise<any> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/ppc/${ppcId}/desasignar_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al desasignar guardia');
    }

    return await response.json();
  } catch (error) {
    console.error('Error desasignando guardia:', error);
    throw error;
  }
}

// Eliminar PPC
export async function eliminarPPC(instalacionId: string, ppcId: string): Promise<any> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/ppc/${ppcId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar PPC');
    }

    return await response.json();
  } catch (error) {
    console.error('Error eliminando PPC:', error);
    throw error;
  }
}

// Agregar puestos a un turno existente
export async function agregarPuestosARol(instalacionId: string, turnoId: string, cantidad: number): Promise<any> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/turnos/${turnoId}/agregar-ppcs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cantidad: cantidad
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al agregar puestos');
    }

    return await response.json();
  } catch (error) {
    console.error('Error agregando puestos:', error);
    throw error;
  }
} 

// Obtener todas las instalaciones con estadísticas optimizadas
export const obtenerInstalacionesConEstadisticas = async (): Promise<Instalacion[]> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const response = await fetch(`${baseUrl}/api/instalaciones?withStats=true`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener instalaciones");
  }
  
  return result.data;
};

// Obtener todos los datos necesarios en una sola llamada (instalaciones + clientes + comunas)
export const obtenerDatosCompletosInstalaciones = async (): Promise<{
  instalaciones: Instalacion[];
  clientes: Cliente[];
  comunas: Comuna[];
}> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const response = await fetch(`${baseUrl}/api/instalaciones?withAllData=true`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener datos completos");
  }
  
  return result.data;
}; 

// Obtener todos los datos de una instalación en una sola llamada optimizada
export const obtenerDatosCompletosInstalacion = async (instalacionId: string): Promise<{
  instalacion: Instalacion;
  turnos: TurnoInstalacionConDetalles[];
  ppcs: any[];
  guardias: any[];
  roles: RolServicio[];
}> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const response = await fetch(`${baseUrl}/api/instalaciones/${instalacionId}/completa`, {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener datos completos de la instalación");
  }
  
  return result.data;
}; 

// Obtener documentos vencidos de instalaciones
export const obtenerDocumentosVencidosInstalaciones = async (): Promise<{
  instalaciones: Array<{
    instalacion_id: string;
    instalacion_nombre: string;
    documentos_vencidos: number;
  }>;
  total: number;
}> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const response = await fetch(`${baseUrl}/api/instalaciones/documentos-vencidos`);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || "Error al obtener documentos vencidos");
  }
  
  return result.data;
}; 

// Obtener tipos de puesto
export async function getTiposPuesto(): Promise<any[]> {
  try {
    const response = await fetch('/api/tipos-puesto');
    if (!response.ok) {
      throw new Error('Error al obtener tipos de puesto');
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error obteniendo tipos de puesto:', error);
    return [];
  }
} 

// Asignar guardia a un turno
export async function asignarGuardiaATurno(instalacionId: string, turnoId: string, guardiaId: string): Promise<any> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/turnos/${turnoId}/asignar-guardia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guardia_id: guardiaId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al asignar guardia');
    }

    return await response.json();
  } catch (error) {
    console.error('Error asignando guardia:', error);
    throw error;
  }
}

// Desasignar guardia de un turno
export async function desasignarGuardiaDeTurno(instalacionId: string, turnoId: string, guardiaId: string): Promise<any> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/turnos/${turnoId}/desasignar-guardia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guardia_id: guardiaId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al desasignar guardia');
    }

    return await response.json();
  } catch (error) {
    console.error('Error desasignando guardia:', error);
    throw error;
  }
} 

// Asignar guardia a un puesto específico
export async function asignarGuardiaAPuesto(instalacionId: string, turnoId: string, puestoId: string, guardiaId: string): Promise<any> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/turnos/${turnoId}/asignar-guardia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guardia_id: guardiaId,
        puesto_id: puestoId
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error || 'Error al asignar guardia');
      // Agregar información de asignación activa al error si existe
      if (errorData.asignacion_activa) {
        (error as any).asignacion_activa = errorData.asignacion_activa;
      }
      throw error;
    }
    return await response.json();
  } catch (error) {
    console.error('Error asignando guardia:', error);
    throw error;
  }
}

// Desasignar guardia de un puesto específico
export async function desasignarGuardiaDePuesto(instalacionId: string, turnoId: string, puestoId: string) {
  const response = await fetch(`/api/instalaciones/${instalacionId}/turnos/${turnoId}/desasignar-guardia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ puestoId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error desasignando guardia');
  }

  return response.json();
}

// Agregar puesto con numeración correlativa
export async function agregarPuesto(instalacionId: string, turnoId: string, tipoPuestoId: string) {
  const response = await fetch(`/api/instalaciones/${instalacionId}/turnos/${turnoId}/agregar-puesto`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tipo_puesto_id: tipoPuestoId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error agregando puesto');
  }

  return response.json();
}

// Eliminar puesto de un turno
export async function eliminarPuestoDeTurno(instalacionId: string, turnoId: string, puestoId: string): Promise<any> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/turnos/${turnoId}/eliminar-puesto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        puesto_id: puestoId
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar puesto');
    }
    return await response.json();
  } catch (error) {
    console.error('Error eliminando puesto:', error);
    throw error;
  }
} 

// Obtener puestos de un turno específico
export async function getPuestosDeTurno(instalacionId: string, turnoId: string): Promise<any> {
  try {
    const response = await fetch(`/api/instalaciones/${instalacionId}/turnos/${turnoId}/puestos`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener puestos');
    }
    return await response.json();
  } catch (error) {
    console.error('Error obteniendo puestos:', error);
    throw error;
  }
} 

// Obtener información de asignación activa de un guardia
export async function getAsignacionActivaGuardia(guardiaId: string): Promise<any> {
  try {
    const response = await fetch(`/api/guardias/${guardiaId}/asignacion-activa`);
    if (!response.ok) {
      throw new Error('Error al obtener información de asignación activa');
    }
    return await response.json();
  } catch (error) {
    console.error('Error obteniendo asignación activa:', error);
    throw error;
  }
} 