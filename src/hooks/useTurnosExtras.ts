import { useState, useEffect } from 'react';
import { useToast } from './use-toast';

export interface TurnoExtra {
  id: string;
  guardia_id: string;
  guardia_nombre: string;
  guardia_rut: string;
  instalacion_id: string;
  instalacion_nombre: string;
  puesto_id: string;
  puesto_nombre: string;
  pauta_id: string;
  fecha: string;
  estado: 'reemplazo' | 'ppc';
  valor: number;
  pagado: boolean;
  fecha_pago?: string;
  observaciones_pago?: string;
  usuario_pago?: string;
  created_at: string;
}

export interface TurnosExtrasFilters {
  guardia_id?: string;
  instalacion_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: 'reemplazo' | 'ppc' | 'all';
  pagado?: 'true' | 'false' | 'all';
  busqueda?: string;
}

export interface TurnosExtrasStats {
  total: number;
  pendientes: number;
  pagados: number;
  montoTotal: number;
  montoPendiente: number;
  montoPagado: number;
  promedioPorTurno: number;
  turnosEsteMes: number;
  montoEsteMes: number;
}

export function useTurnosExtras() {
  const [turnosExtras, setTurnosExtras] = useState<TurnoExtra[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TurnosExtrasStats>({
    total: 0,
    pendientes: 0,
    pagados: 0,
    montoTotal: 0,
    montoPendiente: 0,
    montoPagado: 0,
    promedioPorTurno: 0,
    turnosEsteMes: 0,
    montoEsteMes: 0
  });
  const { toast } = useToast();

  // Cargar turnos extras
  const cargarTurnosExtras = async (filtros: TurnosExtrasFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/pauta-diaria/turno-extra?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error cargando turnos extras');
      }

      setTurnosExtras(data.turnos_extras || []);
      calcularEstadisticas(data.turnos_extras || []);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Registrar nuevo turno extra
  const registrarTurnoExtra = async (datos: {
    guardia_id: string;
    puesto_id: string;
    pauta_id: string;
    estado: 'reemplazo' | 'ppc';
  }) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/pauta-diaria/turno-extra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error registrando turno extra');
      }

      // Mostrar notificación compacta según documentación
      toast({
        title: "✅ Turno extra registrado",
        description: `$${data.valor?.toLocaleString()} pagado`,
        duration: 3000
      });

      // Recargar datos
      await cargarTurnosExtras();
      
      return data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Marcar turnos como pagados
  const marcarComoPagado = async (turnoIds: string[], observaciones?: string) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/pauta-diaria/turno-extra/marcar-pagado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turno_ids: turnoIds,
          observaciones: observaciones || ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error marcando turnos como pagados');
      }

      toast({
        title: "✅ Pagos procesados",
        description: `${turnoIds.length} turno(s) marcado(s) como pagado(s)`,
        duration: 3000
      });

      // Recargar datos
      await cargarTurnosExtras();
      
      return data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Exportar a CSV
  const exportarCSV = async (filtros: TurnosExtrasFilters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/pauta-diaria/turno-extra/exportar?${params}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error exportando datos');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `turnos_extras_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "✅ Exportación completada",
        description: "Archivo CSV descargado correctamente",
        duration: 3000
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Calcular estadísticas
  const calcularEstadisticas = (turnos: TurnoExtra[]) => {
    const total = turnos.length;
    const pendientes = turnos.filter(t => !t.pagado).length;
    const pagados = turnos.filter(t => t.pagado).length;
    const montoTotal = turnos.reduce((sum, t) => sum + Number(t.valor), 0);
    const montoPendiente = turnos.filter(t => !t.pagado).reduce((sum, t) => sum + Number(t.valor), 0);
    const montoPagado = turnos.filter(t => t.pagado).reduce((sum, t) => sum + Number(t.valor), 0);
    const promedioPorTurno = total > 0 ? montoTotal / total : 0;

    // Calcular turnos de este mes
    const ahora = new Date();
    const turnosEsteMes = turnos.filter(t => {
      const fechaTurno = new Date(t.fecha);
      return fechaTurno.getMonth() === ahora.getMonth() && 
             fechaTurno.getFullYear() === ahora.getFullYear();
    });
    const montoEsteMes = turnosEsteMes.reduce((sum, t) => sum + Number(t.valor), 0);

    setStats({
      total,
      pendientes,
      pagados,
      montoTotal,
      montoPendiente,
      montoPagado,
      promedioPorTurno,
      turnosEsteMes: turnosEsteMes.length,
      montoEsteMes
    });
  };

  return {
    turnosExtras,
    loading,
    error,
    stats,
    cargarTurnosExtras,
    registrarTurnoExtra,
    marcarComoPagado,
    exportarCSV,
    calcularEstadisticas
  };
} 