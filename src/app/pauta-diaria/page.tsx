'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
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
  RotateCcw,
  Plus,
  Minus
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

interface Puesto {
  puesto_id: string;
  nombre_puesto: string;
  guardia_original: { id: string; nombre: string } | null;
  asignacion_real: string;
  cobertura_real: string | null;
  estado: string;
  observaciones: string | null;
  instalacion_id: string;
  es_ppc: boolean;
}

export default function PautaDiariaPage() {
  const router = useRouter();
  
  // Función helper para generar ID corto de puesto
  const generarIdCortoPuesto = (puestoId: string | number) => {
    // Convertir a string y tomar los últimos 4 caracteres del UUID y convertirlos a mayúsculas
    const puestoIdStr = puestoId.toString();
    return `P-${puestoIdStr.slice(-4).toUpperCase()}`;
  };

  // Función para navegar a la instalación
  const navegarAInstalacion = (instalacionId: string) => {
    router.push(`/instalaciones/${instalacionId}`);
  };

  // Inicializar directamente con la fecha actual
  const fechaInicial = (() => {
    const ahora = new Date();
    const fechaLocal = format(ahora, 'yyyy-MM-dd');
    console.log('🕐 Inicializando con fecha:', fechaLocal, 'Hora:', ahora.toLocaleTimeString());
    return fechaLocal;
  })();

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(fechaInicial);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [loading, setLoading] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [puestoEnEdicion, setPuestoEnEdicion] = useState<Puesto | null>(null);
  const [observaciones, setObservaciones] = useState<string>('');
  const [motivoInasistencia, setMotivoInasistencia] = useState<string>('');
  
  // Estados para controlar popovers
  const [popoverObservaciones, setPopoverObservaciones] = useState<string | null>(null);
  const [popoverReemplazo, setPopoverReemplazo] = useState<string | null>(null);
  const [popoverCobertura, setPopoverCobertura] = useState<string | null>(null);
  
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
    trabajado: puestos.filter(p => p.estado === 'trabajado').length,
    reemplazo: puestos.filter(p => p.estado === 'reemplazo').length,
    sin_cobertura: puestos.filter(p => p.estado === 'sin_cobertura').length,
    total: puestos.length
  };

  // Cargar datos de la pauta diaria
  const cargarPautaDiaria = async (fecha: string) => {
    setLoading(true);
    try {
      // Corregir el problema de zona horaria
      const [anio, mes, dia] = fecha.split('-').map(Number);
      
      const response = await fetch(`/api/pauta-diaria?anio=${anio}&mes=${mes}&dia=${dia}`);
      if (response.ok) {
        const data = await response.json();
        setPuestos(data);
      } else {
        console.error('Error al cargar pauta diaria');
        setPuestos([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setPuestos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fechaSeleccionada) {
      console.log('📅 Cargando pauta para fecha:', fechaSeleccionada);
      cargarPautaDiaria(fechaSeleccionada);
    }
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
    const fechaFormateada = format(new Date(), 'yyyy-MM-dd');
    console.log('🔄 Navegando a hoy:', fechaFormateada);
    setFechaSeleccionada(fechaFormateada);
  };

  // Actualizar estado de asistencia
  const actualizarAsistencia = async (
    puesto: Puesto, 
    accion: string, 
    guardiaId?: string, 
    motivo?: string, 
    observaciones?: string
  ) => {
    console.log('🔄 Actualizando asistencia:', { 
      puesto: puesto.puesto_id, 
      accion, 
      guardiaId, 
      motivo, 
      observaciones,
      puestoNombre: generarIdCortoPuesto(puesto.puesto_id),
      puestoEstado: puesto.estado
    });
    
    try {
      const requestBody = {
        turnoId: puesto.puesto_id,
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
          description: "El estado del puesto se ha actualizado correctamente.",
          type: "success"
        });
        
        // Recargar datos
        console.log('🔄 Recargando pauta diaria...');
        await cargarPautaDiaria(fechaSeleccionada);
        setCambiosPendientes(false);
        setPuestoEnEdicion(null);
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

  // Renderizar badge de estado
  const renderEstadoBadge = (puesto: Puesto) => {
    const config = {
      T: { 
        label: 'Asignado', 
        variant: 'default', 
        icon: '📋', 
        color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200' 
      },
      trabajado: { 
        label: 'Trabajado', 
        variant: 'default', 
        icon: '✅', 
        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200' 
      },
      reemplazo: { 
        label: 'Reemplazo', 
        variant: 'secondary', 
        icon: '🔄', 
        color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200' 
      },
      sin_cobertura: { 
        label: 'Sin cobertura', 
        variant: 'destructive', 
        icon: '❌', 
        color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200' 
      }
    };

    const configItem = config[puesto.estado as keyof typeof config] || config.T;

    return (
      <Badge className={cn("text-xs font-medium", configItem.color)}>
        <span className="mr-1">{configItem.icon}</span>
        {configItem.label}
      </Badge>
    );
  };

  // Renderizar acciones para un puesto
  const renderAcciones = (puesto: Puesto) => {
    return (
      <div className="flex gap-1">
        {/* Si tiene guardia asignado */}
        {puesto.guardia_original && (
          <>
            {/* Botón Asistió */}
            {puesto.estado === 'T' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                onClick={() => {
                  console.log('✅ Marcando asistencia para:', puesto);
                  actualizarAsistencia(puesto, 'asistio');
                }}
                title="Marcar asistencia"
              >
                <Check className="h-3 w-3 mr-1" />
                Asistió
              </Button>
            )}

            {/* Botón No Asistió */}
            {puesto.estado === 'T' && (
              <Popover open={popoverReemplazo === puesto.puesto_id} onOpenChange={(open) => {
                if (open) {
                  setPopoverReemplazo(puesto.puesto_id);
                  setPuestoEnEdicion(puesto);
                  setObservaciones('');
                  setMotivoInasistencia('');
                  setSearchTerm('');
                  searchGuardias('');
                } else {
                  setPopoverReemplazo(null);
                  setPuestoEnEdicion(null);
                  setObservaciones('');
                  setMotivoInasistencia('');
                  setSearchTerm('');
                }
              }}>
                <PopoverTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Marcar no asistió"
                  >
                    <X className="h-3 w-3 mr-1" />
                    No Asistió
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96">
                  <div className="space-y-4">
                    <h4 className="font-medium">❌ No Asistió</h4>
                    
                    <div className="space-y-2">
                      <Label>Motivo de ausencia:</Label>
                      <Select value={motivoInasistencia} onValueChange={setMotivoInasistencia}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enfermedad">Enfermedad</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="accidente">Accidente</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Seleccionar reemplazo:</Label>
                      <SearchableCombobox
                        value={guardiasOptions.find(g => g.value === puestoEnEdicion?.guardia_original?.id)?.value}
                        onValueChange={(value) => {
                          if (puestoEnEdicion) {
                            setPuestoEnEdicion({
                              ...puestoEnEdicion,
                              guardia_original: value ? { id: value, nombre: guardiasOptions.find(g => g.value === value)?.label || '' } : null
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
                          if (puestoEnEdicion?.guardia_original?.id) {
                            actualizarAsistencia(puesto, 'reemplazo', puestoEnEdicion.guardia_original.id, motivoInasistencia, observaciones);
                          } else {
                            actualizarAsistencia(puesto, 'sin_cobertura', undefined, motivoInasistencia, observaciones);
                          }
                          setPopoverReemplazo(null);
                          setPuestoEnEdicion(null);
                          setObservaciones('');
                          setMotivoInasistencia('');
                          setSearchTerm('');
                        }}
                        className="flex-1"
                      >
                        {puestoEnEdicion?.guardia_original?.id ? 'Asignar Reemplazo' : 'Sin Cobertura'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setPopoverReemplazo(null);
                          setPuestoEnEdicion(null);
                          setObservaciones('');
                          setMotivoInasistencia('');
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

            {/* Botón Eliminar cobertura */}
            {(puesto.estado === 'trabajado' || puesto.estado === 'reemplazo' || puesto.estado === 'sin_cobertura') && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20"
                onClick={() => {
                  showConfirmModal(
                    'Eliminar Cobertura',
                    `¿Estás seguro de que quieres eliminar la cobertura del puesto "${generarIdCortoPuesto(puesto.puesto_id)}"?`,
                    () => {
                      actualizarAsistencia(puesto, 'eliminar_cobertura', undefined, undefined, observaciones);
                    },
                    'Eliminar',
                    'Cancelar'
                  );
                }}
                title="Eliminar cobertura"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Eliminar
              </Button>
            )}
          </>
        )}

        {/* Si es PPC */}
        {puesto.es_ppc && (
          <>
            {/* Botón Cobertura */}
            {puesto.estado === 'T' && (
              <Popover open={popoverCobertura === puesto.puesto_id} onOpenChange={(open) => {
                if (open) {
                  setPopoverCobertura(puesto.puesto_id);
                  setPuestoEnEdicion(puesto);
                  setObservaciones('');
                  setSearchTerm('');
                  searchGuardias('');
                } else {
                  setPopoverCobertura(null);
                  setPuestoEnEdicion(null);
                  setObservaciones('');
                  setSearchTerm('');
                }
              }}>
                <PopoverTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="Asignar cobertura"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Cobertura
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96">
                  <div className="space-y-4">
                    <h4 className="font-medium">🛡️ Asignar Cobertura PPC</h4>
                    
                    <div className="space-y-2">
                      <Label>Seleccionar guardia:</Label>
                      <SearchableCombobox
                        value={guardiasOptions.find(g => g.value === puestoEnEdicion?.guardia_original?.id)?.value}
                        onValueChange={(value) => {
                          if (puestoEnEdicion) {
                            setPuestoEnEdicion({
                              ...puestoEnEdicion,
                              guardia_original: value ? { id: value, nombre: guardiasOptions.find(g => g.value === value)?.label || '' } : null
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
                          if (puestoEnEdicion?.guardia_original?.id) {
                            actualizarAsistencia(puesto, 'asignar_ppc', puestoEnEdicion.guardia_original.id, undefined, observaciones);
                          } else {
                            actualizarAsistencia(puesto, 'sin_cobertura', undefined, undefined, observaciones);
                          }
                          setPopoverCobertura(null);
                          setPuestoEnEdicion(null);
                          setObservaciones('');
                          setSearchTerm('');
                        }}
                        className="flex-1"
                      >
                        {puestoEnEdicion?.guardia_original?.id ? 'Asignar' : 'Sin Cobertura'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setPopoverCobertura(null);
                          setPuestoEnEdicion(null);
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

            {/* Botón Eliminar cobertura para PPC */}
            {(puesto.estado === 'trabajado' || puesto.estado === 'reemplazo' || puesto.estado === 'sin_cobertura') && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20"
                onClick={() => {
                  showConfirmModal(
                    'Eliminar Cobertura PPC',
                    `¿Estás seguro de que quieres eliminar la cobertura del PPC "${generarIdCortoPuesto(puesto.puesto_id)}"?`,
                    () => {
                      actualizarAsistencia(puesto, 'eliminar_cobertura', undefined, undefined, observaciones);
                    },
                    'Eliminar',
                    'Cancelar'
                  );
                }}
                title="Eliminar cobertura"
              >
                <Minus className="h-3 w-3 mr-1" />
                Eliminar
              </Button>
            )}
          </>
        )}

        {/* Botón Observaciones para todos */}
        <Popover open={popoverObservaciones === puesto.puesto_id} onOpenChange={(open) => {
          if (open) {
            setPopoverObservaciones(puesto.puesto_id);
            setPuestoEnEdicion(puesto);
            setObservaciones(puesto.observaciones || '');
          } else {
            setPopoverObservaciones(null);
            setPuestoEnEdicion(null);
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
              <FileText className="h-3 w-3 mr-1" />
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
                    actualizarAsistencia(puesto, 'agregar_observaciones', undefined, undefined, observaciones);
                    setPopoverObservaciones(null);
                    setPuestoEnEdicion(null);
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
                    setPuestoEnEdicion(null);
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
      </div>
    );
  };

  console.log("✅ Vista de pauta diaria operativa y refactorizada");

  return (
    <TooltipProvider>
      <div className="container mx-auto p-2 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Pauta Diaria</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Control operativo de puestos con turno asignado
            </p>
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
                  variant="default"
                  size="sm"
                  onClick={irAHoy}
                  className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                  title="Ir al día de hoy"
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
              
              {fechaSeleccionada && (
                <div className={cn(
                  "text-xs sm:text-sm text-center sm:text-left w-full sm:w-auto",
                  fechaSeleccionada === format(new Date(), 'yyyy-MM-dd')
                    ? "text-green-500 font-medium" 
                    : "text-muted-foreground"
                )}>
                  {(() => {
                    const fechaConHora = new Date(fechaSeleccionada + 'T00:00:00');
                    const textoFormateado = format(fechaConHora, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es });
                    return textoFormateado;
                  })()}
                  {fechaSeleccionada === format(new Date(), 'yyyy-MM-dd') && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-200">
                      Hoy
                    </span>
                  )}
                </div>
              )}
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

        {/* Lista de puestos */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : puestos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No hay puestos con turno asignado para la fecha seleccionada
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {puestos.map((puesto) => (
              <Card key={puesto.puesto_id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Layout móvil: información apilada */}
                      <div className="sm:hidden space-y-3">
                        {/* Información del puesto */}
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => navegarAInstalacion(puesto.instalacion_id)}
                              className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              title="Ver instalación"
                            >
                              {generarIdCortoPuesto(puesto.puesto_id)}
                            </button>
                            {puesto.es_ppc && (
                              <Badge variant="outline" className="text-xs ml-2 bg-orange-50 text-orange-700 border-orange-200">
                                PPC
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Asignación real */}
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-sm">
                              <span className="font-medium">Asignación:</span> {puesto.asignacion_real}
                            </span>
                          </div>
                        </div>

                        {/* Cobertura real */}
                        {puesto.cobertura_real && (
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-sm">
                                <span className="font-medium">Cobertura:</span> {puesto.cobertura_real}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Estado */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Estado:</span>
                          {renderEstadoBadge(puesto)}
                        </div>
                      </div>

                      {/* Layout desktop: información en línea */}
                      <div className="hidden sm:flex items-center gap-6">
                        {/* Información del puesto */}
                        <div className="min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <button
                              onClick={() => navegarAInstalacion(puesto.instalacion_id)}
                              className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              title="Ver instalación"
                            >
                              {generarIdCortoPuesto(puesto.puesto_id)}
                            </button>
                            {puesto.es_ppc && (
                              <Badge variant="outline" className="text-xs ml-2 bg-orange-50 text-orange-700 border-orange-200">
                                PPC
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Asignación real */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              <span className="font-medium">Asignación:</span> {puesto.asignacion_real}
                            </span>
                          </div>
                        </div>

                        {/* Cobertura real */}
                        <div className="flex-1">
                          {puesto.cobertura_real ? (
                            <div className="flex items-center gap-2">
                              <UserPlus className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                <span className="font-medium">Cobertura:</span> {puesto.cobertura_real}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin cobertura</span>
                          )}
                        </div>

                        {/* Estado */}
                        <div className="min-w-[100px]">
                          {renderEstadoBadge(puesto)}
                        </div>
                      </div>

                      {/* Observaciones */}
                      {puesto.observaciones && (
                        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r dark:bg-blue-900/20 dark:border-blue-600">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-800 dark:text-blue-200 min-w-0">
                              <span className="font-medium">Observaciones:</span> {puesto.observaciones}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex justify-end sm:ml-4">
                      {renderAcciones(puesto)}
                    </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {puestos.filter(p => p.estado === 'T').length}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">📋 Asignados</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {estadisticas.trabajado}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">✅ Trabajados</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-orange-600">
                  {estadisticas.reemplazo}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">🔄 Reemplazos</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-red-600">
                  {estadisticas.sin_cobertura}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">❌ Sin cobertura</div>
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