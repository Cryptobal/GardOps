"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useNotifications } from '@/contexts/NotificationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Bell, 
  X, 
  Phone, 
  Clock, 
  CheckCircle,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useState } from 'react';

export default function GlobalNotifications() {
  const { globalNotifications, markAsRead, dismissNotification } = useNotifications();
  const [sonidoActivo, setSonidoActivo] = useState(true);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(true);

  const notificacionesNoLeidas = globalNotifications.filter(n => !n.leida);

  if (!mostrarNotificaciones || notificacionesNoLeidas.length === 0) {
    return null;
  }

  // Reproducir sonido de notificación
  const playNotificationSound = () => {
    if (!sonidoActivo) return;
    
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.1;
      audio.play().catch((error) => {
        logger.debug('Audio fallback - sin sonido');
      });
    } catch (error) {
      logger.debug('Audio error - sin sonido');
    }
  };

  // Reproducir sonido cuando hay nuevas notificaciones
  if (notificacionesNoLeidas.length > 0) {
    playNotificationSound();
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {/* Header de notificaciones globales */}
      <div className="flex items-center justify-between bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-xl border border-slate-600 p-3">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-400" />
          <span className="font-medium text-sm text-white">Notificaciones Globales</span>
          <Badge variant="secondary" className="text-xs">
            {notificacionesNoLeidas.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => setSonidoActivo(!sonidoActivo)}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            {sonidoActivo ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={() => setMostrarNotificaciones(false)}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Lista de notificaciones globales */}
      {notificacionesNoLeidas.map((notificacion) => (
        <Card 
          key={notificacion.id} 
          className="bg-orange-50 border-l-4 border-l-orange-500 shadow-xl animate-in slide-in-from-right duration-300 bg-slate-800/90 backdrop-blur-sm border border-slate-600"
        >
          <CardContent className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <AlertTriangle className="w-5 h-5 mt-0.5 text-orange-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-white">{notificacion.titulo}</h4>
                    <Badge className="text-xs bg-orange-100 text-orange-800">
                      {notificacion.tipo}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{notificacion.mensaje}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {notificacion.instalacion}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {notificacion.hora}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                <Button
                  onClick={() => markAsRead(notificacion.id)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </Button>
                <Button
                  onClick={() => dismissNotification(notificacion.id)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
