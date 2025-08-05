'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface TurnoExtraModalProps {
  isOpen: boolean;
  onClose: () => void;
  guardia_id: string;
  guardia_nombre: string;
  puesto_id: string;
  puesto_nombre: string;
  pauta_id: number;
  fecha: string;
}

export function TurnoExtraModal({
  isOpen,
  onClose,
  guardia_id,
  guardia_nombre,
  puesto_id,
  puesto_nombre,
  pauta_id,
  fecha
}: TurnoExtraModalProps) {
  const [estado, setEstado] = useState<'reemplazo' | 'ppc' | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();

  const handleSubmit = async () => {
    if (!estado) {
      toast({
        title: "Error",
        description: "Selecciona el tipo de turno extra",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/pauta-diaria/turno-extra', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guardia_id,
          puesto_id,
          pauta_id,
          estado
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Mostrar alerta compacta
        alert(`✅ Turno extra registrado: $${data.valor} pagado`);
        
        toast({
          title: "Éxito",
          description: data.mensaje,
        });
        
        onClose();
        setEstado('');
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al registrar turno extra",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-lg">Registrar Turno Extra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Guardia:</strong> {guardia_nombre}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Puesto:</strong> {puesto_nombre}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Fecha:</strong> {fecha}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de turno extra</label>
            <Select value={estado} onValueChange={(value: 'reemplazo' | 'ppc') => setEstado(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reemplazo">Reemplazo</SelectItem>
                <SelectItem value="ppc">PPC (Cobertura)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !estado}
              className="flex-1"
            >
              {isLoading ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 