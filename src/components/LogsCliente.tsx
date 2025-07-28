"use client";

import { useEffect, useState } from "react";
import { ClockIcon, AlertCircle } from "lucide-react";
import { Badge } from "./ui/badge";

interface Log {
  id: string;
  fecha: string;
  accion: string;
  usuario: string;
  tipo: string;
  contexto: string | null;
}

interface LogsClienteProps {
  clienteId: string;
  refreshTrigger?: number; // Para forzar actualización
}

export default function LogsCliente({ clienteId, refreshTrigger }: LogsClienteProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarLogs = async () => {
    if (!clienteId) return;
    
    try {
      setCargando(true);
      setError(null);
      
      const response = await fetch(`/api/logs-clientes?cliente_id=${clienteId}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data);
      } else {
        setError(data.error || "Error cargando logs");
      }
    } catch (error) {
      console.error("Error cargando logs:", error);
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarLogs();
  }, [clienteId, refreshTrigger]);

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'sistema':
        return <Badge variant="secondary" className="text-xs">Sistema</Badge>;
      case 'automatizado':
        return <Badge variant="outline" className="text-xs">Automatizado</Badge>;
      default:
        return <Badge variant="default" className="text-xs">Manual</Badge>;
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-2 text-sm text-muted-foreground">Cargando logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-8 text-red-400">
        <AlertCircle className="h-5 w-5" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No hay actividad registrada para este cliente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">
          Actividad del Cliente ({logs.length})
        </h4>
      </div>
      
      <div className="max-h-96 overflow-y-auto space-y-3">
        {logs.map((log, index) => (
          <div key={log.id} className={`
            flex items-start gap-3 p-3 rounded-lg border border-border/30 
            hover:bg-muted/10 transition-colors
            ${index === 0 ? 'bg-blue-600/5 border-blue-600/20' : ''}
          `}>
            <div className="flex-shrink-0 mt-1">
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm text-white">
                  <span className="font-medium">{log.usuario}</span> — {log.accion}
                </p>
                {getTipoBadge(log.tipo)}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatearFecha(log.fecha)}</span>
                {log.contexto && (
                  <span className="italic">({log.contexto})</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 