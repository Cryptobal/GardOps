'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, User, DollarSign } from 'lucide-react';

interface EstructuraUnificada {
  id: string;
  tipo: 'servicio' | 'guardia';
  instalacion_nombre?: string;
  guardia_nombre?: string;
  guardia_rut?: string;
  sueldo_base: string | number;
  bono_movilizacion: string | number;
  bono_colacion: string | number;
  bono_responsabilidad: string | number;
  activo: boolean;
}

interface ModalEditarEstructuraProps {
  estructura: EstructuraUnificada | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (estructuraEditada: EstructuraUnificada) => void;
}

export default function ModalEditarEstructura({ estructura, isOpen, onClose, onSave }: ModalEditarEstructuraProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [formData, setFormData] = useState({
    sueldo_base: '',
    bono_movilizacion: '',
    bono_colacion: '',
    bono_responsabilidad: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (estructura) {
      // Formatear los números con separadores de miles sin decimales
      const formatValue = (value: string | number) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(numValue) ? '0' : Math.round(numValue).toLocaleString('es-CL');
      };

      setFormData({
        sueldo_base: formatValue(estructura.sueldo_base),
        bono_movilizacion: formatValue(estructura.bono_movilizacion),
        bono_colacion: formatValue(estructura.bono_colacion),
        bono_responsabilidad: formatValue(estructura.bono_responsabilidad)
      });
    }
  }, [estructura]);

  const formatNumber = (value: string) => {
    // Remover todos los caracteres no numéricos
    const cleanValue = value.replace(/[^\d]/g, '');
    // Convertir a número y formatear sin decimales
    const number = parseInt(cleanValue) || 0;
    return number.toLocaleString('es-CL');
  };

  const handleInputChange = (field: string, value: string) => {
    // Permitir hasta 9 dígitos (999,999,999)
    const cleanValue = value.replace(/[^\d]/g, '');
    if (cleanValue.length > 9) return; // Limitar a 9 dígitos
    
    const formattedValue = formatNumber(cleanValue);
    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  const handleSave = async () => {
    if (!estructura) return;

    setLoading(true);
    try {
      // Convertir valores formateados a números (sin decimales)
      const estructuraEditada = {
        ...estructura,
        sueldo_base: parseInt(formData.sueldo_base.replace(/\./g, '')) || 0,
        bono_movilizacion: parseInt(formData.bono_movilizacion.replace(/\./g, '')) || 0,
        bono_colacion: parseInt(formData.bono_colacion.replace(/\./g, '')) || 0,
        bono_responsabilidad: parseInt(formData.bono_responsabilidad.replace(/\./g, '')) || 0
      };

      await onSave(estructuraEditada);
      toastSuccess("Éxito", "Estructura actualizada correctamente");
      onClose();
    } catch (error) {
      console.error('Error al guardar:', error);
      toastError("Error", "No se pudo actualizar la estructura");
    } finally {
      setLoading(false);
    }
  };

  if (!estructura) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {estructura.tipo === 'servicio' ? (
              <Building2 className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
            Editar Estructura de {estructura.tipo === 'servicio' ? 'Servicio' : 'Guardia'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la estructura */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">
              {estructura.tipo === 'servicio' ? (
                <div>
                  <strong>Instalación:</strong> {estructura.instalacion_nombre || 'Sin instalación'}
                </div>
              ) : (
                <div>
                  <strong>Guardia:</strong> {estructura.guardia_nombre || 'Sin nombre'}
                  <br />
                  <strong>RUT:</strong> {estructura.guardia_rut || 'Sin RUT'}
                </div>
              )}
            </div>
          </div>

          {/* Sueldo Base */}
          <div>
            <Label htmlFor="sueldo_base" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Sueldo Base
            </Label>
            <Input
              id="sueldo_base"
              value={formData.sueldo_base}
              onChange={(e) => handleInputChange('sueldo_base', e.target.value)}
              placeholder="0"
              className="mt-1"
            />
          </div>

          {/* Bonos */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Bonos</Label>
            
            <div>
              <Label htmlFor="bono_movilizacion" className="text-sm">Movilización</Label>
              <Input
                id="bono_movilizacion"
                value={formData.bono_movilizacion}
                onChange={(e) => handleInputChange('bono_movilizacion', e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="bono_colacion" className="text-sm">Colación</Label>
              <Input
                id="bono_colacion"
                value={formData.bono_colacion}
                onChange={(e) => handleInputChange('bono_colacion', e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="bono_responsabilidad" className="text-sm">Responsabilidad</Label>
              <Input
                id="bono_responsabilidad"
                value={formData.bono_responsabilidad}
                onChange={(e) => handleInputChange('bono_responsabilidad', e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
