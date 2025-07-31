'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Trash2, X } from 'lucide-react';
import { 
  getTurnosInstalacion, 
  getRolesServicio, 
  crearTurnoInstalacion,
  getPPCsInstalacion,
  eliminarTurnoInstalacion
} from '@/lib/api/instalaciones';
import { 
  TurnoInstalacionConDetalles, 
  RolServicio, 
  CrearTurnoInstalacionData 
} from '@/lib/schemas/instalaciones';
import AsignarGuardiaModal from './AsignarGuardiaModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface TurnosInstalacionProps {
  instalacionId: string;
}

interface PPC {
  id: string;
  instalacion_id: string;
  rol_servicio_id: string;
  motivo: string;
  observacion: string | null;
  creado_en: string;
  rol_servicio_nombre: string;
  hora_inicio: string;
  hora_termino: string;
  cantidad_faltante: number;
  estado: string;
}

export default function TurnosInstalacion({ instalacionId }: TurnosInstalacionProps) {
  const { toast } = useToast();
  const [turnos, setTurnos] = useState<TurnoInstalacionConDetalles[]>([]);
  const [rolesServicio, setRolesServicio] = useState<RolServicio[]>([]);
  const [ppcs, setPpcs] = useState<PPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ppcSeleccionado, setPpcSeleccionado] = useState<PPC | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [turnoToDelete, setTurnoToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<CrearTurnoInstalacionData>({
    instalacion_id: instalacionId,
    rol_servicio_id: '',
    cantidad_guardias: 1
  });

  useEffect(() => {
    cargarDatos();
  }, [instalacionId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [turnosData, rolesData, ppcsData] = await Promise.all([
        getTurnosInstalacion(instalacionId),
        getRolesServicio(),
        getPPCsInstalacion(instalacionId)
      ]);
      setTurnos(turnosData);
      setRolesServicio(rolesData);
      setPpcs(ppcsData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('No se pudieron cargar los datos de turnos', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearTurno = async () => {
    if (!formData.rol_servicio_id || formData.cantidad_guardias < 1) {
      toast.error('Por favor completa todos los campos requeridos', 'Error');
      return;
    }

    try {
      setCreando(true);
      await crearTurnoInstalacion(formData);
      
      toast.success(`Turno creado correctamente: ${formData.cantidad_guardias} guardias`, 'Éxito');

      // Limpiar formulario
      setFormData({
        instalacion_id: instalacionId,
        rol_servicio_id: '',
        cantidad_guardias: 1
      });

      // Recargar datos
      await cargarDatos();
    } catch (error) {
      console.error('Error creando turno:', error);
      toast.error('No se pudo crear el turno', 'Error');
    } finally {
      setCreando(false);
    }
  };

  const handleClickPPC = (ppc: PPC) => {
    setPpcSeleccionado(ppc);
    setModalAbierto(true);
  };

  const handleAsignacionCompletada = () => {
    cargarDatos();
  };

  const handleEliminarTurno = (turnoId: string) => {
    setTurnoToDelete(turnoId);
    setDeleteModalOpen(true);
  };

  const confirmarEliminar = async () => {
    try {
      if (turnoToDelete) {
        await eliminarTurnoInstalacion(instalacionId, turnoToDelete);
        toast.success('Turno eliminado correctamente', 'Éxito');
        await cargarDatos(); // Recargar datos para actualizar la vista
      }
    } catch (error) {
      console.error('Error eliminando turno:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el turno', 'Error');
    }
  };

  const formatearHorario = (horaInicio: string, horaTermino: string) => {
    return `${horaInicio} a ${horaTermino}`;
  };

  const formatearCiclo = (diasTrabajo: number, diasDescanso: number) => {
    return `${diasTrabajo}x${diasDescanso}`;
  };

  const getEstadoColor = (guardiasAsignados: number, cantidadGuardias: number, ppcPendientes: number) => {
    if (guardiasAsignados >= cantidadGuardias) return 'bg-green-500';
    if (guardiasAsignados > 0) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getEstadoTexto = (guardiasAsignados: number, cantidadGuardias: number, ppcPendientes: number) => {
    if (guardiasAsignados >= cantidadGuardias) return '✅ Completo';
    if (guardiasAsignados > 0) return '⚠️ Parcial';
    return '❌ Vacante';
  };

  const getPPCsPorRol = (rolServicioId: string) => {
    return ppcs.filter(ppc => ppc.rol_servicio_id === rolServicioId && ppc.estado === 'Pendiente');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Turnos de Instalación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🔄 Turnos de Instalación</span>
          <Badge variant="secondary">{turnos.length} turnos</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Lista de Turnos con PPCs */}
        <div className="space-y-6">
          {turnos.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay turnos configurados para esta instalación
            </div>
          ) : (
            turnos.map((turno) => {
              const ppcsDelRol = getPPCsPorRol(turno.rol_servicio_id);
              
              return (
                <Card key={turno.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{turno.rol_servicio.nombre}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <Badge variant="outline">
                            {formatearCiclo(turno.rol_servicio.dias_trabajo, turno.rol_servicio.dias_descanso)}
                          </Badge>
                          <span>{formatearHorario(turno.rol_servicio.hora_inicio, turno.rol_servicio.hora_termino)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Requeridos</div>
                          <div className="font-bold">{turno.cantidad_guardias}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Asignados</div>
                          <div className="font-bold">{turno.guardias_asignados}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">PPCs</div>
                          <div className="font-bold text-red-600">{turno.ppc_pendientes}</div>
                        </div>
                        <Badge 
                          className={getEstadoColor(
                            turno.guardias_asignados, 
                            turno.cantidad_guardias, 
                            turno.ppc_pendientes
                          )}
                        >
                          {getEstadoTexto(
                            turno.guardias_asignados, 
                            turno.cantidad_guardias, 
                            turno.ppc_pendientes
                          )}
                        </Badge>
                                                  <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEliminarTurno(turno.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Eliminar turno"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* PPCs del Rol */}
                  {ppcsDelRol.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">
                          📋 Puestos Por Cubrir ({ppcsDelRol.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {ppcsDelRol.map((ppc) => (
                            <div
                              key={ppc.id}
                              className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                              onClick={() => handleClickPPC(ppc)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">PPC #{ppc.id.slice(-4)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {ppc.cantidad_faltante} guardia{ppc.cantidad_faltante > 1 ? 's' : ''} faltante{ppc.cantidad_faltante > 1 ? 's' : ''}
                                  </div>
                                </div>
                                <div className="text-xs text-red-600 font-medium">
                                  {ppc.estado}
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-muted-foreground">
                                Creado: {new Date(ppc.creado_en).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Formulario para crear nuevo turno */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">➕ Crear Nuevo Turno</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rol de Servicio</label>
              <Select
                value={formData.rol_servicio_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, rol_servicio_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {rolesServicio.map((rol) => (
                    <SelectItem key={rol.id} value={rol.id}>
                      {rol.nombre} ({formatearCiclo(rol.dias_trabajo, rol.dias_descanso)} - {formatearHorario(rol.hora_inicio, rol.hora_termino)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad de Guardias</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={formData.cantidad_guardias}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  cantidad_guardias: parseInt(e.target.value) || 1 
                }))}
                placeholder="1-20"
              />
            </div>

            <Button 
              onClick={handleCrearTurno}
              disabled={creando || !formData.rol_servicio_id}
              className="w-full"
            >
              {creando ? 'Creando...' : 'Crear Turno'}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Modal para asignar guardias */}
      <AsignarGuardiaModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        instalacionId={instalacionId}
        ppcId={ppcSeleccionado?.id || ''}
        rolServicioNombre={ppcSeleccionado?.rol_servicio_nombre || ''}
        onAsignacionCompletada={handleAsignacionCompletada}
      />

      {/* Modal de confirmación para eliminar */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTurnoToDelete(null);
        }}
        onConfirm={confirmarEliminar}
        title="Eliminar Turno"
        message="¿Estás seguro de que quieres eliminar este turno? Esta acción no se puede deshacer."
        confirmText="Eliminar Turno"
        cancelText="Cancelar"
      />
    </Card>
  );
} 