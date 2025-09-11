"use client";

import { useState, useEffect } from 'react';
import { Bell, X, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { logger } from '@/lib/utils/logger';

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  datos?: any;
  leida: boolean;
  fecha_lectura?: string;
  created_at: string;
}

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [loading, setLoading] = useState(false);

  // Cargar notificaciones
  const cargarNotificaciones = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notificaciones?limit=20');
      const data = await response.json();
      
      if (data.success) {
        setNotificaciones(data.notificaciones);
        setTotalNoLeidas(data.total_no_leidas);
      }
    } catch (error) {
      logger.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar notificación como leída
  const marcarComoLeida = async (notificacionId: string) => {
    try {
      const response = await fetch(`/api/notificaciones/${notificacionId}`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        // Actualizar estado local
        setNotificaciones(prev => 
          prev.map(n => 
            n.id === notificacionId 
              ? { ...n, leida: true, fecha_lectura: new Date().toISOString() }
              : n
          )
        );
        setTotalNoLeidas(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      logger.error('Error marcando notificación como leída:', error);
    }
  };

  // Marcar todas como leídas
  const marcarTodasComoLeidas = async () => {
    try {
      const response = await fetch('/api/notificaciones/marcar-todas-leidas', {
        method: 'PUT'
      });
      
      if (response.ok) {
        setNotificaciones(prev => 
          prev.map(n => ({ ...n, leida: true, fecha_lectura: new Date().toISOString() }))
        );
        setTotalNoLeidas(0);
      }
    } catch (error) {
      logger.error('Error marcando todas las notificaciones como leídas:', error);
    }
  };

  // Eliminar notificación
  const eliminarNotificacion = async (notificacionId: string) => {
    try {
      const response = await fetch(`/api/notificaciones/${notificacionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setNotificaciones(prev => prev.filter(n => n.id !== notificacionId));
        // Si era no leída, reducir contador
        const notificacion = notificaciones.find(n => n.id === notificacionId);
        if (notificacion && !notificacion.leida) {
          setTotalNoLeidas(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      logger.error('Error eliminando notificación:', error);
    }
  };

  // Formatear fecha relativa
  const formatearFecha = (fecha: string) => {
    const ahora = new Date();
    const fechaNotif = new Date(fecha);
    const diffMs = ahora.getTime() - fechaNotif.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return fechaNotif.toLocaleDateString('es-CL');
  };

  // Obtener icono según tipo
  const getIcono = (tipo: string) => {
    switch (tipo) {
      case 'nueva_postulacion':
        return '👤';
      case 'nuevo_guardia_manual':
        return '👤';
      case 'nuevo_guardia_formulario':
        return '📝';
      case 'guardia_actualizado':
        return '✏️';
      case 'documento_vencido':
        return '📄';
      case 'documento_guardia_vencido':
        return '📄';
      case 'pauta_cambiada':
        return '📅';
      default:
        return '🔔';
    }
  };

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    cargarNotificaciones();
    
    // Recargar cada 30 segundos
    const interval = setInterval(cargarNotificaciones, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Botón de la campana */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-8 w-8 p-0 hover:bg-accent/70"
      >
        <Bell className="h-4 w-4" />
        {totalNoLeidas > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {totalNoLeidas > 99 ? '99+' : totalNoLeidas}
          </Badge>
        )}
      </Button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <Card className="absolute right-0 top-10 z-50 w-80 sm:w-96 shadow-lg border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Notificaciones
                </CardTitle>
                <div className="flex items-center gap-2">
                  {totalNoLeidas > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={marcarTodasComoLeidas}
                      className="h-6 px-2 text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <ScrollArea className="h-80">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : notificaciones.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay notificaciones</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {notificaciones.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          notif.leida 
                            ? 'bg-background hover:bg-accent/50' 
                            : 'bg-accent/30 hover:bg-accent/50 border-primary/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{getIcono(notif.tipo)}</span>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm font-medium ${!notif.leida ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notif.titulo}
                              </h4>
                              {!notif.leida && (
                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {notif.mensaje}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatearFecha(notif.created_at)}
                              </span>
                              
                              <div className="flex items-center gap-1">
                                {notif.datos?.urls?.ficha_guardia && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(notif.datos.urls.ficha_guardia, '_blank')}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Ver
                                  </Button>
                                )}
                                
                                {!notif.leida && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => marcarComoLeida(notif.id)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eliminarNotificacion(notif.id)}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
