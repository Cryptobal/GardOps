'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { asignarGuardiaPPC } from '@/lib/api/instalaciones';

interface AsignarGuardiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  instalacionId: string;
  ppcId: string;
  rolServicioNombre: string;
  onAsignacionCompletada: () => void;
}

export default function AsignarGuardiaModal({
  isOpen,
  onClose,
  instalacionId,
  ppcId,
  rolServicioNombre,
  onAsignacionCompletada
}: AsignarGuardiaModalProps) {
  const { toast } = useToast();
  const [guardias, setGuardias] = useState<any[]>([]);
  const [guardiaSeleccionado, setGuardiaSeleccionado] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [cargandoGuardias, setCargandoGuardias] = useState(true);

  useEffect(() => {
    if (isOpen) {
      cargarGuardias();
    }
  }, [isOpen]);

  const cargarGuardias = async () => {
    try {
      setCargandoGuardias(true);
      const response = await fetch('/api/guardias');
      if (!response.ok) {
        throw new Error('Error al obtener guardias');
      }
      const guardiasData = await response.json();
      setGuardias(guardiasData);
    } catch (error) {
      console.error('Error cargando guardias:', error);
      toast.error('No se pudieron cargar los guardias', 'Error');
    } finally {
      setCargandoGuardias(false);
    }
  };

  const handleAsignar = async () => {
    if (!guardiaSeleccionado) {
      toast.error('Por favor selecciona un guardia', 'Error');
      return;
    }

    try {
      setLoading(true);
      await asignarGuardiaPPC(instalacionId, ppcId, guardiaSeleccionado);
      
      toast.success('Guardia asignado correctamente', 'Éxito');
      onAsignacionCompletada();
      onClose();
    } catch (error) {
      console.error('Error asignando guardia:', error);
      toast.error('No se pudo asignar el guardia', 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Asignar Guardia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Rol de Servicio:</label>
            <p className="text-sm text-muted-foreground">{rolServicioNombre}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium">Seleccionar Guardia:</label>
            {cargandoGuardias ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : (
              <Select value={guardiaSeleccionado} onValueChange={setGuardiaSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar guardia" />
                </SelectTrigger>
                <SelectContent>
                  {guardias.map((guardia) => (
                    <SelectItem key={guardia.id} value={guardia.id}>
                      {guardia.nombre} {guardia.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleAsignar} disabled={loading || !guardiaSeleccionado}>
              {loading ? 'Asignando...' : 'Asignar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 