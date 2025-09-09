"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Activity, Clock, User, AlertCircle, Info, CheckCircle, XCircle } from "lucide-react";
import { getLogs, Log } from "../../lib/api/logs";

export interface LogEntry {
  id: string;
  accion: string;
  detalles: string;
  usuario: string;
  created_at: string;
  modulo: string;
  entidad_id: string;
  tipo?: 'info' | 'success' | 'warning' | 'error';
}

export interface LogViewerProps {
  modulo: string;
  entidadId: string;
  refreshTrigger?: number;
  className?: string;
}

export function LogViewer({ 
  modulo, 
  entidadId, 
  refreshTrigger,
  className = ""
}: LogViewerProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [cargando, setCargando] = useState(true);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);

  const cargarLogs = async (forceReload: boolean = false) => {
    const now = Date.now();
    
    // Caché de 30 segundos para logs
    if (!forceReload && lastLoadTime && (now - lastLoadTime < 30000)) {
      return;
    }

    try {
      setCargando(true);
      logger.debug(`🔄 Cargando logs para módulo: ${modulo}, entidad: ${entidadId}`);
      
      // Usar la nueva librería unificada
      const logsData = await getLogs(modulo, entidadId);
      setLogs(logsData);
      setLastLoadTime(now);
      
      logger.debug(`✅ ${logsData.length} logs cargados para ${modulo}`);
    } catch (error) {
      console.error("❌ Error cargando logs:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarLogs(true);
  }, [entidadId, refreshTrigger, modulo]);

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearFechaRelativa = (fecha: string) => {
    const ahora = new Date();
    const fechaLog = new Date(fecha);
    const diferencia = Math.floor((ahora.getTime() - fechaLog.getTime()) / (1000 * 60));

    if (diferencia < 1) return 'Ahora mismo';
    if (diferencia < 60) return `Hace ${diferencia} min`;
    if (diferencia < 1440) return `Hace ${Math.floor(diferencia / 60)}h`;
    return `Hace ${Math.floor(diferencia / 1440)}d`;
  };

  const getTipoIcon = (tipo?: string) => {
    switch (tipo) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'manual':
        return <User className="h-4 w-4 text-blue-400" />;
      case 'sistema':
        return <Activity className="h-4 w-4 text-purple-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const getTipoColor = (tipo?: string) => {
    switch (tipo) {
      case 'success':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'manual':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'sistema':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const getTipoTexto = (tipo?: string) => {
    switch (tipo) {
      case 'success':
        return 'Éxito';
      case 'warning':
        return 'Advertencia';
      case 'error':
        return 'Error';
      case 'manual':
        return 'Manual';
      case 'sistema':
        return 'Sistema';
      default:
        return 'Info';
    }
  };

  if (cargando && logs.length === 0) {
    return (
      <Card className={`bg-card/50 border-border/50 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted/20 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-muted/20 rounded w-1/2 mx-auto"></div>
              <div className="h-4 bg-muted/20 rounded w-2/3 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className={`bg-card/50 border-border/50 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historial de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground py-8">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay actividad registrada</p>
            <p className="text-xs mt-2">Los logs aparecerán aquí cuando se realicen acciones</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-card/50 border-border/50 h-full flex flex-col ${className}`}>
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historial de Actividad
            <Badge className="text-xs bg-blue-600/20 text-blue-400 border-blue-600/30">
              {logs.length}
            </Badge>
          </CardTitle>
          
          {/* Indicador de carga */}
          {cargando && logs.length > 0 && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Actualizando...
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {/* Lista de logs */}
        <div className="h-full overflow-y-auto space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 border border-border/30 rounded-lg hover:bg-muted/10 transition-colors"
            >
              {/* Icono de tipo */}
              <div className="flex-shrink-0 mt-1">
                {getTipoIcon(log.tipo)}
              </div>
              
              {/* Contenido del log */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-medium text-sm">
                    {log.accion}
                  </h4>
                  {log.tipo && (
                    <Badge className={`text-xs px-2 py-0.5 ${getTipoColor(log.tipo)}`}>
                      {getTipoTexto(log.tipo)}
                    </Badge>
                  )}
                </div>
                
                {log.detalles && (
                  <p className="text-muted-foreground text-sm mb-2">
                    {log.detalles}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {log.usuario}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatearFechaRelativa(log.created_at)}
                  </span>
                  <span className="text-white/60">
                    {formatearFecha(log.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Indicador de fin de lista */}
        <div className="text-center text-muted-foreground py-4 text-xs">
          <Activity className="h-4 w-4 mx-auto mb-1 opacity-50" />
          Fin del historial
        </div>
      </CardContent>
    </Card>
  );
} 