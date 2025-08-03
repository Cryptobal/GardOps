// Función para guardar la pauta mensual en la base de datos
export async function guardarPautaMensual(data: {
  instalacion_id: string;
  anio: number;
  mes: number;
  pauta: Array<{
    guardia_id: string;
    dia: number;
    estado: 'trabajado' | 'libre' | 'permiso';
  }>;
}) {
  try {
    const response = await fetch('/api/pauta-mensual/guardar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al guardar la pauta mensual');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error guardando pauta mensual:', error);
    throw error;
  }
}

// Función para obtener la pauta mensual desde la base de datos
export async function obtenerPautaMensual(instalacion_id: string, anio: number, mes: number) {
  try {
    const response = await fetch(`/api/pauta-mensual?instalacion_id=${instalacion_id}&anio=${anio}&mes=${mes}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener la pauta mensual');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error obteniendo pauta mensual:', error);
    throw error;
  }
}

// Función para obtener el resumen de pautas mensuales
export async function obtenerResumenPautasMensuales(mes: number, anio: number) {
  try {
    const response = await fetch(`/api/pauta-mensual/resumen?mes=${mes}&anio=${anio}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener el resumen de pautas mensuales');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error obteniendo resumen de pautas mensuales:', error);
    throw error;
  }
}

// Función para crear pauta mensual automáticamente
export async function crearPautaMensualAutomatica(data: {
  instalacion_id: string;
  anio: number;
  mes: number;
}) {
  try {
    const response = await fetch('/api/pauta-mensual/crear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear la pauta mensual automática');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creando pauta mensual automática:', error);
    throw error;
  }
}

// Función para verificar roles de servicio antes de generar pauta
export async function verificarRolesServicio(instalacion_id: string) {
  try {
    console.log('🔍 Iniciando verificación de roles para instalación:', instalacion_id);
    
    const response = await fetch('/api/pauta-mensual/verificar-roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ instalacion_id }),
    });

    console.log('📋 Respuesta del servidor:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error en la respuesta:', errorData);
      throw new Error(errorData.error || 'Error al verificar roles de servicio');
    }

    const result = await response.json();
    console.log('✅ Resultado de verificación:', result);
    return result;
  } catch (error) {
    console.error('❌ Error verificando roles de servicio:', error);
    throw error;
  }
}

// Función para eliminar una pauta mensual
export async function eliminarPautaMensual(data: {
  instalacion_id: string;
  anio: number;
  mes: number;
}) {
  try {
    const response = await fetch('/api/pauta-mensual/eliminar', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar la pauta mensual');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error eliminando pauta mensual:', error);
    throw error;
  }
} 