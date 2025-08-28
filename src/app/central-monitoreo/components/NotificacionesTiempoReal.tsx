'use client';

import { useEffect, useState } from 'react';
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

interface Notificacion {
  id: string;
  tipo: 'atrasado' | 'incidente' | 'info';
  titulo: string;
  mensaje: string;
  instalacion: string;
  hora: string;
  timestamp: Date;
  leida: boolean;
}

interface NotificacionesTiempoRealProps {
  llamados: any[];
  onDismiss: (id: string) => void;
  onMarkAsRead: (id: string) => void;
}

export default function NotificacionesTiempoReal({ 
  llamados, 
  onDismiss, 
  onMarkAsRead 
}: NotificacionesTiempoRealProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [sonidoActivo, setSonidoActivo] = useState(true);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(true);

  // Generar notificaciones basadas en los llamados
  useEffect(() => {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const nuevasNotificaciones: Notificacion[] = [];

    llamados.forEach(llamado => {
      const programado = new Date(llamado.programado_para);
      const horaProgramada = programado.getHours();
      const diferenciaMinutos = (programado.getTime() - ahora.getTime()) / (1000 * 60);

      // Notificación 15 minutos antes de llamados próximos
      if (diferenciaMinutos >= 15 && diferenciaMinutos <= 16 && 
          llamado.estado === 'pendiente') {
        nuevasNotificaciones.push({
          id: `proximo-15min-${llamado.id}`,
          tipo: 'info',
          titulo: 'Llamado Próximo - 15 Minutos',
          mensaje: `En 15 minutos comienza el llamado a ${llamado.instalacion_nombre}`,
          instalacion: llamado.instalacion_nombre,
          hora: programado.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(),
          leida: false
        });
      }

      // Notificación para llamados no realizados (pasaron su hora)
      if (diferenciaMinutos < 0 && diferenciaMinutos >= -30 && 
          llamado.estado === 'pendiente') {
        nuevasNotificaciones.push({
          id: `no-realizado-${llamado.id}`,
          tipo: 'atrasado',
          titulo: 'Llamado No Realizado',
          mensaje: `No se realizó el llamado a ${llamado.instalacion_nombre} (programado para las ${programado.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })})`,
          instalacion: llamado.instalacion_nombre,
          hora: programado.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(),
          leida: false
        });
      }

      // Incidentes (notificación global)
      if (llamado.estado === 'incidente') {
        nuevasNotificaciones.push({
          id: `incidente-${llamado.id}`,
          tipo: 'incidente',
          titulo: 'Incidente Reportado',
          mensaje: `Incidente en ${llamado.instalacion_nombre}`,
          instalacion: llamado.instalacion_nombre,
          hora: programado.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(),
          leida: false
        });
      }
    });

    // Filtrar notificaciones duplicadas y mantener solo las más recientes
    const notificacionesUnicas = nuevasNotificaciones.filter((notif, index, self) => 
      index === self.findIndex(n => n.id === notif.id)
    );

    // Agregar solo notificaciones nuevas
    setNotificaciones(prev => {
      const existentes = prev.map(n => n.id);
      const nuevas = notificacionesUnicas.filter(n => !existentes.includes(n.id));
      
      if (nuevas.length > 0 && sonidoActivo) {
        // Reproducir sonido de notificación
        playNotificationSound();
      }
      
      return [...prev, ...nuevas].slice(-10); // Mantener solo las últimas 10
    });
  }, [llamados, sonidoActivo]);

  // Reproducir sonido de notificación
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.1; // Reducir volumen aún más
      audio.play().catch((error) => {
        // Solo mostrar en consola, no hacer beep
        console.log('Audio fallback - sin sonido');
      });
    } catch (error) {
      console.log('Audio error - sin sonido');
    }
  };

  // Marcar como leída
  const handleMarkAsRead = (id: string) => {
    onMarkAsRead(id);
    setNotificaciones(prev => 
      prev.map(n => n.id === id ? { ...n, leida: true } : n)
    );
  };

  // Descartar notificación
  const handleDismiss = (id: string) => {
    onDismiss(id);
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  };

  // Obtener color y estilo según tipo
  const getNotificacionEstilo = (tipo: string) => {
    switch (tipo) {
      case 'incidente':
        return {
          bg: 'bg-orange-50 border-orange-200',
          icon: 'text-orange-600',
          badge: 'bg-orange-100 text-orange-800'
        };
      case 'atrasado':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          badge: 'bg-yellow-100 text-yellow-800'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-800'
        };
    }
  };

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida);

  if (!mostrarNotificaciones || notificacionesNoLeidas.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {/* Header de notificaciones */}
      <div className="flex items-center justify-between bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-xl border border-slate-600 p-3">
                  <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-sm text-white">Notificaciones</span>
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

      {/* Lista de notificaciones */}
      {notificacionesNoLeidas.map((notificacion) => {
        const estilo = getNotificacionEstilo(notificacion.tipo);
        
        return (
          <Card 
            key={notificacion.id} 
            className={`${estilo.bg} border-l-4 border-l-red-500 shadow-xl animate-in slide-in-from-right duration-300 bg-slate-800/90 backdrop-blur-sm border border-slate-600`}
          >
            <CardContent className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${estilo.icon}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-white">{notificacion.titulo}</h4>
                      <Badge className={`text-xs ${estilo.badge}`}>
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
                    onClick={() => handleMarkAsRead(notificacion.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    onClick={() => handleDismiss(notificacion.id)}
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
        );
      })}
    </div>
  );
}
