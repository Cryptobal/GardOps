"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import { Search, AlertTriangle, User, UserCheck } from 'lucide-react';
import { asignarGuardiaPPC } from '@/lib/api/instalaciones';
import ConfirmacionReasignacionModal from '@/components/ui/confirmacion-reasignacion-modal';

interface AsignarGuardiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  instalacionId: string;
  ppcId: string;
  rolServicioNombre: string;
  instalacionNombre: string;
  onAsignacionCompletada: () => void;
}

export default function AsignarGuardiaModal({
  isOpen,
  onClose,
  instalacionId,
  ppcId,
  rolServicioNombre,
  instalacionNombre,
  onAsignacionCompletada
}: AsignarGuardiaModalProps) {
  const { toast } = useToast();
  const [guardias, setGuardias] = useState<any[]>([]);
  const [guardiaSeleccionado, setGuardiaSeleccionado] = useState<string>('');
  const [filtroGuardias, setFiltroGuardias] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [cargandoGuardias, setCargandoGuardias] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [guardiaConAdvertencia, setGuardiaConAdvertencia] = useState<any>(null);
  const [showConfirmacionModal, setShowConfirmacionModal] = useState(false);
  const [asignacionActual, setAsignacionActual] = useState<any>(null);

  // Función para filtrar guardias por nombre, apellido o RUT
  const guardiasFiltrados = guardias.filter(guardia => {
    if (!filtroGuardias.trim()) return true;
    
    const filtro = filtroGuardias.toLowerCase().trim();
    const nombreCompleto = guardia.nombre_completo?.toLowerCase() || '';
    const rut = guardia.rut?.toLowerCase() || '';
    
    // Filtrar por nombre completo
    if (nombreCompleto.includes(filtro)) return true;
    
    // Filtrar por RUT
    if (rut.includes(filtro)) return true;
    
    // Filtrar por apellidos específicos
    const apellidoPaterno = guardia.apellido_paterno?.toLowerCase() || '';
    const apellidoMaterno = guardia.apellido_materno?.toLowerCase() || '';
    if (apellidoPaterno.includes(filtro) || apellidoMaterno.includes(filtro)) return true;
    
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
      setShowWarning(false);
      setGuardiaConAdvertencia(null);
    } else {
      // Limpiar estado cuando se cierra el modal
      setGuardiaSeleccionado('');
      setFiltroGuardias('');
      setShowWarning(false);
      setGuardiaConAdvertencia(null);
    }
  }, [isOpen]);

  const cargarGuardias = async () => {
    try {
      setCargandoGuardias(true);
      const fecha = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD
      const params = new URLSearchParams({
        fecha,
        instalacion_id: instalacionId
      });
      
      const response = await fetch(`/api/guardias/disponibles?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Error al obtener guardias disponibles');
      }
      const guardiasData = await response.json();
      const guardiasFinales = guardiasData.items || guardiasData.guardias || guardiasData;
      setGuardias(guardiasFinales);
    } catch (error) {
      logger.error('Error cargando guardias::', error);
      toast.error('No se pudieron cargar los guardias', 'Error');
    } finally {
      setCargandoGuardias(false);
    }
  };

  const handleGuardiaSeleccionado = (value: string) => {
    const guardia = guardias.find(g => g.id === value);
    
    if (guardia && guardia.instalacion_actual_id && guardia.instalacion_actual_id !== instalacionId) {
      // Guardia ya asignado a otra instalación
      setGuardiaConAdvertencia(guardia);
      setShowWarning(true);
    } else {
      setShowWarning(false);
      setGuardiaConAdvertencia(null);
    }
    
    setGuardiaSeleccionado(value);
  };

  const handleAsignar = async () => {
    if (!guardiaSeleccionado) {
      toast.error('Por favor selecciona un guardia', 'Error');
      return;
    }

    try {
      setLoading(true);
      
      // Intentar asignar el guardia
      const response = await fetch('/api/ppc/asignar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guardia_id: guardiaSeleccionado,
          puesto_operativo_id: ppcId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.requiere_confirmacion) {
          // El guardia ya está asignado, mostrar modal de confirmación
          setAsignacionActual(data.asignacion_actual);
          setShowConfirmacionModal(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Error al asignar guardia');
      }
      
      toast.success('Guardia asignado correctamente', 'Éxito');
      onAsignacionCompletada();
      onClose();
    } catch (error) {
      logger.error('Error asignando guardia::', error);
      toast.error('No se pudo asignar el guardia', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarReasignacion = async () => {
    if (!guardiaSeleccionado) return;

    try {
      setLoading(true);
      
      // Asignar con confirmación de reasignación
      const response = await fetch('/api/ppc/asignar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guardia_id: guardiaSeleccionado,
          puesto_operativo_id: ppcId,
          confirmar_reasignacion: true
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al reasignar guardia');
      }
      
      toast.success('Guardia reasignado correctamente', 'Éxito');
      onAsignacionCompletada();
      setShowConfirmacionModal(false);
      onClose();
    } catch (error) {
      logger.error('Error reasignando guardia::', error);
      toast.error('No se pudo reasignar el guardia', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Limpiar estado antes de cerrar
    setGuardiaSeleccionado('');
    setFiltroGuardias('');
    setShowWarning(false);
    setGuardiaConAdvertencia(null);
    setShowConfirmacionModal(false);
    setAsignacionActual(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Seleccionar Guardia</CardTitle>
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
              <Select value={guardiaSeleccionado} onValueChange={handleGuardiaSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar guardia" />
                </SelectTrigger>
                <SelectContent>
                  {/* Campo de filtro para guardias */}
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                      <input
                        type="text"
                        value={filtroGuardias}
                        onChange={(e) => setFiltroGuardias(e.target.value)}
                        placeholder="Buscar por nombre o RUT..."
                        className="w-full pl-8 h-8 text-xs border-0 focus-visible:ring-0 bg-transparent placeholder:text-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-0 focus:border-0"
                      />
                    </div>
                  </div>
                  {guardiasFiltrados.length === 0 ? (
                    <div className="p-2 text-xs text-gray-500">
                      {filtroGuardias ? 'No se encontraron guardias' : 'No hay guardias disponibles'}
                    </div>
                  ) : (
                    guardiasFiltrados.map((guardia) => {
                      const estaAsignado = guardia.instalacion_actual_id && guardia.instalacion_actual_id !== instalacionId;
                      
                      return (
                        <SelectItem key={guardia.id} value={guardia.id}>
                          <div className="flex items-center gap-2 w-full">
                            {estaAsignado ? (
                              <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            ) : (
                              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {guardia.nombre_completo || `${guardia.nombre} ${guardia.apellido_paterno}`}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                RUT: {guardia.rut}
                                {estaAsignado && (
                                  <span className="text-orange-600 ml-2">
                                    • Asignado a {guardia.instalacion_actual_nombre}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Advertencia cuando se selecciona un guardia ya asignado */}
          {showWarning && guardiaConAdvertencia && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>Advertencia:</strong> Este guardia ya está asignado a{' '}
                <strong>{guardiaConAdvertencia.instalacion_actual_nombre}</strong>.
                Al asignarlo a esta instalación, se cambiará su asignación actual.
              </AlertDescription>
            </Alert>
          )}

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

      {/* Modal de confirmación de reasignación */}
      {showConfirmacionModal && asignacionActual && (
        <ConfirmacionReasignacionModal
          isOpen={showConfirmacionModal}
          onClose={() => setShowConfirmacionModal(false)}
          onConfirmar={handleConfirmarReasignacion}
          guardiaNombre={guardias.find(g => g.id === guardiaSeleccionado)?.nombre_completo || 'Guardia'}
          asignacionActual={asignacionActual}
          nuevaInstalacionNombre={instalacionNombre}
          nuevoRolServicioNombre={rolServicioNombre}
        />
      )}
    </>
  );
} 