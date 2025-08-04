import { useState, useEffect, useCallback } from 'react';

interface Guardia {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
  rut: string;
  activo: boolean;
  instalacion_id: string;
  instalacion_nombre: string;
  instalacion_actual_id: string | null;
  instalacion_actual_nombre: string | null;
  tiene_turno_asignado: boolean;
}

interface UseGuardiasSearchProps {
  instalacionId?: string;
  fecha?: string;
  debounceMs?: number;
}

export function useGuardiasSearch({ 
  instalacionId, 
  fecha, 
  debounceMs = 200 
}: UseGuardiasSearchProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGuardias = useCallback(async (search: string) => {
    // Siempre buscar, incluso si no hay término de búsqueda
    // para mostrar guardias disponibles

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search);
      if (instalacionId) params.append('instalacion_id', instalacionId);
      if (fecha) params.append('fecha', fecha);

      const response = await fetch(`/api/guardias/buscar?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error al buscar guardias');
      }

      const data = await response.json();
      setGuardias(data.guardias || []);
    } catch (err) {
      console.error('Error buscando guardias:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setGuardias([]);
    } finally {
      setLoading(false);
    }
  }, [instalacionId, fecha]);

  // Debounce effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchGuardias(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchGuardias, debounceMs]);

  // Convertir guardias a opciones para el combobox
  const guardiasOptions = guardias.map(guardia => {
    let description = `RUT: ${guardia.rut}`;
    
    // Agregar información de instalación actual si existe
    if (guardia.instalacion_actual_nombre) {
      description += ` - Asignado a ${guardia.instalacion_actual_nombre}`;
    }
    
    // Agregar información de turno asignado
    if (guardia.tiene_turno_asignado) {
      description += ' (Ya tiene turno asignado)';
    }
    
    return {
      value: guardia.id,
      label: guardia.nombre_completo,
      description,
      disabled: false // En la pauta diaria permitimos asignar guardias incluso si ya tienen turno
    };
  });

  return {
    searchTerm,
    setSearchTerm,
    guardias,
    guardiasOptions,
    loading,
    error,
    searchGuardias
  };
} 