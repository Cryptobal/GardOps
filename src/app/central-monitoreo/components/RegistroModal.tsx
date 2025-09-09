import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  CheckCircle, XCircle, Phone, AlertTriangle, X
} from 'lucide-react';

interface Llamado {
  id: string;
  instalacion_nombre: string;
  guardia_nombre: string | null;
  programado_para: string;
}

interface RegistroModalProps {
  isOpen: boolean;
  onClose: () => void;
  llamado: Llamado | null;
  onRegistrar: (estado: string, observaciones: string) => void;
}

export function RegistroModal({ isOpen, onClose, llamado, onRegistrar }: RegistroModalProps) {
  const [estado, setEstado] = React.useState('exitoso');
  const [observaciones, setObservaciones] = React.useState('');
  
  const estados = [
    { 
      value: 'exitoso', 
      label: 'Exitoso', 
      icon: CheckCircle,
      color: 'text-green-600',
      description: 'Contacto realizado, todo en orden'
    },
    { 
      value: 'no_contesta', 
      label: 'No contesta', 
      icon: XCircle,
      color: 'text-yellow-600',
      description: 'No hubo respuesta al llamado'
    },
    { 
      value: 'ocupado', 
      label: 'Ocupado', 
      icon: Phone,
      color: 'text-blue-600',
      description: 'Línea ocupada'
    },
    { 
      value: 'incidente', 
      label: 'Incidente', 
      icon: AlertTriangle,
      color: 'text-orange-600',
      description: 'Se reportó algún problema'
    },
    { 
      value: 'cancelado', 
      label: 'Cancelado', 
      icon: X,
      color: 'text-gray-600',
      description: 'Llamado cancelado'
    }
  ];
  
  const handleRegistrar = () => {
    onRegistrar(estado, observaciones);
    setEstado('exitoso');
    setObservaciones('');
    onClose();
  };
  
  if (!llamado) return null;
  
  const formatearHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>📞 Registrar Llamado</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-2 space-y-1">
              <div><strong>Instalación:</strong> {llamado.instalacion_nombre}</div>
              {llamado.guardia_nombre && (
                <div><strong>Guardia:</strong> {llamado.guardia_nombre}</div>
              )}
              <div><strong>Hora programada:</strong> {formatearHora(llamado.programado_para)}</div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Estado del llamado</Label>
            <div className="space-y-2">
              {estados.map((est) => (
                <div 
                  key={est.value} 
                  className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer border-2 ${
                    estado === est.value 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => setEstado(est.value)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <est.icon className={`h-4 w-4 ${est.color}`} />
                      <span className="font-medium">{est.label}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {est.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="observaciones">
              Observaciones {estado === 'incidente' && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="observaciones"
              placeholder={
                estado === 'incidente' 
                  ? "Describa el incidente reportado..." 
                  : "Agregue observaciones adicionales (opcional)..."
              }
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={4}
              className={estado === 'incidente' && !observaciones ? 'border-red-500' : ''}
            />
            {estado === 'incidente' && !observaciones && (
              <div className="text-sm text-red-500">
                Las observaciones son obligatorias para incidentes
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleRegistrar}
            disabled={estado === 'incidente' && !observaciones}
          >
            Registrar Llamado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
