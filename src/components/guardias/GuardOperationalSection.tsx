'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalHeader, ModalFooter } from '@/components/ui/modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Building, 
  Clock, 
  MapPin, 
  Calendar,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface GuardOperationalSectionProps {
  guardia: any;
}

interface Asignacion {
  id: string;
  instalacion_nombre: string;
  rol_servicio_nombre: string;
  fecha_inicio: string;
  fecha_termino?: string;
  estado: string;
  tipo_asignacion: string;
  es_actual: boolean;
  duracion_dias: number;
}

interface PPC {
  ppc_id: string;
  instalacion_nombre: string;
  rol_servicio_nombre: string;
  motivo: string;
  created_at: string;
}

export default function GuardOperationalSection({ guardia }: GuardOperationalSectionProps) {
  const { toast } = useToast();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [asignacionActual, setAsignacionActual] = useState<Asignacion | null>(null);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para reasignación
  const [showReasignarModal, setShowReasignarModal] = useState(false);
  const [ppcsDisponibles, setPpcsDisponibles] = useState<PPC[]>([]);
  const [ppcSeleccionado, setPpcSeleccionado] = useState('');
  const [motivoReasignacion, setMotivoReasignacion] = useState('');
  const [reasignando, setReasignando] = useState(false);

  useEffect(() => {
    if (guardia?.id) {
      cargarAsignaciones();
    }
  }, [guardia?.id]);

  const cargarAsignaciones = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/guardias/${guardia.id}/asignaciones`);
      if (response.ok) {
        const data = await response.json();
        setAsignaciones(data.asignaciones);
        setAsignacionActual(data.asignacion_actual);
        setEstadisticas(data.estadisticas);
      } else {
        toast.error('Error cargando asignaciones', 'Error');
      }
    } catch (error) {
      console.error('Error cargando asignaciones:', error);
      toast.error('Error cargando asignaciones', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const cargarPPCsDisponibles = async () => {
    try {
      const response = await fetch(`/api/guardias/${guardia.id}/reasignar`);
      if (response.ok) {
        const data = await response.json();
        setPpcsDisponibles(data.ppcs_disponibles);
      } else {
        toast.error('Error cargando PPCs disponibles', 'Error');
      }
    } catch (error) {
      console.error('Error cargando PPCs:', error);
      toast.error('Error cargando PPCs disponibles', 'Error');
    }
  };

  const handleReasignar = async () => {
    if (!ppcSeleccionado) {
      toast.error('Debe seleccionar un PPC para reasignar', 'Error');
      return;
    }

    try {
      setReasignando(true);
      const response = await fetch(`/api/guardias/${guardia.id}/reasignar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nuevo_ppc_id: ppcSeleccionado,
          motivo_reasignacion: motivoReasignacion
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message, 'Éxito');
        setShowReasignarModal(false);
        setPpcSeleccionado('');
        setMotivoReasignacion('');
        await cargarAsignaciones(); // Recargar datos
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error en reasignación', 'Error');
      }
    } catch (error) {
      console.error('Error reasignando guardia:', error);
      toast.error('Error en reasignación', 'Error');
    } finally {
      setReasignando(false);
    }
  };

  const getStatusBadge = (estado: string, esActual: boolean = false) => {
    if (esActual) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Activo</Badge>;
    }
    
    switch (estado) {
      case 'Activa':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Activa</Badge>;
      case 'Finalizada':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Finalizada</Badge>;
      case 'Cancelada':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Cargando asignaciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Asignación Actual */}
      {asignacionActual && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-green-800">
              <span className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Asignación Actual
              </span>
              {getStatusBadge(asignacionActual.estado, true)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Instalación</label>
                <p className="text-lg font-semibold text-green-800">
                  {asignacionActual.instalacion_nombre}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Rol de Servicio</label>
                <p className="text-lg">{asignacionActual.rol_servicio_nombre}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Fecha de Asignación</label>
                <p className="text-lg">{formatDate(asignacionActual.fecha_asignacion)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Duración</label>
                <p className="text-lg">{asignacionActual.duracion_dias} días</p>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <Button 
                onClick={() => {
                  setShowReasignarModal(true);
                  cargarPPCsDisponibles();
                }}
                variant="outline"
                size="sm"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Reasignar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sin Asignación Actual */}
      {!asignacionActual && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              Sin Asignación Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700">
              El guardia no tiene una asignación activa actualmente.
            </p>
            <div className="mt-4">
              <Button 
                onClick={() => {
                  setShowReasignarModal(true);
                  cargarPPCsDisponibles();
                }}
                variant="outline"
                size="sm"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Asignar a PPC
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      {estadisticas && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Estadísticas de Asignaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{estadisticas.total_asignaciones}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{estadisticas.asignaciones_activas}</div>
                <div className="text-sm text-gray-600">Activas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{estadisticas.asignaciones_finalizadas}</div>
                <div className="text-sm text-gray-600">Finalizadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{estadisticas.reasignaciones}</div>
                <div className="text-sm text-gray-600">Reasignaciones</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Asignaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Historial de Asignaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {asignaciones.length > 0 ? (
            <div className="space-y-4">
              {asignaciones.map((asignacion, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{asignacion.instalacion_nombre}</span>
                    </div>
                    {getStatusBadge(asignacion.estado, asignacion.es_actual)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Rol:</span> {asignacion.rol_servicio_nombre}
                    </div>
                    <div>
                      <span className="font-medium">Inicio:</span> {formatDate(asignacion.fecha_inicio)}
                    </div>
                    <div>
                      <span className="font-medium">Duración:</span> {asignacion.duracion_dias} días
                    </div>
                  </div>
                  
                  {asignacion.tipo_asignacion && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {asignacion.tipo_asignacion}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay historial de asignaciones</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Reasignación */}
      <Modal isOpen={showReasignarModal} onClose={() => setShowReasignarModal(false)} size="lg">
        <ModalHeader 
          title="Reasignar Guardia"
          onClose={() => setShowReasignarModal(false)}
        />
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PPC Disponible
            </label>
            <Select value={ppcSeleccionado} onValueChange={setPpcSeleccionado}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar PPC" />
              </SelectTrigger>
              <SelectContent>
                {ppcsDisponibles.map((ppc) => (
                  <SelectItem key={ppc.ppc_id} value={ppc.ppc_id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{ppc.instalacion_nombre}</span>
                      <span className="text-sm text-gray-500">
                        {ppc.rol_servicio_nombre} - {ppc.motivo}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de Reasignación (opcional)
            </label>
            <Textarea
              value={motivoReasignacion}
              onChange={(e) => setMotivoReasignacion(e.target.value)}
              placeholder="Especificar motivo de la reasignación..."
              rows={3}
            />
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowReasignarModal(false)}
            disabled={reasignando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleReasignar}
            disabled={!ppcSeleccionado || reasignando}
          >
            {reasignando ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Reasignando...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Reasignar
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
} 