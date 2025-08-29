'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Phone, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  Building2,
  Edit,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface Turno {
  pauta_id: string;
  instalacion_nombre: string;
  guardia_nombre: string;
  guardia_telefono: string | null;
  instalacion_telefono: string | null;
  puesto_nombre: string;
  rol_nombre: string;
  hora_inicio: string;
  hora_termino: string;
  tipo_turno: 'dia' | 'noche';
  estado_semaforo: string;
  observaciones_semaforo: string | null;
  ultima_actualizacion: string | null;
}

interface SemaforoCardProps {
  turno: Turno;
  onEstadoChange: (pautaId: string, nuevoEstado: string, observaciones?: string) => Promise<void>;
  onWhatsApp: (telefono: string, guardia: string) => void;
  onTelefono: (telefono: string) => void;
  onObservaciones: (pautaId: string, observaciones: string) => Promise<void>;
}

const estadosSemaforo = [
  { 
    value: 'pendiente', 
    label: 'Pendiente', 
    color: 'bg-gray-400',
    icon: Clock,
    description: 'Estado inicial, sin contacto'
  },
  { 
    value: 'en_camino', 
    label: 'En camino', 
    color: 'bg-yellow-500',
    icon: Clock,
    description: 'Guardia confirmó que va en camino'
  },
  { 
    value: 'no_contesta', 
    label: 'No contesta', 
    color: 'bg-red-500',
    icon: XCircle,
    description: 'No responde llamadas/WhatsApp'
  },
  { 
    value: 'no_ira', 
    label: 'No irá', 
    color: 'bg-red-600',
    icon: XCircle,
    description: 'Guardia confirmó que no asistirá'
  },
  { 
    value: 'llego', 
    label: 'Llegó', 
    color: 'bg-green-500',
    icon: CheckCircle,
    description: 'Guardia confirmó llegada'
  },
  { 
    value: 'retrasado', 
    label: 'Retrasado', 
    color: 'bg-orange-500',
    icon: AlertTriangle,
    description: 'Guardia reportó retraso'
  },
  { 
    value: 'en_transito', 
    label: 'En tránsito', 
    color: 'bg-blue-500',
    icon: Clock,
    description: 'Guardia en camino, confirmado'
  }
];

export function SemaforoCard({ 
  turno, 
  onEstadoChange, 
  onWhatsApp, 
  onTelefono, 
  onObservaciones 
}: SemaforoCardProps) {
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [showObservacionesModal, setShowObservacionesModal] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState(turno.estado_semaforo || 'pendiente');
  const [observaciones, setObservaciones] = useState(turno.observaciones_semaforo || '');
  const [loading, setLoading] = useState(false);

  const estadoActual = estadosSemaforo.find(e => e.value === (turno.estado_semaforo || 'pendiente'));
  const EstadoIcon = estadoActual?.icon || Clock;

  const handleEstadoChange = async () => {
    setLoading(true);
    try {
      await onEstadoChange(turno.pauta_id, nuevoEstado, observaciones);
      setShowEstadoModal(false);
      toast.success('Estado actualizado correctamente');
    } catch (error) {
      toast.error('Error al actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  const handleObservacionesSave = async () => {
    setLoading(true);
    try {
      await onObservaciones(turno.pauta_id, observaciones);
      setShowObservacionesModal(false);
      toast.success('Observaciones guardadas');
    } catch (error) {
      toast.error('Error al guardar observaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const telefono = turno.guardia_telefono || turno.instalacion_telefono;
    if (telefono) {
      onWhatsApp(telefono, turno.guardia_nombre);
    } else {
      toast.error('No hay teléfono disponible');
    }
  };

  const handleTelefono = () => {
    const telefono = turno.guardia_telefono || turno.instalacion_telefono;
    if (telefono) {
      onTelefono(telefono);
    } else {
      toast.error('No hay teléfono disponible');
    }
  };

  const formatearHora = (hora: string) => {
    return hora.substring(0, 5);
  };

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
        turno.tipo_turno === 'noche' ? 'border-blue-200 bg-blue-50/30' : 'border-amber-200 bg-amber-50/30'
      }`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-700">
              {turno.instalacion_nombre}
            </CardTitle>
            <Badge variant="outline" className={`text-xs ${
              turno.tipo_turno === 'noche' ? 'border-blue-300 text-blue-700' : 'border-amber-300 text-amber-700'
            }`}>
              {turno.tipo_turno === 'noche' ? '🌙 Noche' : '☀️ Día'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Semáforo principal */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowEstadoModal(true)}
                className={`w-8 h-8 rounded-full ${estadoActual?.color} flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer`}
                title={`Cambiar estado (actual: ${estadoActual?.label})`}
              >
                <EstadoIcon className="w-4 h-4 text-white" />
              </button>
              <div>
                <p className="text-sm font-medium text-gray-900">{turno.guardia_nombre}</p>
                <p className="text-xs text-gray-500">{turno.puesto_nombre}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xs font-medium text-gray-700">
                {formatearHora(turno.hora_inicio)} - {formatearHora(turno.hora_termino)}
              </p>
              <p className="text-xs text-gray-500">{turno.rol_nombre}</p>
            </div>
          </div>

          {/* Botones de contacto */}
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTelefono}
              className="flex-1 h-8 text-xs"
              disabled={!turno.guardia_telefono && !turno.instalacion_telefono}
            >
              <Phone className="w-3 h-3 mr-1" />
              Llamar
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleWhatsApp}
              className="flex-1 h-8 text-xs"
              disabled={!turno.guardia_telefono && !turno.instalacion_telefono}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              WhatsApp
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowObservacionesModal(true)}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-3 h-3" />
            </Button>
          </div>

          {/* Observaciones */}
          {turno.observaciones_semaforo && (
            <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
              <p className="font-medium">Observaciones:</p>
              <p>{turno.observaciones_semaforo}</p>
            </div>
          )}

          {/* Última actualización */}
          {turno.ultima_actualizacion && (
            <p className="text-xs text-gray-400">
              Última actualización: {formatearFecha(turno.ultima_actualizacion)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modal de cambio de estado */}
      <Dialog open={showEstadoModal} onOpenChange={setShowEstadoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Estado del Semáforo</DialogTitle>
            <DialogDescription>
              Actualizar el estado de {turno.guardia_nombre} en {turno.instalacion_nombre}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {estadosSemaforo.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${estado.color}`} />
                        <span>{estado.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Agregar observaciones sobre el estado..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEstadoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEstadoChange} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de observaciones */}
      <Dialog open={showObservacionesModal} onOpenChange={setShowObservacionesModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Observaciones</DialogTitle>
            <DialogDescription>
              Agregar o editar observaciones para {turno.guardia_nombre}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="observaciones-edit">Observaciones</Label>
              <Textarea
                id="observaciones-edit"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Agregar observaciones..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowObservacionesModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleObservacionesSave} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
