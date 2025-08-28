'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Building2,
  User,
  Users,
  DollarSign,
  Eye,
  EyeOff,
  Power,
  PowerOff,
  Settings,
  AlertCircle,
  Calendar,
  Clock,
  Star,
  Shield,
  ArrowUp,
  ArrowDown,
  Info,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ModalEditarEstructura from './ModalEditarEstructura';
import ModalConfirmarAccion from './ModalConfirmarAccion';
import ModalEliminarEstructura from './ModalEliminarEstructura';

interface FiltrosUnificados {
  instalacion: string;
  rol: string;
  tipo: 'todos' | 'servicio' | 'guardia';
  guardia: string;
  estado: 'todos' | 'activos' | 'inactivos';
}

interface EstructuraUnificada {
  id: string;
  tipo: 'servicio' | 'guardia';
  prioridad: string;
  
  // Datos comunes
  instalacion_id?: string;
  instalacion_nombre?: string;
  rol_servicio_id?: string;
  rol_nombre?: string;
  sueldo_base: string | number;
  bono_movilizacion: string | number;
  bono_colacion: string | number;
  bono_responsabilidad: string | number;
  bonos_detalle: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_inactivacion?: string | null;
  
  // Datos específicos de servicio
  dias_trabajo?: number;
  dias_descanso?: number;
  hora_inicio?: string;
  hora_termino?: string;
  
  // Datos específicos de guardia
  guardia_id?: string;
  guardia_nombre?: string;
  guardia_rut?: string;
}

interface VistaUnificadaTabProps {
  filtros: FiltrosUnificados;
}

export default function VistaUnificadaTab({ filtros }: VistaUnificadaTabProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [estructuras, setEstructuras] = useState<EstructuraUnificada[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  
  // Estados para modales
  const [modalEditar, setModalEditar] = useState<{ isOpen: boolean; estructura: EstructuraUnificada | null }>({
    isOpen: false,
    estructura: null
  });
  const [modalConfirmar, setModalConfirmar] = useState<{ isOpen: boolean; estructura: EstructuraUnificada | null }>({
    isOpen: false,
    estructura: null
  });
  const [modalEliminar, setModalEliminar] = useState<{ isOpen: boolean; estructura: EstructuraUnificada | null }>({
    isOpen: false,
    estructura: null
  });
  const [loadingAccion, setLoadingAccion] = useState(false);

  // Cargar estructuras unificadas
  useEffect(() => {
    cargarEstructurasUnificadas();
  }, [filtros]);

  const cargarEstructurasUnificadas = async () => {
    setLoading(true);
    try {
      // Construir URL con filtros
      const params = new URLSearchParams();
      if (filtros.instalacion !== 'todas') params.append('instalacion_id', filtros.instalacion);
      if (filtros.rol !== 'todos') params.append('rol_id', filtros.rol);
      if (filtros.guardia !== 'todos') params.append('guardia_id', filtros.guardia);
      if (filtros.tipo !== 'todos') params.append('tipo', filtros.tipo);
      if (filtros.prioridad !== 'todos') params.append('prioridad', filtros.prioridad);
      if (filtros.estado !== 'todos') params.append('estado', filtros.estado);

      const response = await fetch(`/api/payroll/estructuras-unificadas?${params}`);
      const data = await response.json();
      if (data.success) {
        setEstructuras(data.data);
      }
    } catch (error) {
      console.error('Error cargando estructuras unificadas:', error);
      toastError("Error", "No se pudieron cargar las estructuras unificadas");
    } finally {
      setLoading(false);
    }
  };

  const filtrarEstructuras = (estructuras: EstructuraUnificada[]) => {
    if (!estructuras || !Array.isArray(estructuras)) {
      return [];
    }
    return estructuras.filter(estructura => {
      // Filtro por instalación
      if (filtros.instalacion !== 'todas' && estructura.instalacion_id !== filtros.instalacion) {
        return false;
      }

      // Filtro por rol
      if (filtros.rol !== 'todos' && estructura.rol_servicio_id !== filtros.rol) {
        return false;
      }

      // Filtro por tipo
      if (filtros.tipo !== 'todos' && estructura.tipo !== filtros.tipo) {
        return false;
      }

      // Filtro por guardia
      if (filtros.guardia !== 'todos' && estructura.guardia_id !== filtros.guardia) {
        return false;
      }

      // Filtro por estado
      if (filtros.estado === 'activos' && !estructura.activo) {
        return false;
      }
      if (filtros.estado === 'inactivos' && estructura.activo) {
        return false;
      }

      return true;
    });
  };

  const estructurasFiltradas = filtrarEstructuras(estructuras || []);

  // Funciones para manejar acciones
  const handleEditar = (estructura: EstructuraUnificada) => {
    setModalEditar({ isOpen: true, estructura });
  };

  const handleActivarInactivar = (estructura: EstructuraUnificada) => {
    setModalConfirmar({ isOpen: true, estructura });
  };

  const handleEliminar = (estructura: EstructuraUnificada) => {
    setModalEliminar({ isOpen: true, estructura });
  };

  const handleGuardarEdicion = async (estructuraEditada: EstructuraUnificada) => {
    setLoadingAccion(true);
    try {
      console.log('Enviando datos para editar:', estructuraEditada);
      
      const response = await fetch('/api/payroll/estructuras-unificadas/editar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estructuraEditada)
      });

      const data = await response.json();
      console.log('Respuesta del servidor:', data);
      
      if (data.success) {
        await cargarEstructurasUnificadas();
        toastSuccess("Éxito", data.message);
      } else {
        toastError("Error", data.error);
      }
    } catch (error) {
      console.error('Error al editar:', error);
      toastError("Error", "No se pudo editar la estructura");
    } finally {
      setLoadingAccion(false);
    }
  };

  const handleConfirmarAccion = async () => {
    if (!modalConfirmar.estructura) return;

    setLoadingAccion(true);
    try {
      const payload = {
        id: modalConfirmar.estructura.id,
        tipo: modalConfirmar.estructura.tipo,
        activo: !modalConfirmar.estructura.activo
      };
      
      console.log('Enviando datos para cambiar estado:', payload);
      
      const response = await fetch('/api/payroll/estructuras-unificadas/estado', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('Respuesta del servidor:', data);
      
      if (data.success) {
        await cargarEstructurasUnificadas();
        toastSuccess("Éxito", data.message);
      } else {
        toastError("Error", data.error);
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toastError("Error", "No se pudo cambiar el estado de la estructura");
    } finally {
      setLoadingAccion(false);
      setModalConfirmar({ isOpen: false, estructura: null });
    }
  };

  const handleConfirmarEliminacion = async () => {
    if (!modalEliminar.estructura) return;

    setLoadingAccion(true);
    try {
      const url = `/api/payroll/estructuras-unificadas/eliminar?id=${modalEliminar.estructura.id}&tipo=${modalEliminar.estructura.tipo}`;
      console.log('Enviando solicitud de eliminación a:', url);
      
      const response = await fetch(url, {
        method: 'DELETE'
      });

      const data = await response.json();
      console.log('Respuesta del servidor:', data);
      
      if (data.success) {
        await cargarEstructurasUnificadas();
        toastSuccess("Éxito", data.message);
      } else {
        toastError("Error", data.error);
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      toastError("Error", "No se pudo eliminar la estructura");
    } finally {
      setLoadingAccion(false);
      setModalEliminar({ isOpen: false, estructura: null });
    }
  };

  const getTipoIcon = (tipo: 'servicio' | 'guardia') => {
    return tipo === 'servicio' ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  const getPrioridadBadge = (prioridad: string) => {
    if (prioridad.includes('Personal')) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{prioridad}</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{prioridad}</Badge>;
    }
  };

  const getTipoBadge = (tipo: 'servicio' | 'guardia') => {
    if (tipo === 'servicio') {
      return <Badge variant="outline" className="flex items-center gap-1">🏗️ Servicio</Badge>;
    } else {
      return <Badge variant="outline" className="flex items-center gap-1">👤 Guardia</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Cargando vista unificada...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del tab */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Eye className="h-6 w-6" />
            Vista Unificada
          </h2>
          <p className="text-muted-foreground">
            Vista consolidada de todas las estructuras con indicadores de prioridad
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {estructurasFiltradas.length} estructuras
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {estructurasFiltradas.filter(e => e.prioridad.includes('Personal')).length} personal
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            {estructurasFiltradas.filter(e => e.prioridad.includes('Servicio')).length} servicio
          </Badge>
        </div>
      </div>



      {/* Tabla unificada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Estructuras Unificadas ({estructurasFiltradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {estructurasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron estructuras</p>
              <p className="text-sm">Ajusta los filtros o crea nuevas estructuras</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Instalación/Rol</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Sueldo Base</TableHead>
                    <TableHead>Bonos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estructurasFiltradas.map((estructura) => {
                    const isEditing = editingRow === estructura.id;
                    const isSaving = savingRow === estructura.id;

                    return (
                      <TableRow 
                        key={estructura.id}
                        className={estructura.prioridad.includes('Personal') ? 'bg-green-50 dark:bg-green-950/20' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTipoIcon(estructura.tipo)}
                            <span className="font-medium text-sm">
                              {estructura.tipo === 'servicio' ? 'Servicio' : 'Guardia'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {estructura.tipo === 'servicio' ? (
                            <div>
                              <div className="font-medium">{estructura.instalacion_nombre || 'Sin instalación'}</div>
                              <div className="text-sm text-muted-foreground">Estructura de Servicio</div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium">{estructura.guardia_nombre || 'Sin nombre'}</div>
                              <div className="text-sm text-muted-foreground">{estructura.guardia_rut || 'Sin RUT'}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{estructura.instalacion_nombre || 'Sin asignar'}</div>
                            <div className="text-sm text-muted-foreground">{estructura.rol_nombre || 'Sin rol'}</div>
                            {estructura.tipo === 'servicio' && estructura.dias_trabajo && (
                              <div className="text-xs text-muted-foreground">
                                {estructura.dias_trabajo}x{estructura.dias_descanso} • {estructura.hora_inicio}-{estructura.hora_termino}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Creado: {format(new Date(estructura.fecha_creacion), 'dd/MM/yyyy', { locale: es })}</span>
                            </div>
                            {estructura.fecha_inactivacion && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Inactivo: {format(new Date(estructura.fecha_inactivacion), 'dd/MM/yyyy', { locale: es })}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-medium text-sm">
                            ${parseFloat(estructura.sueldo_base || 0).toLocaleString('es-CL')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {(parseFloat(estructura.bono_movilizacion || 0) > 0) && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Movilización:</span>
                                <span className="ml-1 font-mono text-sm">${parseFloat(estructura.bono_movilizacion || 0).toLocaleString('es-CL')}</span>
                              </div>
                            )}
                            {(parseFloat(estructura.bono_colacion || 0) > 0) && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Colación:</span>
                                <span className="ml-1 font-mono text-sm">${parseFloat(estructura.bono_colacion || 0).toLocaleString('es-CL')}</span>
                              </div>
                            )}
                            {(parseFloat(estructura.bono_responsabilidad || 0) > 0) && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Responsabilidad:</span>
                                <span className="ml-1 font-mono text-sm">${parseFloat(estructura.bono_responsabilidad || 0).toLocaleString('es-CL')}</span>
                              </div>
                            )}
                            {(parseFloat(estructura.bono_movilizacion || 0) + parseFloat(estructura.bono_colacion || 0) + parseFloat(estructura.bono_responsabilidad || 0)) === 0 && (
                              <div className="text-sm text-muted-foreground">Sin bonos</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <div 
                              className={`w-3 h-3 rounded-full ${
                                estructura.activo 
                                  ? 'bg-green-500' 
                                  : 'bg-red-500'
                              }`}
                              title={estructura.activo ? 'Activo' : 'Inactivo'}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditar(estructura)}
                              title="Editar estructura"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant={estructura.activo ? "outline" : "default"}
                              className="h-8 w-8 p-0"
                              onClick={() => handleActivarInactivar(estructura)}
                              title={estructura.activo ? "Inactivar estructura" : "Activar estructura"}
                            >
                              {estructura.activo ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleEliminar(estructura)}
                              title="Eliminar estructura"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <ModalEditarEstructura
        estructura={modalEditar.estructura}
        isOpen={modalEditar.isOpen}
        onClose={() => setModalEditar({ isOpen: false, estructura: null })}
        onSave={handleGuardarEdicion}
      />

      <ModalConfirmarAccion
        estructura={modalConfirmar.estructura}
        isOpen={modalConfirmar.isOpen}
        onClose={() => setModalConfirmar({ isOpen: false, estructura: null })}
        onConfirm={handleConfirmarAccion}
        loading={loadingAccion}
      />

      <ModalEliminarEstructura
        estructura={modalEliminar.estructura}
        isOpen={modalEliminar.isOpen}
        onClose={() => setModalEliminar({ isOpen: false, estructura: null })}
        onConfirm={handleConfirmarEliminacion}
        loading={loadingAccion}
      />

    </div>
  );
}
