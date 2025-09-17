import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  MessageSquare, Phone, CheckCircle, XCircle, 
  AlertTriangle, Clock, User, Building2, PhoneCall, Edit
} from 'lucide-react';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
interface Llamado {
  id: string;
  instalacion_id: string;
  instalacion_nombre: string;
  instalacion_telefono: string;
  guardia_id: string | null;
  guardia_nombre: string | null;
  guardia_telefono: string | null;
  programado_para: string;
  ejecutado_en: string | null;
  estado: 'pendiente' | 'exitoso' | 'no_contesta' | 'ocupado' | 'incidente' | 'cancelado';
  canal: string;
  contacto_tipo: string;
  contacto_telefono: string;
  observaciones: string | null;
  rol_nombre: string | null;
  nombre_puesto: string | null;
  minutos_atraso?: number;
  // Nuevos campos de la vista automática
  es_urgente?: boolean;
  es_actual?: boolean;
  es_proximo?: boolean;
  contacto_nombre?: string;
  intervalo_minutos?: number;
  ventana_inicio?: string;
  ventana_fin?: string;
  modo?: string;
  mensaje_template?: string;
}

interface LlamadoCardProps {
  llamado: Llamado;
  onRegistrar: (llamado: Llamado) => void;
  onWhatsApp: (telefono: string, mensaje: string) => void;
  onObservacionesUpdate?: (llamadoId: string, observaciones: string) => void;
}

export function LlamadoCard({ llamado, onRegistrar, onWhatsApp, onObservacionesUpdate }: LlamadoCardProps) {
  const { formatTime } = useSystemConfig();
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [observaciones, setObservaciones] = React.useState(llamado.observaciones || '');
  const [isUpdating, setIsUpdating] = React.useState(false);
  
  const ahora = new Date();
  const programadoPara = new Date(llamado.programado_para);
  const minutosDiff = Math.floor((ahora.getTime() - programadoPara.getTime()) / 60000);
  
  // Lógica corregida: solo urgente si ya pasó la hora Y tiene atraso
  const esUrgente = llamado.estado === 'pendiente' && minutosDiff > 15; // Solo si ya pasó +15 min
  const esActual = Math.abs(minutosDiff) <= 30;
  const esCompletado = llamado.estado !== 'pendiente';
  
  const getEstadoBadge = () => {
    const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      pendiente: { 
        color: esUrgente ? 'bg-red-500 animate-pulse' : 'bg-gray-500', 
        icon: <Clock className="h-3 w-3" />,
        label: 'Pendiente'
      },
      exitoso: { 
        color: 'bg-green-500', 
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Exitoso'
      },
      no_contesta: { 
        color: 'bg-yellow-500', 
        icon: <XCircle className="h-3 w-3" />,
        label: 'No contesta'
      },
      ocupado: { 
        color: 'bg-blue-500', 
        icon: <Phone className="h-3 w-3" />,
        label: 'Ocupado'
      },
      incidente: { 
        color: 'bg-orange-500 animate-pulse', 
        icon: <AlertTriangle className="h-3 w-3" />,
        label: 'Incidente'
      },
      cancelado: { 
        color: 'bg-gray-400', 
        icon: <XCircle className="h-3 w-3" />,
        label: 'Cancelado'
      }
    };
    
    const config = configs[llamado.estado] || configs.pendiente;
    
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1 text-xs px-2 py-1 whitespace-nowrap`}>
        {config.icon}
        <span>
          {config.label}
          {esUrgente && llamado.estado === 'pendiente' && minutosDiff > 0 && (
            <span className="ml-1">({minutosDiff}min)</span>
          )}
        </span>
      </Badge>
    );
  };
  
  const formatearHora = (fecha: string) => {
    // La fecha viene de la base de datos como '2025-09-06 19:00:00'
    // NO aplicar conversión de zona horaria ya que la BD ya devuelve la hora correcta
    const fechaObj = new Date(fecha);
    
    // Si la fecha es inválida, intentar parsear manualmente
    if (isNaN(fechaObj.getTime())) {
      const [fechaPart, horaPart] = fecha.split(' ');
      const [anio, mes, dia] = fechaPart.split('-');
      const [hora, minuto] = horaPart.split(':');
      const fechaCorrecta = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia), parseInt(hora), parseInt(minuto));
      return formatTime(fechaCorrecta, false, false); // NO aplicar zona horaria
    }
    
    return formatTime(fechaObj, false, false); // NO aplicar zona horaria
  };

  const formatearFechaHora = (fecha: string) => {
    // La fecha viene de la base de datos como '2025-09-06 19:00:00'
    const fechaObj = new Date(fecha);
    
    // Si la fecha es inválida, intentar parsear manualmente
    if (isNaN(fechaObj.getTime())) {
      const [fechaPart, horaPart] = fecha.split(' ');
      const [anio, mes, dia] = fechaPart.split('-');
      const [hora, minuto] = horaPart.split(':');
      const fechaCorrecta = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia), parseInt(hora), parseInt(minuto));
      return fechaCorrecta;
    }
    
    return fechaObj;
  };
  
  const formatearTelefonoChile = (telefono: string) => {
    // Limpiar el número de cualquier carácter que no sea dígito
    const numeroLimpio = telefono.replace(/\D/g, '');
    
    // Si ya tiene código de país (+56), devolverlo tal como está
    if (numeroLimpio.startsWith('56') && numeroLimpio.length >= 11) {
      return `+${numeroLimpio}`;
    }
    
    // Si tiene 9 dígitos (formato chileno sin código de país)
    if (numeroLimpio.length === 9) {
      // Agregar +56 al inicio
      return `+56${numeroLimpio}`;
    }
    
    // Si tiene 8 dígitos, agregar 9 al inicio y luego +56
    if (numeroLimpio.length === 8) {
      return `+569${numeroLimpio}`;
    }
    
    // Si tiene menos de 8 dígitos, asumir que necesita el 9 al inicio
    if (numeroLimpio.length < 8) {
      return `+569${numeroLimpio.padStart(8, '0')}`;
    }
    
    // Para cualquier otro caso, devolver el número limpio con +56
    return `+56${numeroLimpio}`;
  };

  const formatearHoraRegistro = (fecha: string) => {
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const generarMensajeWhatsApp = () => {
    const hora = formatearHora(llamado.programado_para);
    return `Hola, soy de la Central de Monitoreo de GardOps. Realizando control de las ${hora} hrs. ¿Todo en orden en ${llamado.instalacion_nombre}?`;
  };

  const handleUpdateObservaciones = async () => {
    if (!onObservacionesUpdate) return;
    
    setIsUpdating(true);
    try {
      await onObservacionesUpdate(llamado.id, observaciones);
      setShowEditModal(false);
    } catch (error) {
      logger.error('Error actualizando observaciones::', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <>
      <Card className={`${esUrgente ? 'border-red-500 shadow-lg' : esActual ? 'border-yellow-500' : ''} transition-all hover:shadow-md h-full flex flex-col relative overflow-hidden`}>
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="space-y-2">
            {/* Nombre de la instalación - Prioridad máxima */}
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4 flex-shrink-0 text-blue-600" />
              <span className="break-words leading-tight">{llamado.instalacion_nombre}</span>
            </h3>
            
            {/* Fecha, hora y estado en la misma línea */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-gray-600 font-medium">
                <div className="flex items-center gap-1">
                  <span>📅</span>
                  <span>{formatearFechaHora(llamado.programado_para).toLocaleDateString('es-CL', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🕐</span>
                  <span>{formatearHora(llamado.programado_para)}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        {getEstadoBadge()}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-mono">ID: {llamado.id}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Hora de registro para llamadas completadas */}
                {llamado.estado !== 'pendiente' && llamado.ejecutado_en && (
                  <div className="mt-1 text-xs text-gray-500 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Registrado: {formatearHoraRegistro(llamado.ejecutado_en)}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 flex-1 flex flex-col">
          {/* Contenido principal con altura mínima fija */}
          <div className="flex-1 space-y-3">
            {/* Información del guardia */}
            {llamado.guardia_nombre && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="font-medium">Guardia:</span>
                <span className="truncate">{llamado.guardia_nombre}</span>
              </div>
            )}
            
            {/* Teléfono de contacto */}
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium">Teléfono:</span>
              <span className="truncate">{llamado.contacto_telefono || llamado.instalacion_telefono || 'No disponible'}</span>
            </div>
            
            {/* Puesto y rol */}
            {llamado.nombre_puesto && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Puesto:</span> {llamado.nombre_puesto}
                {llamado.rol_nombre && <span> • {llamado.rol_nombre}</span>}
              </div>
            )}
            
            {/* Observaciones */}
            {llamado.observaciones && (
              <div className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Observaciones:</span>
                  {esCompletado && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowEditModal(true)}
                      className="h-6 px-2 flex-shrink-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    >
                      ✏️
                    </Button>
                  )}
                </div>
                <p className="mt-1 line-clamp-2">{llamado.observaciones}</p>
              </div>
            )}
          </div>
          
          {/* Sección de acciones fija en la parte inferior */}
          <div className="flex-shrink-0 pt-2">
            {llamado.estado === 'pendiente' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs font-medium bg-green-600 hover:bg-green-700 text-white border-green-200 hover:border-green-300 shadow-sm"
                  onClick={() => {
                    const telefono = llamado.contacto_telefono || llamado.instalacion_telefono;
                    if (telefono) {
                      const telefonoFormateado = formatearTelefonoChile(telefono);
                      onWhatsApp(telefonoFormateado, generarMensajeWhatsApp());
                    }
                  }}
                >
                  💬 WhatsApp
                </Button>
                
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white border-blue-200 hover:border-blue-300 shadow-sm"
                  onClick={() => onRegistrar(llamado)}
                >
                  📞 Registrar
                </Button>
              </div>
            )}

            {/* Botón para agregar observaciones si no hay */}
            {esCompletado && !llamado.observaciones && (
              <Button
                size="sm"
                className="w-full h-8 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white border-purple-200 hover:border-purple-300 shadow-sm"
                onClick={() => setShowEditModal(true)}
              >
                ✏️ Agregar Observaciones
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal para editar observaciones */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>📝 Editar Observaciones</DialogTitle>
            <DialogDescription>
              Actualizar observaciones para {llamado.instalacion_nombre}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Observaciones</label>
              <Textarea
                placeholder="Agregue observaciones adicionales..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateObservaciones}
              disabled={isUpdating}
            >
              {isUpdating ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
