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