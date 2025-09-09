"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTurnosExtras } from '@/hooks/useTurnosExtras';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface TurnoExtraModalProps {
  isOpen: boolean;
  onClose: () => void;
  guardia_id: string;
  guardia_nombre: string;
  puesto_id: string;
  puesto_nombre: string;
  pauta_id: string;
  fecha: string;
}

export default function TurnoExtraModal({
  isOpen,
  onClose,
  guardia_id,
  guardia_nombre,
  puesto_id,
  puesto_nombre,
  pauta_id,
  fecha
}: TurnoExtraModalProps) {
  const [estado, setEstado] = useState<'reemplazo' | 'ppc'>('reemplazo');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { registrarTurnoExtra } = useTurnosExtras();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await registrarTurnoExtra({
        guardia_id,
        puesto_id,
        pauta_id,
        estado
      });

      // Cerrar modal después de registro exitoso
      onClose();
      
    } catch (error) {
      logger.error('Error registrando turno extra::', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEstado('reemplazo'); // Reset estado
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Registrar Turno Extra
          </DialogTitle>
          <DialogDescription>
            Registra un turno extra para {guardia_nombre} en {puesto_nombre}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información del guardia */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Guardia</Label>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="font-medium">{guardia_nombre}</p>
              <p className="text-sm text-gray-600">Fecha: {fecha}</p>
            </div>
          </div>

          {/* Información del puesto */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Puesto</Label>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="font-medium">{puesto_nombre}</p>
            </div>
          </div>

          {/* Tipo de turno extra */}
          <div className="space-y-2">
            <Label htmlFor="estado" className="text-sm font-medium">
              Tipo de Turno Extra
            </Label>
            <Select value={estado} onValueChange={(value: 'reemplazo' | 'ppc') => setEstado(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reemplazo">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Reemplazo
                  </div>
                </SelectItem>
                <SelectItem value="ppc">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    PPC (Cobertura)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {estado === 'reemplazo' 
                ? 'Turno para reemplazar a un guardia ausente'
                : 'Turno de cobertura PPC (Puesto de Protección y Control)'
              }
            </p>
          </div>

          {/* Información adicional */}
          <div className="p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Nota:</strong> El valor se calculará automáticamente según la instalación
            </p>
          </div>
        </form>

        <DialogFooter className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Registrar Turno Extra
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 