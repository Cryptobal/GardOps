/**
 * Hook para manejo de fechas con configuración de sistema en el frontend
 * 
 * PROBLEMA: Los componentes de React no pueden usar async/await directamente
 * SOLUCIÓN: Hook que carga la configuración una vez y la mantiene en estado
 */

import { useState, useEffect } from 'react';
import { useSystemConfig } from './useSystemConfig';
import { getHoyChileSync, getNowChileSync } from '@/lib/utils/chile-date';

export function useChileDate() {
  const { config, loading } = useSystemConfig();
  const [fechaHoy, setFechaHoy] = useState<string>('');
  const [horaActual, setHoraActual] = useState<string>('');

  // Actualizar fecha cuando cambie la configuración
  useEffect(() => {
    if (!loading && config) {
      const timezone = config.zona_horaria || 'America/Santiago';
      setFechaHoy(getHoyChileSync(timezone));
      setHoraActual(getNowChileSync(timezone));
    }
  }, [config, loading]);

  // Actualizar cada minuto para mantener la hora actual
  useEffect(() => {
    if (!loading && config) {
      const interval = setInterval(() => {
        const timezone = config.zona_horaria || 'America/Santiago';
        setFechaHoy(getHoyChileSync(timezone));
        setHoraActual(getNowChileSync(timezone));
      }, 60000); // Cada minuto

      return () => clearInterval(interval);
    }
  }, [config, loading]);

  return {
    fechaHoy,
    horaActual,
    timezone: config?.zona_horaria || 'America/Santiago',
    loading: loading || !fechaHoy
  };
}
