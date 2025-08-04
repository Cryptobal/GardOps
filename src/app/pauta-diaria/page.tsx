'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  UserPlus, 
  AlertTriangle, 
  FileText, 
  Edit, 
  MapPin, 
  Clock, 
  User,
  Shield,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useGuardiasSearch } from '@/hooks/useGuardiasSearch';

interface Turno {
  id: string;
  puesto_id: string;
  guardia_id: string | null;
  guardia_nombre: string | null;
  guardia_rut: string | null;
  
  // Información del guardia que está actualmente cubriendo el turno
  guardia_actual_id: string | null;
  guardia_actual_nombre: string | null;
  guardia_actual_rut: string | null;
  
  // Información del reemplazo
  reemplazo_guardia_id: string | null;
  reemplazo_nombre: string | null;
  reemplazo_rut: string | null;
  tipo_reemplazo: string | null;
  
  // Tipo de cobertura para mostrar correctamente
  tipo_cobertura: string;
  
  nombre_puesto: string;
  es_ppc: boolean;
  estado: string;
  observaciones: string | null;
  rol_nombre: string | null;
  hora_inicio: string | null;
  hora_termino: string | null;
  turno_nombre: string;
}

interface Instalacion {
  id: string;
  nombre: string;
  valor_turno_extra: number;
  turnos: Turno[];
}

export default function PautaDiariaPage() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [turnoEnEdicion, setTurnoEnEdicion] = useState<Turno | null>(null);
  const [observaciones, setObservaciones] = useState<string>('');
  const [motivoInasistencia, setMotivoInasistencia] = useState<string>('');
  
  // Estados para controlar popovers
  const [popoverObservaciones, setPopoverObservaciones] = useState<string | null>(null);
  const [popoverPPC, setPopoverPPC] = useState<string | null>(null);
  const [popoverReemplazo, setPopoverReemplazo] = useState<string | null>(null);
  
  // Estados para modales de confirmación
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirmar',
    cancelText: 'Cancelar'
  });
  
  const { addToast } = useToast();

  // Función helper para mostrar modal de confirmación
  const showConfirmModal = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string = 'Confirmar',
    cancelText: string = 'Cancelar'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText
    });
  };

  // Función para cerrar modal de confirmación
  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Hook para búsqueda de guardias
  const {
    searchTerm,
    setSearchTerm,
    guardiasOptions,
    loading: loadingGuardias,
    searchGuardias
  } = useGuardiasSearch({
    fecha: fechaSeleccionada,
    debounceMs: 200
  });

  // Calcular estadísticas
  const estadisticas = {
    asistieron: instalaciones.flatMap(i => i.turnos).filter(t => t.estado === 'trabajado').length,
    inasistencias: instalaciones.flatMap(i => i.turnos).filter(t => t.estado === 'inasistencia').length,
    reemplazos: instalaciones.flatMap(i => i.turnos).filter(t => t.tipo_cobertura === 'reemplazo').length,
    ppcCubiertos: instalaciones.flatMap(i => i.turnos).filter(t => t.tipo_cobertura === 'ppc_cubierto').length,
    sinCubrir: instalaciones.flatMap(i => i.turnos).filter(t => t.estado === 'sin_cubrir').length,
    sinMarcar: instalaciones.flatMap(i => i.turnos).filter(t => t.estado === 'sin_marcar').length,
    total: instalaciones.flatMap(i => i.turnos).length
  };

  const totalTurnosExtras = estadisticas.reemplazos + estadisticas.ppcCubiertos;

  // Cargar datos de la pauta diaria
  const cargarPautaDiaria = async (fecha: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pauta-diaria?fecha=${fecha}`);
      if (response.ok) {
        const data = await response.json();
        setInstalaciones(data);
      } else {
        console.error('Error al cargar pauta diaria');
        setInstalaciones([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setInstalaciones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPautaDiaria(fechaSeleccionada);
  }, [fechaSeleccionada]);

  // Navegación de fechas
  const cambiarFecha = (dias: number) => {
    if (cambiosPendientes) {
      if (!confirm('Hay cambios pendientes. ¿Deseas continuar sin guardar?')) {
        return;
      }
      setCambiosPendientes(false);
    }
    
    const fechaActual = new Date(fechaSeleccionada + 'T00:00:00');
    fechaActual.setDate(fechaActual.getDate() + dias);
    setFechaSeleccionada(format(fechaActual, 'yyyy-MM-dd'));
  };

  const irAHoy = () => {
    if (cambiosPendientes) {
      if (!confirm('Hay cambios pendientes. ¿Deseas continuar sin guardar?')) {
        return;
      }
      setCambiosPendientes(false);
    }
    setFechaSeleccionada(format(new Date(), 'yyyy-MM-dd'));
  };

  // Actualizar estado de asistencia
  const actualizarAsistencia = async (
    turno: Turno, 
    accion: string, 
    guardiaId?: string, 
    motivo?: string, 
    observaciones?: string
  ) => {
    console.log('🔄 Actualizando asistencia:', { 
      turno: turno.id, 
      accion, 
      guardiaId, 
      motivo, 
      observaciones,
      turnoNombre: turno.nombre_puesto,
      turnoEstado: turno.estado
    });
    
    try {
      const requestBody = {
        turnoId: turno.id,
        accion,
        guardiaId,
        motivo,
        observaciones
      };
      
      console.log('📤 Enviando request:', requestBody);
      
      const response = await fetch('/api/pauta-diaria', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 Respuesta del servidor:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Respuesta exitosa:', responseData);
        
        addToast({
          title: "✅ Estado actualizado",
          description: "El estado del turno se ha actualizado correctamente.",
          type: "success"
        });
        
        // Recargar datos
        console.log('🔄 Recargando pauta diaria...');
        await cargarPautaDiaria(fechaSeleccionada);
        setCambiosPendientes(false);
        setTurnoEnEdicion(null);
        setObservaciones('');
        setMotivoInasistencia('');
        setSearchTerm('');
        console.log('✅ Pauta recargada exitosamente');
      } else {
        const errorData = await response.json();
        console.error('❌ Error del servidor:', errorData);
        addToast({
          title: "❌ Error",
          description: errorData.error || "Error al actualizar el estado",
          type: "error"
        });
      }
    } catch (error) {
      console.error('💥 Error actualizando asistencia:', error);
      addToast({
        title: "💥 Error de conexión",
        description: "Error de conexión al actualizar el estado",
        type: "error"
      });
    }
  };

  // Exportar CSV
  const exportarCSV = async () => {
    try {
      const response = await fetch(`/api/pauta-diaria/turno-extra/exportar?fecha=${fechaSeleccionada}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `turnos_extras_${fechaSeleccionada}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        addToast({
          title: "CSV exportado",
          description: "El archivo CSV se ha descargado correctamente.",
          type: "success"
        });
      } else {
        addToast({
          title: "Error",
          description: "No hay turnos extras para exportar en esta fecha",
          type: "error"
        });
      }
    } catch (error) {
      console.error('Error exportando CSV:', error);
      addToast({
        title: "Error",
        description: "Error al exportar el CSV",
        type: "error"
      });
    }
  };

  // Renderizar badge de estado
  const renderEstadoBadge = (turno: Turno) => {
    const config = {
      trabajado: { 
        label: 'Asistió', 
        variant: 'default', 
        icon: '✅', 
        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200' 
      },
      inasistencia: { 
        label: 'No asistió', 
        variant: 'destructive', 
        icon: '❌', 
        color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200' 
      },
      reemplazo: { 
        label: 'Reemplazo', 
        variant: 'secondary', 
        icon: '🔄', 
        color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200' 
      },
      cubierto: { 
        label: 'Cubierto', 
        variant: 'default', 
        icon: '✅', 
        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200' 
      },
      sin_cubrir: { 
        label: 'Sin cubrir', 
        variant: 'outline', 
        icon: '⚠️', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200' 
      },
      sin_marcar: { 
        label: 'Sin marcar', 
        variant: 'outline', 
        icon: '⚪', 
        color: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300' 
      }
    };

    const configItem = config[turno.estado as keyof typeof config] || config.sin_marcar;

    return (
      <Badge className={cn("text-xs font-medium", configItem.color)}>
        <span className="mr-1">{configItem.icon}</span>
        {configItem.label}
      </Badge>
    );
  };

  // Renderizar modal de asignación de guardia
  const renderModalGuardia = (turno: Turno, esEdicion: boolean = false, esPPC: boolean = false) => (
    <PopoverContent className="w-96">
      <div className="space-y-4">
        <h4 className="font-medium text-lg">
          {esEdicion ? 'Editar guardia' : esPPC ? 'Cubrir PPC' : 'Asignar reemplazo'}
        </h4>
        
        <div className="space-y-2">
          <Label>Buscar guardia:</Label>
          <Input
            placeholder="Buscar por nombre o RUT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label>Seleccionar guardia:</Label>
          <SearchableCombobox
            options={guardiasOptions}
            value={turnoEnEdicion?.reemplazo_guardia_id || ''}
            onValueChange={(value) => {
              if (turnoEnEdicion) {
                setTurnoEnEdicion({ ...turnoEnEdicion, reemplazo_guardia_id: value });
              }
            }}
            onSearchChange={setSearchTerm}
            searchValue={searchTerm}
            placeholder="Seleccionar guardia..."
            searchPlaceholder="Buscar guardias..."
            emptyText={loadingGuardias ? "Buscando..." : "No se encontraron guardias disponibles"}
            disabled={loadingGuardias}
            loading={loadingGuardias}
          />
        </div>

        <div className="space-y-2">
          <Label>Observaciones (opcional):</Label>
          <Textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Agregar observaciones..."
            className="min-h-[80px]"
          />
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => {
              const accion = esEdicion ? 'editar_reemplazo' : esPPC ? 'asignar_ppc' : 'reemplazo';
              const guardiaId = turnoEnEdicion?.reemplazo_guardia_id;
              if (!guardiaId) {
                addToast({
                  title: "Error",
                  description: "Debes seleccionar un guardia",
                  type: "error"
                });
                return;
              }
              actualizarAsistencia(turno, accion, guardiaId, undefined, observaciones);
            }}
            disabled={!turnoEnEdicion?.reemplazo_guardia_id}
            className="flex-1"
          >
            {esEdicion ? 'Actualizar' : esPPC ? 'Cubrir PPC' : 'Asignar'}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setTurnoEnEdicion(null);
              setObservaciones('');
              setSearchTerm('');
            }}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </PopoverContent>
  );

  // Renderizar acciones para un turno
  const renderAcciones = (turno: Turno) => {
    const instalacion = instalaciones.find(i => i.turnos.some(t => t.id === turno.id));
    console.log('🔧 Renderizando acciones para turno:', {
      id: turno.id,
      estado: turno.estado,
      es_ppc: turno.es_ppc,
      guardia_id: turno.guardia_id,
      nombre_puesto: turno.nombre_puesto
    });
    
    return (
      <div className="flex gap-1">
        {/* PPC SIN ASIGNACIONES - Orden: Cubrir PPC, Observaciones */}
        {turno.es_ppc && !turno.guardia_actual_nombre && (
          <>
            {/* 1. Botón de cubrir PPC */}
            <Popover open={popoverPPC === turno.id} onOpenChange={(open) => {
              if (open) {
                setPopoverPPC(turno.id);
                setTurnoEnEdicion(turno);
                setObservaciones('');
                setSearchTerm('');
                // Cargar guardias iniciales cuando se abre el popover
                searchGuardias('');
              } else {
                setPopoverPPC(null);
                setTurnoEnEdicion(null);
                setObservaciones('');
                setSearchTerm('');
              }
            }}>
              <PopoverTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="Cubrir PPC"
                >
                  Cubrir PPC
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96">
                <div className="space-y-4">
                  <h4 className="font-medium">🛡️ Cubrir PPC</h4>
                  <div className="space-y-2">
                    <Label>Buscar guardia:</Label>
                    <SearchableCombobox
                      value={guardiasOptions.find(g => g.value === turnoEnEdicion?.reemplazo_guardia_id)?.value}
                      onValueChange={(value) => {
                        if (turnoEnEdicion) {
                          setTurnoEnEdicion({
                            ...turnoEnEdicion,
                            reemplazo_guardia_id: value || null
                          });
                        }
                      }}
                      onSearchChange={setSearchTerm}
                      searchValue={searchTerm}
                      options={guardiasOptions}
                      placeholder="Seleccionar guardia..."
                      searchPlaceholder="Buscar guardia..."
                      emptyText="No se encontraron guardias"
                      loading={loadingGuardias}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Observaciones:</Label>
                    <Textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Observaciones opcionales..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        if (!turnoEnEdicion?.reemplazo_guardia_id) {
                          addToast({
                            title: "❌ Error",
                            description: "Debes seleccionar un guardia",
                            type: "error"
                          });
                          return;
                        }
                        actualizarAsistencia(turno, 'asignar_ppc', turnoEnEdicion.reemplazo_guardia_id, undefined, observaciones);
                        setPopoverPPC(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                        setSearchTerm('');
                      }}
                      disabled={!turnoEnEdicion?.reemplazo_guardia_id}
                      className="flex-1"
                    >
                      Cubrir PPC
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setPopoverPPC(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                        setSearchTerm('');
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* 2. Botón de observaciones */}
            <Popover open={popoverObservaciones === turno.id} onOpenChange={(open) => {
              if (open) {
                setPopoverObservaciones(turno.id);
                setTurnoEnEdicion(turno);
                setObservaciones(turno.observaciones || '');
                // Cargar guardias iniciales cuando se abre el popover
                searchGuardias('');
              } else {
                setPopoverObservaciones(null);
                setTurnoEnEdicion(null);
                setObservaciones('');
              }
            }}>
              <PopoverTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  title="Agregar observaciones"
                >
                  Observaciones
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium">📝 Observaciones</h4>
                  <div className="space-y-2">
                    <Label>Observaciones:</Label>
                    <Textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Escribir observaciones..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        if (!observaciones.trim()) {
                          addToast({
                            title: "❌ Error",
                            description: "Debes escribir alguna observación",
                            type: "error"
                          });
                          return;
                        }
                        actualizarAsistencia(turno, 'agregar_observaciones', undefined, undefined, observaciones);
                        setPopoverObservaciones(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                      }}
                      disabled={!observaciones.trim()}
                      className="flex-1"
                    >
                      Guardar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setPopoverObservaciones(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}

        {/* PUESTOS NORMALES - Orden: Asistió, No Asistió, Observaciones */}
        {!turno.es_ppc && (
          <>
            {/* 1. Botón Asistió - para turnos sin marcar */}
            {turno.estado === 'sin_marcar' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                onClick={() => {
                  console.log('✅ Marcando asistencia para:', turno);
                  actualizarAsistencia(turno, 'asistio');
                }}
                title="Marcar asistencia"
              >
                Asistió
              </Button>
            )}

            {/* 2. Botón No Asistió - para turnos sin marcar */}
            {turno.estado === 'sin_marcar' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => {
                  console.log('❌ Marcando inasistencia para:', turno);
                  actualizarAsistencia(turno, 'inasistencia', undefined, 'personal');
                }}
                title="Marcar inasistencia"
              >
                No Asistió
              </Button>
            )}

            {/* 3. Botón de observaciones */}
            <Popover open={popoverObservaciones === turno.id} onOpenChange={(open) => {
              if (open) {
                setPopoverObservaciones(turno.id);
                setTurnoEnEdicion(turno);
                setObservaciones(turno.observaciones || '');
                // Cargar guardias iniciales cuando se abre el popover
                searchGuardias('');
              } else {
                setPopoverObservaciones(null);
                setTurnoEnEdicion(null);
                setObservaciones('');
              }
            }}>
              <PopoverTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  title="Agregar observaciones"
                >
                  Observaciones
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium">📝 Observaciones</h4>
                  <div className="space-y-2">
                    <Label>Observaciones:</Label>
                    <Textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Escribir observaciones..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        if (!observaciones.trim()) {
                          addToast({
                            title: "❌ Error",
                            description: "Debes escribir alguna observación",
                            type: "error"
                          });
                          return;
                        }
                        actualizarAsistencia(turno, 'agregar_observaciones', undefined, undefined, observaciones);
                        setPopoverObservaciones(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                      }}
                      disabled={!observaciones.trim()}
                      className="flex-1"
                    >
                      Guardar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setPopoverObservaciones(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Botones adicionales para estados específicos */}
            
            {/* Botón de deshacer para turnos ya marcados */}
            {(turno.estado === 'trabajado' || turno.estado === 'inasistencia') && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                onClick={() => {
                  console.log('🔄 Deshaciendo marcado para:', turno);
                  actualizarAsistencia(turno, 'deshacer');
                }}
                title="Deshacer marcado"
              >
                Deshacer
              </Button>
            )}

            {/* Botón de asignar reemplazo para inasistencias */}
            {turno.guardia_id && turno.estado === 'inasistencia' && turno.tipo_cobertura !== 'reemplazo' && (
              <Popover open={popoverReemplazo === turno.id} onOpenChange={(open) => {
                if (open) {
                  setPopoverReemplazo(turno.id);
                  setTurnoEnEdicion(turno);
                  setObservaciones('');
                  setSearchTerm('');
                  // Cargar guardias iniciales cuando se abre el popover
                  searchGuardias('');
                } else {
                  setPopoverReemplazo(null);
                  setTurnoEnEdicion(null);
                  setObservaciones('');
                  setSearchTerm('');
                }
              }}>
                <PopoverTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="Asignar reemplazo"
                  >
                    Asignar Reemplazo
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96">
                  <div className="space-y-4">
                    <h4 className="font-medium">👤 Asignar Reemplazo</h4>
                    <div className="space-y-2">
                      <Label>Buscar guardia:</Label>
                      <SearchableCombobox
                        value={guardiasOptions.find(g => g.value === turnoEnEdicion?.reemplazo_guardia_id)?.value}
                        onValueChange={(value) => {
                          if (turnoEnEdicion) {
                            setTurnoEnEdicion({
                              ...turnoEnEdicion,
                              reemplazo_guardia_id: value || null
                            });
                          }
                        }}
                        onSearchChange={setSearchTerm}
                        searchValue={searchTerm}
                        options={guardiasOptions}
                        placeholder="Seleccionar guardia..."
                        searchPlaceholder="Buscar guardia..."
                        emptyText="No se encontraron guardias"
                        loading={loadingGuardias}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Observaciones:</Label>
                      <Textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Observaciones opcionales..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => {
                          if (!turnoEnEdicion?.reemplazo_guardia_id) {
                            addToast({
                              title: "❌ Error",
                              description: "Debes seleccionar un guardia",
                              type: "error"
                            });
                            return;
                          }
                          actualizarAsistencia(turno, 'reemplazo', turnoEnEdicion.reemplazo_guardia_id, undefined, observaciones);
                          setPopoverReemplazo(null);
                          setTurnoEnEdicion(null);
                          setObservaciones('');
                          setSearchTerm('');
                        }}
                        disabled={!turnoEnEdicion?.reemplazo_guardia_id}
                        className="flex-1"
                      >
                        Asignar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setPopoverReemplazo(null);
                          setTurnoEnEdicion(null);
                          setObservaciones('');
                          setSearchTerm('');
                        }}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Botón de eliminar guardia para turnos con guardia asignado */}
            {turno.guardia_id && turno.estado !== 'sin_marcar' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => {
                  console.log('🗑️ Intentando eliminar guardia:', {
                    turnoId: turno.id,
                    nombrePuesto: turno.nombre_puesto,
                    guardiaActual: turno.guardia_actual_nombre
                  });
                  showConfirmModal(
                    'Eliminar Guardia',
                    `¿Estás seguro de que quieres eliminar el guardia "${turno.guardia_actual_nombre}" del puesto "${turno.nombre_puesto}"?`,
                    () => {
                      console.log('✅ Confirmación aceptada, eliminando guardia...');
                      actualizarAsistencia(turno, 'eliminar_guardia', undefined, undefined, 'Guardia eliminado');
                    },
                    'Eliminar',
                    'Cancelar'
                  );
                }}
                title="Eliminar Asignación"
              >
                Eliminar Asignación
              </Button>
            )}
          </>
        )}

        {/* PPC CON ASIGNACIONES - Botones de edición y eliminación */}
        {turno.es_ppc && turno.guardia_actual_nombre && (
          <>
            {/* Botón de editar PPC cubierto */}
            <Popover open={popoverPPC === turno.id} onOpenChange={(open) => {
              if (open) {
                console.log('🔧 Abriendo popover para editar PPC:', {
                  turnoId: turno.id,
                  guardiaActualId: turno.guardia_actual_id,
                  guardiaActualNombre: turno.guardia_actual_nombre
                });
                setPopoverPPC(turno.id);
                setTurnoEnEdicion({
                  ...turno,
                  reemplazo_guardia_id: turno.guardia_actual_id
                });
                setObservaciones(turno.observaciones || '');
                setSearchTerm('');
                // Cargar guardias iniciales cuando se abre el popover
                searchGuardias('');
              } else {
                setPopoverPPC(null);
                setTurnoEnEdicion(null);
                setObservaciones('');
                setSearchTerm('');
              }
            }}>
              <PopoverTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                  title="Editar"
                >
                  Editar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96">
                <div className="space-y-4">
                  <h4 className="font-medium">✏️ Editar PPC</h4>
                  <div className="space-y-2">
                    <Label>Guardia actual: {turno.guardia_actual_nombre}</Label>
                    <Label>Buscar nuevo guardia:</Label>
                    <SearchableCombobox
                      value={turnoEnEdicion?.reemplazo_guardia_id || ''}
                      onValueChange={(value) => {
                        console.log('🖱️ Seleccionando guardia para PPC:', {
                          value,
                          turnoEnEdicionId: turnoEnEdicion?.id,
                          currentReemplazoId: turnoEnEdicion?.reemplazo_guardia_id
                        });
                        if (turnoEnEdicion) {
                          setTurnoEnEdicion({
                            ...turnoEnEdicion,
                            reemplazo_guardia_id: value || null
                          });
                        }
                      }}
                      onSearchChange={setSearchTerm}
                      searchValue={searchTerm}
                      options={guardiasOptions}
                      placeholder="Seleccionar guardia..."
                      searchPlaceholder="Buscar guardia..."
                      emptyText="No se encontraron guardias"
                      loading={loadingGuardias}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Observaciones:</Label>
                    <Textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Observaciones opcionales..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        console.log('💾 Guardando edición PPC:', {
                          turnoId: turno.id,
                          guardiaSeleccionado: turnoEnEdicion?.reemplazo_guardia_id,
                          observaciones
                        });
                        if (!turnoEnEdicion?.reemplazo_guardia_id) {
                          addToast({
                            title: "❌ Error",
                            description: "Debes seleccionar un guardia",
                            type: "error"
                          });
                          return;
                        }
                        actualizarAsistencia(turno, 'editar_ppc', turnoEnEdicion.reemplazo_guardia_id, undefined, observaciones);
                        setPopoverPPC(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                        setSearchTerm('');
                      }}
                      disabled={!turnoEnEdicion?.reemplazo_guardia_id}
                      className="flex-1"
                    >
                      Actualizar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setPopoverPPC(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                        setSearchTerm('');
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Botón de observaciones */}
            <Popover open={popoverObservaciones === turno.id} onOpenChange={(open) => {
              if (open) {
                setPopoverObservaciones(turno.id);
                setTurnoEnEdicion(turno);
                setObservaciones(turno.observaciones || '');
                // Cargar guardias iniciales cuando se abre el popover
                searchGuardias('');
              } else {
                setPopoverObservaciones(null);
                setTurnoEnEdicion(null);
                setObservaciones('');
              }
            }}>
              <PopoverTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  title="Agregar observaciones"
                >
                  Observaciones
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium">📝 Observaciones</h4>
                  <div className="space-y-2">
                    <Label>Observaciones:</Label>
                    <Textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Escribir observaciones..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        if (!observaciones.trim()) {
                          addToast({
                            title: "❌ Error",
                            description: "Debes escribir alguna observación",
                            type: "error"
                          });
                          return;
                        }
                        actualizarAsistencia(turno, 'agregar_observaciones', undefined, undefined, observaciones);
                        setPopoverObservaciones(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                      }}
                      disabled={!observaciones.trim()}
                      className="flex-1"
                    >
                      Guardar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setPopoverObservaciones(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Botón de eliminar cobertura de PPC */}
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => {
                console.log('🗑️ Intentando eliminar PPC:', {
                  turnoId: turno.id,
                  nombrePuesto: turno.nombre_puesto,
                  guardiaActual: turno.guardia_actual_nombre
                });
                showConfirmModal(
                  'Eliminar Cobertura PPC',
                  `¿Estás seguro de que quieres eliminar la cobertura del PPC "${turno.nombre_puesto}"?`,
                  () => {
                    console.log('✅ Confirmación aceptada, eliminando PPC...');
                    actualizarAsistencia(turno, 'eliminar_ppc', undefined, undefined, 'Cobertura eliminada');
                  },
                  'Eliminar',
                  'Cancelar'
                );
              }}
              title="Eliminar Asignación"
            >
              Eliminar Asignación
            </Button>
          </>
        )}

        {/* REEMPLAZOS - Botones de edición */}
        {turno.tipo_cobertura === 'reemplazo' && (
          <>
            {/* Botón de editar reemplazo existente */}
            <Popover open={popoverReemplazo === turno.id} onOpenChange={(open) => {
              if (open) {
                setPopoverReemplazo(turno.id);
                setTurnoEnEdicion({
                  ...turno,
                  reemplazo_guardia_id: turno.reemplazo_guardia_id
                });
                setObservaciones(turno.observaciones || '');
                setSearchTerm('');
                // Cargar guardias iniciales cuando se abre el popover
                searchGuardias('');
              } else {
                setPopoverReemplazo(null);
                setTurnoEnEdicion(null);
                setObservaciones('');
                setSearchTerm('');
              }
            }}>
              <PopoverTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                  title="Editar"
                >
                  Editar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96">
                <div className="space-y-4">
                  <h4 className="font-medium">✏️ Editar Reemplazo</h4>
                  <div className="space-y-2">
                    <Label>Guardia actual: {turno.reemplazo_nombre}</Label>
                    <Label>Buscar nuevo guardia:</Label>
                    <SearchableCombobox
                      value={guardiasOptions.find(g => g.value === turnoEnEdicion?.reemplazo_guardia_id)?.value}
                      onValueChange={(value) => {
                        if (turnoEnEdicion) {
                          setTurnoEnEdicion({
                            ...turnoEnEdicion,
                            reemplazo_guardia_id: value || null
                          });
                        }
                      }}
                      onSearchChange={setSearchTerm}
                      searchValue={searchTerm}
                      options={guardiasOptions}
                      placeholder="Seleccionar guardia..."
                      searchPlaceholder="Buscar guardia..."
                      emptyText="No se encontraron guardias"
                      loading={loadingGuardias}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Observaciones:</Label>
                    <Textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Observaciones opcionales..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        if (!turnoEnEdicion?.reemplazo_guardia_id) {
                          addToast({
                            title: "❌ Error",
                            description: "Debes seleccionar un guardia",
                            type: "error"
                          });
                          return;
                        }
                        actualizarAsistencia(turno, 'editar_reemplazo', turnoEnEdicion.reemplazo_guardia_id, undefined, observaciones);
                        setPopoverReemplazo(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                        setSearchTerm('');
                      }}
                      disabled={!turnoEnEdicion?.reemplazo_guardia_id}
                      className="flex-1"
                    >
                      Actualizar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setPopoverReemplazo(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                        setSearchTerm('');
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Botón de observaciones */}
            <Popover open={popoverObservaciones === turno.id} onOpenChange={(open) => {
              if (open) {
                setPopoverObservaciones(turno.id);
                setTurnoEnEdicion(turno);
                setObservaciones(turno.observaciones || '');
                // Cargar guardias iniciales cuando se abre el popover
                searchGuardias('');
              } else {
                setPopoverObservaciones(null);
                setTurnoEnEdicion(null);
                setObservaciones('');
              }
            }}>
              <PopoverTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  title="Agregar observaciones"
                >
                  Observaciones
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium">📝 Observaciones</h4>
                  <div className="space-y-2">
                    <Label>Observaciones:</Label>
                    <Textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Escribir observaciones..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        if (!observaciones.trim()) {
                          addToast({
                            title: "❌ Error",
                            description: "Debes escribir alguna observación",
                            type: "error"
                          });
                          return;
                        }
                        actualizarAsistencia(turno, 'agregar_observaciones', undefined, undefined, observaciones);
                        setPopoverObservaciones(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                      }}
                      disabled={!observaciones.trim()}
                      className="flex-1"
                    >
                      Guardar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setPopoverObservaciones(null);
                        setTurnoEnEdicion(null);
                        setObservaciones('');
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}

      </div>
    );
  };

  // Ordenar turnos por horario (día, noche)
  const ordenarTurnos = (turnos: Turno[]) => {
    return turnos.sort((a, b) => {
      const orden = { 'Día': 1, 'Tarde': 2, 'Noche': 3 };
      const ordenA = orden[a.turno_nombre as keyof typeof orden] || 4;
      const ordenB = orden[b.turno_nombre as keyof typeof orden] || 4;
      return ordenA - ordenB;
    });
  };

  console.log("Pauta Diaria actualizada: turnos ahora se marcan manualmente, PPCs se cubren, todo editable.");

  return (
    <TooltipProvider>
      <div className="container mx-auto p-2 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Pauta Diaria</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Control de asistencia y estados de guardias
            </p>
          </div>
          <div className="flex justify-center sm:justify-end">
            {totalTurnosExtras > 0 && (
              <Button variant="outline" size="sm" onClick={exportarCSV} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">CSV Turnos Extras</span>
                <span className="sm:hidden">Exportar CSV</span>
              </Button>
            )}
          </div>
        </div>

        {/* Selector de fecha */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              Seleccionar Fecha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <Label htmlFor="fecha" className="text-sm">Fecha:</Label>
                <DatePickerComponent
                  value={fechaSeleccionada}
                  onChange={setFechaSeleccionada}
                  placeholder="Seleccionar fecha"
                  className="w-full sm:w-48"
                />
              </div>
              
              {/* Botones de navegación */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cambiarFecha(-1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={irAHoy}
                  className="h-8 px-3"
                >
                  Hoy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cambiarFecha(1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className={cn(
                "text-xs sm:text-sm text-center sm:text-left w-full sm:w-auto",
                fechaSeleccionada === format(new Date(), 'yyyy-MM-dd') 
                  ? "text-green-500 font-medium" 
                  : "text-muted-foreground"
              )}>
                {format(new Date(fechaSeleccionada), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es })}
                {fechaSeleccionada === format(new Date(), 'yyyy-MM-dd') && (
                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-200">
                    Hoy
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert de cambios pendientes */}
        {cambiosPendientes && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Hay cambios pendientes. Guarda los cambios antes de cambiar de fecha.
            </AlertDescription>
          </Alert>
        )}



        {/* Asignaciones por instalación */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : instalaciones.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No hay asignaciones para la fecha seleccionada
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {instalaciones.map((instalacion) => (
              <Card key={instalacion.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b dark:from-gray-800 dark:to-gray-900">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                    <span className="truncate">{instalacion.nombre}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {ordenarTurnos(instalacion.turnos).map((turno) => (
                      <div key={turno.id} className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Layout móvil: información apilada */}
                            <div className="sm:hidden space-y-3">
                              {/* Información del turno */}
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium text-sm">{turno.turno_nombre}</span>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {turno.nombre_puesto}
                                  </div>
                                  {turno.rol_nombre && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      {turno.rol_nombre}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Información del guardia */}
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  {turno.es_ppc && !turno.guardia_actual_nombre ? (
                                    <span className="text-muted-foreground italic">PPC - Sin asignar</span>
                                  ) : turno.tipo_cobertura === 'reemplazo' ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium truncate">{turno.reemplazo_nombre}</span>
                                        <Badge variant="outline" className="text-xs flex-shrink-0 bg-blue-50 text-blue-700 border-blue-200">
                                          Reemplazo
                                        </Badge>
                                      </div>
                                      {turno.guardia_nombre && (
                                        <div className="text-xs text-muted-foreground">
                                          Original: {turno.guardia_nombre}
                                        </div>
                                      )}
                                    </div>
                                  ) : turno.tipo_cobertura === 'ppc_cubierto' ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium truncate">{turno.guardia_actual_nombre}</span>
                                        <Badge variant="outline" className="text-xs flex-shrink-0 bg-green-50 text-green-700 border-green-200">
                                          PPC Cubierto
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        PPC: {turno.nombre_puesto}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="font-medium truncate">{turno.guardia_actual_nombre || turno.guardia_nombre}</span>
                                  )}
                                </div>
                              </div>

                              {/* Estado */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Estado:</span>
                                {renderEstadoBadge(turno)}
                              </div>
                            </div>

                            {/* Layout desktop: información en línea */}
                            <div className="hidden sm:flex items-center gap-6">
                              {/* Información del turno */}
                              <div className="min-w-[140px]">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-sm">{turno.turno_nombre}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {turno.nombre_puesto}
                                </div>
                                {turno.rol_nombre && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    {turno.rol_nombre}
                                  </div>
                                )}
                              </div>

                              {/* Información del guardia */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  {turno.es_ppc && !turno.guardia_actual_nombre ? (
                                    <span className="text-muted-foreground italic">PPC - Sin asignar</span>
                                  ) : turno.tipo_cobertura === 'reemplazo' ? (
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{turno.reemplazo_nombre}</span>
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        Reemplazo
                                      </Badge>
                                    </div>
                                  ) : turno.tipo_cobertura === 'ppc_cubierto' ? (
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{turno.guardia_actual_nombre}</span>
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                        PPC Cubierto
                                      </Badge>
                                    </div>
                                  ) : (
                                    <span className="font-medium">{turno.guardia_actual_nombre || turno.guardia_nombre}</span>
                                  )}
                                </div>
                                {turno.tipo_cobertura === 'reemplazo' && turno.guardia_nombre && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Original: {turno.guardia_nombre}
                                  </div>
                                )}
                                {turno.tipo_cobertura === 'ppc_cubierto' && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    PPC: {turno.nombre_puesto}
                                  </div>
                                )}
                              </div>

                              {/* Estado */}
                              <div className="min-w-[100px]">
                                {renderEstadoBadge(turno)}
                              </div>
                            </div>

                            {/* Observaciones */}
                            {turno.observaciones && (
                              <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r dark:bg-blue-900/20 dark:border-blue-600">
                                <div className="flex items-start gap-2">
                                  <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div className="text-sm text-blue-800 dark:text-blue-200 min-w-0">
                                    <span className="font-medium">Observaciones:</span> {turno.observaciones}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Acciones */}
                          <div className="flex justify-end sm:ml-4">
                            {renderAcciones(turno)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Resumen de estados */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Resumen de Estados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {estadisticas.asistieron}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">✅ Asistieron</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-red-600">
                  {estadisticas.inasistencias}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">❌ Inasistencias</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {estadisticas.reemplazos}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">🔄 Reemplazos</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {estadisticas.ppcCubiertos}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">🛡️ PPCs Cubiertos</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-orange-600">
                  {estadisticas.sinCubrir}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">⚠️ Sin cubrir</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-gray-600">
                  {estadisticas.sinMarcar}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">⚪ Sin marcar</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-purple-600">
                  {totalTurnosExtras}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">💰 Turnos extras</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmación personalizado */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {confirmModal.title}
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {confirmModal.message}
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={closeConfirmModal}
                className="px-4 py-2"
              >
                {confirmModal.cancelText}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  confirmModal.onConfirm();
                  closeConfirmModal();
                }}
                className="px-4 py-2"
              >
                {confirmModal.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
} 