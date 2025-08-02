'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SafeFilterInput } from '@/components/ui/safe-filter-input';
import { SafeSelect } from '@/components/ui/safe-select';
import { SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Search } from 'lucide-react';
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
  const [filtroGuardias, setFiltroGuardias] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [cargandoGuardias, setCargandoGuardias] = useState(true);
  const [selectOpen, setSelectOpen] = useState(false);

  // Función para filtrar guardias por nombre, apellido o RUT
  const guardiasFiltrados = guardias.filter(guardia => {
    if (!filtroGuardias.trim()) return true;
    
    const filtro = filtroGuardias.toLowerCase().trim();
    const nombreCompleto = `${guardia.nombre} ${guardia.apellidos}`.toLowerCase();
    const rut = guardia.rut?.toLowerCase() || '';
    
    // Filtrar por nombre completo (nombre + apellidos)
    if (nombreCompleto.includes(filtro)) return true;
    
    // Filtrar por RUT
    if (rut.includes(filtro)) return true;
    
    // Filtrar por apellidos específicos
    const apellidos = guardia.apellidos?.toLowerCase() || '';
    if (apellidos.includes(filtro)) return true;
    
    // Filtrar por nombre específico
    const nombre = guardia.nombre?.toLowerCase() || '';
    if (nombre.includes(filtro)) return true;
    
    return false;
  });

  // Limpiar estado cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      cargarGuardias();
      // Limpiar filtro al abrir
      setFiltroGuardias('');
    } else {
      // Limpiar estado cuando se cierra el modal
      setGuardiaSeleccionado('');
      setFiltroGuardias('');
      setSelectOpen(false);
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

  const handleClose = () => {
    // Limpiar estado antes de cerrar
    setGuardiaSeleccionado('');
    setFiltroGuardias('');
    setSelectOpen(false);
    onClose();
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
              <SafeSelect 
                value={guardiaSeleccionado} 
                onValueChange={setGuardiaSeleccionado}
                open={selectOpen}
                onOpenChange={setSelectOpen}
                placeholder="Seleccionar guardia"
              >
                <SelectContent>
                  {/* Campo de filtro para guardias */}
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                      <SafeFilterInput
                        placeholder="Filtrar por apellido o RUT..."
                        value={filtroGuardias}
                        onChange={setFiltroGuardias}
                        className="pl-8 h-8 text-xs border-0 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  {guardiasFiltrados.length === 0 ? (
                    <div className="p-2 text-xs text-gray-500">
                      {filtroGuardias ? 'No se encontraron guardias' : 'No hay guardias disponibles'}
                    </div>
                  ) : (
                    guardiasFiltrados.map((guardia) => (
                      <SelectItem key={guardia.id} value={guardia.id}>
                        {guardia.nombre} {guardia.apellidos}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </SafeSelect>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
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