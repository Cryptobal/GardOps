// Librería unificada para logs de todos los módulos
export interface Log {
  id: string;
  entidad_id: string;
  accion: string;
  usuario: string;
  tipo: string;
  detalles?: string;
  created_at: string;
  modulo: string;
}

export interface LogRequest {
  modulo: string;
  entidadId: string;
  accion: string;
  detalles?: string;
  usuario?: string;
  tipo?: string;
}

// Obtener logs de cualquier módulo
export const getLogs = async (modulo: string, entidadId: string): Promise<Log[]> => {
  try {
    console.log(`🔄 Obteniendo logs para módulo: ${modulo}, entidad: ${entidadId}`);
    
    const response = await fetch(`/api/logs?modulo=${modulo}&entidad_id=${entidadId}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.data.length} logs obtenidos para ${modulo}`);
      return data.data;
    } else {
      console.error('❌ Error obteniendo logs:', data.error);
      return [];
    }
  } catch (error) {
    console.error('❌ Error en getLogs:', error);
    return [];
  }
};

// Registrar log para cualquier módulo
export const logAccion = async (logData: LogRequest): Promise<boolean> => {
  try {
    console.log(`📝 Registrando log para módulo: ${logData.modulo}`, logData);
    
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modulo: logData.modulo,
        entidadId: logData.entidadId,
        accion: logData.accion,
        detalles: logData.detalles,
        usuario: logData.usuario || 'Admin',
        tipo: logData.tipo || 'manual'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Log registrado exitosamente');
      return true;
    } else {
      console.error('❌ Error registrando log:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error en logAccion:', error);
    return false;
  }
};

// Funciones de conveniencia para cada módulo
export const logCliente = async (clienteId: string, accion: string, detalles?: string) => {
  return logAccion({
    modulo: 'clientes',
    entidadId: clienteId,
    accion,
    detalles
  });
};

export const logInstalacion = async (instalacionId: string, accion: string, detalles?: string) => {
  return logAccion({
    modulo: 'instalaciones',
    entidadId: instalacionId,
    accion,
    detalles
  });
};

export const logGuardia = async (guardiaId: string, accion: string, detalles?: string) => {
  return logAccion({
    modulo: 'guardias',
    entidadId: guardiaId,
    accion,
    detalles
  });
};

// Obtener logs específicos por módulo
export const getLogsCliente = async (clienteId: string): Promise<Log[]> => {
  return getLogs('clientes', clienteId);
};

export const getLogsInstalacion = async (instalacionId: string): Promise<Log[]> => {
  return getLogs('instalaciones', instalacionId);
};

export const getLogsGuardia = async (guardiaId: string): Promise<Log[]> => {
  return getLogs('guardias', guardiaId);
}; 