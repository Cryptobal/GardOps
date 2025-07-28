"use client";

import { useState, useEffect } from "react";
import { ClockIcon, User, Calendar, Tag, AlertCircle, FileText, Building2, Users, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface LogInstalacion {
  id: string;
  instalacion_id: string;
  tipo_evento: string;
  descripcion: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  usuario_id?: string;
  usuario_nombre?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

interface LogsInstalacionProps {
  instalacionId: string;
  refreshTrigger?: number;
}

const tipoEventoConfig = {
  'INSTALACION_CREADA': { 
    color: 'bg-green-600', 
    icon: Building2, 
    label: 'Creación' 
  },
  'DATOS_EDITADOS': { 
    color: 'bg-blue-600', 
    icon: FileText, 
    label: 'Edición' 
  },
  'CAMBIO_ESTADO': { 
    color: 'bg-amber-600', 
    icon: AlertCircle, 
    label: 'Estado' 
  },
  'DOCUMENTO_SUBIDO': { 
    color: 'bg-purple-600', 
    icon: FileText, 
    label: 'Documento' 
  },
  'DOCUMENTO_ELIMINADO': { 
    color: 'bg-red-600', 
    icon: FileText, 
    label: 'Documento' 
  },
  'GUARDIA_ASIGNADO': { 
    color: 'bg-indigo-600', 
    icon: Users, 
    label: 'Guardia' 
  },
  'GUARDIA_REMOVIDO': { 
    color: 'bg-red-600', 
    icon: Users, 
    label: 'Guardia' 
  },
  'PUESTO_CREADO': { 
    color: 'bg-teal-600', 
    icon: Shield, 
    label: 'Puesto' 
  },
  'PUESTO_ACTUALIZADO': { 
    color: 'bg-cyan-600', 
    icon: Shield, 
    label: 'Puesto' 
  },
  'ALERTA_GENERADA': { 
    color: 'bg-orange-600', 
    icon: AlertCircle, 
    label: 'Alerta' 
  },
};

export default function LogsInstalacion({ instalacionId, refreshTrigger }: LogsInstalacionProps) {
  const [logs, setLogs] = useState<LogInstalacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarLogs();
  }, [instalacionId, refreshTrigger]);

  const cargarLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/logs-instalaciones?instalacion_id=${instalacionId}`);
      const result = await response.json();
      
      if (result.success) {
        setLogs(result.data);
      } else {
        setError('Error al cargar el historial de actividad');
      }
    } catch (err) {
      console.error('Error cargando logs:', err);
      setError('Error al cargar el historial de actividad');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(fecha));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Historial de Actividad</h3>
        <Badge variant="outline" className="gap-1">
          <ClockIcon className="h-3 w-3" />
          {logs.length} eventos
        </Badge>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <ClockIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Sin actividad registrada
              </h3>
              <p className="text-muted-foreground">
                Los eventos de esta instalación aparecerán aquí conforme ocurran.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log, index) => {
            const config = tipoEventoConfig[log.tipo_evento as keyof typeof tipoEventoConfig] || {
              color: 'bg-gray-600',
              icon: ClockIcon,
              label: 'Sistema'
            };
            const Icon = config.icon;

            return (
              <Card key={log.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icono del evento */}
                    <div className={`p-2 rounded-full ${config.color} flex-shrink-0`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>

                    {/* Contenido del log */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {log.tipo_evento.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatearFecha(log.timestamp)}
                        </div>
                      </div>

                      <p className="text-sm text-foreground">
                        {log.descripcion}
                      </p>

                      {/* Usuario */}
                      {log.usuario_nombre && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {log.usuario_nombre}
                        </div>
                      )}

                      {/* Datos adicionales */}
                      {(log.datos_anteriores || log.datos_nuevos) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 p-3 bg-muted/20 rounded-md">
                          {log.datos_anteriores && (
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground mb-1">
                                Antes:
                              </h5>
                              <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                                {JSON.stringify(log.datos_anteriores, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.datos_nuevos && (
                            <div>
                              <h5 className="text-xs font-medium text-muted-foreground mb-1">
                                Después:
                              </h5>
                              <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                                {JSON.stringify(log.datos_nuevos, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}