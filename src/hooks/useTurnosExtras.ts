import { useState } from 'react';

interface TurnoExtra {
  id: string;
  guardia_id: string;
  guardia_nombre: string;
  instalacion_id: string;
  instalacion_nombre: string;
  puesto_id: string;
  pauta_id: number;
  fecha: string;
  estado: 'reemplazo' | 'ppc';
  valor: number;
  created_at: string;
}

interface TurnoExtraFilters {
  guardia_id?: string;
  instalacion_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export function useTurnosExtras() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registrarTurnoExtra = async (data: {
    guardia_id: string;
    puesto_id: string;
    pauta_id: number;
    estado: 'reemplazo' | 'ppc';
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pauta-diaria/turno-extra', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al registrar turno extra');
      }

      // Mostrar alerta compacta
      alert(`✅ Turno extra registrado: $${result.valor} pagado`);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const obtenerTurnosExtras = async (filters: TurnoExtraFilters = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.guardia_id) params.append('guardia_id', filters.guardia_id);
      if (filters.instalacion_id) params.append('instalacion_id', filters.instalacion_id);
      if (filters.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
      if (filters.fecha_fin) params.append('fecha_fin', filters.fecha_fin);

      const response = await fetch(`/api/pauta-diaria/turno-extra?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al obtener turnos extras');
      }

      return result.turnos_extras as TurnoExtra[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const obtenerResumenTurnosExtras = async (guardia_id?: string, fecha_inicio?: string, fecha_fin?: string) => {
    const turnos = await obtenerTurnosExtras({ guardia_id, fecha_inicio, fecha_fin });
    
    const resumen = turnos.reduce((acc, turno) => {
      acc.total_turnos += 1;
      acc.valor_total += turno.valor;
      acc.por_estado[turno.estado] = (acc.por_estado[turno.estado] || 0) + 1;
      acc.valor_por_estado[turno.estado] = (acc.valor_por_estado[turno.estado] || 0) + turno.valor;
      return acc;
    }, {
      total_turnos: 0,
      valor_total: 0,
      por_estado: {} as Record<string, number>,
      valor_por_estado: {} as Record<string, number>
    });

    return resumen;
  };

  return {
    registrarTurnoExtra,
    obtenerTurnosExtras,
    obtenerResumenTurnosExtras,
    isLoading,
    error,
    clearError: () => setError(null)
  };
} 