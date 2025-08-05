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
  Minus,
  Filter,
  Search
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

export default function PautaDiariaPage({ params }: { params: { fecha: string } }) {
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

  // Inicializar con la fecha de los parámetros o fecha actual
  const fechaInicial = (() => {
    if (params.fecha) {
      console.log('🕐 Inicializando con fecha de URL:', params.fecha);
      return params.fecha;
    }
    const ahora = new Date();
    const fechaLocal = format(ahora, 'yyyy-MM-dd');
    console.log('🕐 Inicializando con fecha actual:', fechaLocal, 'Hora:', ahora.toLocaleTimeString());
    return fechaLocal;
  })();

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(fechaInicial);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [loading, setLoading] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [puestoEnEdicion, setPuestoEnEdicion] = useState<Puesto | null>(null);
  const [observaciones, setObservaciones] = useState<string>('');
  const [motivoInasistencia, setMotivoInasistencia] = useState<string>('');
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    busqueda: '',
    instalacion: 'all',
    tipoTurno: 'all',
    estado: 'all'
  });
  
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

  // Función para filtrar puestos
  const puestosFiltrados = puestos.filter(puesto => {
    const cumpleBusqueda = !filtros.busqueda || 
      generarIdCortoPuesto(puesto.puesto_id).toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      puesto.nombre_puesto.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      puesto.asignacion_real.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      (puesto.cobertura_real && puesto.cobertura_real.toLowerCase().includes(filtros.busqueda.toLowerCase()));

    const cumpleInstalacion = filtros.instalacion === 'all' || puesto.instalacion_id === filtros.instalacion;
    
    const cumpleTipoTurno = filtros.tipoTurno === 'all' || 
      (filtros.tipoTurno === 'dia' && puesto.nombre_puesto.toLowerCase().includes('día')) ||
      (filtros.tipoTurno === 'noche' && puesto.nombre_puesto.toLowerCase().includes('noche')) ||
      (filtros.tipoTurno === 'ppc' && puesto.es_ppc);
    
    const cumpleEstado = filtros.estado === 'all' || puesto.estado === filtros.estado;

    return cumpleBusqueda && cumpleInstalacion && cumpleTipoTurno && cumpleEstado;
  });

  // Calcular estadísticas basadas en todos los puestos (no filtrados)
  const estadisticas = {
    asignados: puestos.filter(p => p.estado === 'T').length,
    trabajados: puestos.filter(p => p.estado === 'trabajado').length,
    reemplazos: puestos.filter(p => p.estado === 'reemplazo').length,
    sin_cobertura: puestos.filter(p => p.estado === 'sin_cobertura').length
  };

  // Obtener instalaciones únicas para el filtro
  const instalacionesUnicas = Array.from(new Set(puestos.map(p => ({
    id: p.instalacion_id,
    nombre: p.asignacion_real.split(' - ')[0] || 'Sin nombre'
  }))));

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      instalacion: 'all',
      tipoTurno: 'all',
      estado: 'all'
    });
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

  // Sincronizar fecha cuando cambien los parámetros
  useEffect(() => {
    if (params.fecha && params.fecha !== fechaSeleccionada) {
      console.log('🔄 Sincronizando fecha desde URL:', params.fecha);
      setFechaSeleccionada(params.fecha);
    }
  }, [params.fecha, fechaSeleccionada]);

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
    const nuevaFecha = format(fechaActual, 'yyyy-MM-dd');
    setFechaSeleccionada(nuevaFecha);
    router.push(`/pauta-diaria/${nuevaFecha}`);
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
    router.push(`/pauta-diaria/${fechaFormateada}`);
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
          title: accion === 'asistio' ? "✅ Asistencia confirmada" : "✅ Estado actualizado",
          description: accion === 'asistio' 
            ? "El guardia ha sido marcado como asistido correctamente."
            : "El estado del puesto se ha actualizado correctamente.",
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
      ppc_asignado: { 
        label: 'PPC Asignado', 
        variant: 'default', 
        icon: '🛡️', 
        color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200' 
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
      },
      libre: { 
        label: 'Disponible', 
        variant: 'secondary', 
        icon: '🆓', 
        color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200' 
      }
    };

    const configItem = config[puesto.estado as keyof typeof config] || {
      label: `Estado: ${puesto.estado}`,
      variant: 'secondary',
      icon: '❓', 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200'
    };

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
            {/* Botón Asistió - Solo mostrar si NO está ya marcado como trabajado */}
            {puesto.estado !== 'trabajado' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 h-7 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 border-green-300 hover:border-green-400"
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

            {/* Botón No Asistió - Solo mostrar si NO está ya marcado como trabajado */}
            {puesto.estado !== 'trabajado' && (
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
                    className="text-xs px-2 py-1 h-7 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300 hover:border-red-400"
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

            {/* Mostrar estado cuando ya está marcado como trabajado */}
            {puesto.estado === 'trabajado' && !puesto.es_ppc && (
              <div className="flex items-center gap-1 px-2 py-1 h-7 bg-green-100 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                <Check className="h-3 w-3" />
                <span>Asistido</span>
              </div>
            )}

            {/* Mostrar estado para PPC con cobertura asignada */}
            {puesto.estado === 'trabajado' && puesto.es_ppc && puesto.cobertura_real && (
              <div className="flex items-center gap-1 px-2 py-1 h-7 bg-purple-100 dark:bg-purple-900/20 rounded text-xs text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                <Shield className="h-3 w-3" />
                <span>PPC Asignado</span>
              </div>
            )}

            {/* Botón Eliminar cobertura */}
            {(puesto.estado === 'trabajado' || puesto.estado === 'reemplazo' || puesto.estado === 'sin_cobertura') && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 h-7 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20 border-gray-300 dark:border-gray-600"
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
            {/* Botón Cobertura - solo para PPCs sin cobertura */}
            {(!puesto.cobertura_real && (puesto.estado === 'T' || puesto.estado === 'libre')) && (
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
                    className="text-xs px-2 py-1 h-7 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-300 hover:border-blue-400"
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
            {(puesto.cobertura_real && (puesto.estado === 'trabajado' || puesto.estado === 'reemplazo' || puesto.estado === 'sin_cobertura')) && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 h-7 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20 border-gray-300 dark:border-gray-600"
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
              className={cn(
                "text-xs px-2 py-1 h-7 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-orange-300 hover:border-orange-400",
                puesto.observaciones 
                  ? "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-900/30" 
                  : "text-orange-600"
              )}
              title={puesto.observaciones ? "Ver/editar observaciones" : "Agregar observaciones"}
            >
              <FileText className="h-3 w-3 mr-1" />
              Observaciones
              {puesto.observaciones && (
                <span className="ml-1 text-xs bg-orange-200 text-orange-800 px-1 rounded-full dark:bg-orange-700 dark:text-orange-200">
                  ●
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium">
                📝 Observaciones - {generarIdCortoPuesto(puesto.puesto_id)}
                {puesto.observaciones && (
                  <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full dark:bg-orange-900/30 dark:text-orange-400">
                    Con observaciones
                  </span>
                )}
              </h4>
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
                
                {/* Botón Eliminar - solo aparece si hay observaciones guardadas */}
                {puesto.observaciones && (
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => {
                      showConfirmModal(
                        'Eliminar Observaciones',
                        `¿Estás seguro de que quieres eliminar las observaciones del puesto "${generarIdCortoPuesto(puesto.puesto_id)}"?`,
                        () => {
                          actualizarAsistencia(puesto, 'agregar_observaciones', undefined, undefined, '');
                          setPopoverObservaciones(null);
                          setPuestoEnEdicion(null);
                          setObservaciones('');
                        },
                        'Eliminar',
                        'Cancelar'
                      );
                    }}
                    className="flex-1"
                    title="Eliminar observaciones existentes"
                  >
                    Eliminar
                  </Button>
                )}
                
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
  console.log("Pauta diaria refactorizada con URL dinámica");
  console.log("Pauta diaria cargada correctamente para fecha dinámica");

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

        {/* Filtros y Resumen */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Filtros y Resumen</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {puestosFiltrados.length} resultados
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={limpiarFiltros}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpiar
                </Button>
              </div>
            </div>
            
            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Búsqueda */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">🔍 Búsqueda</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar puesto, instalación, guardia..."
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Instalación */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">🏢 Instalación</Label>
                <Select
                  value={filtros.instalacion}
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, instalacion: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las instalaciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las instalaciones</SelectItem>
                    {instalacionesUnicas.map((instalacion) => (
                      <SelectItem key={instalacion.id} value={instalacion.id}>
                        {instalacion.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Turno */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">🌅 Tipo de Turno</Label>
                <Select
                  value={filtros.tipoTurno}
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, tipoTurno: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los turnos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los turnos</SelectItem>
                    <SelectItem value="dia">Día</SelectItem>
                    <SelectItem value="noche">Noche</SelectItem>
                    <SelectItem value="ppc">PPC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">📊 Estado</Label>
                <Select
                  value={filtros.estado}
                  onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="T">Asignado</SelectItem>
                    <SelectItem value="trabajado">Trabajado</SelectItem>
                    <SelectItem value="reemplazo">Reemplazo</SelectItem>
                    <SelectItem value="sin_cobertura">Sin cobertura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {estadisticas.asignados}
                </div>
                <div className="text-sm text-muted-foreground">📋 Asignados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {estadisticas.trabajados}
                </div>
                <div className="text-sm text-muted-foreground">✅ Trabajados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {estadisticas.reemplazos}
                </div>
                <div className="text-sm text-muted-foreground">🔄 Reemplazos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {estadisticas.sin_cobertura}
                </div>
                <div className="text-sm text-muted-foreground">❌ Sin cobertura</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de puestos */}
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
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[200px]">Instalación / Puesto</TableHead>
                      <TableHead className="w-[150px]">Rol del Puesto</TableHead>
                      <TableHead className="w-[250px]">Asignación</TableHead>
                      <TableHead className="w-[250px]">Cobertura</TableHead>
                      <TableHead className="w-[120px]">Estado</TableHead>
                      <TableHead className="w-[300px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {puestosFiltrados.map((puesto) => (
                      <TableRow key={puesto.puesto_id} className="border-b">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navegarAInstalacion(puesto.instalacion_id)}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              title="Ver instalación"
                            >
                              {generarIdCortoPuesto(puesto.puesto_id)}
                            </button>
                            {puesto.es_ppc && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                PPC
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className={cn(
                              "text-sm",
                              puesto.estado === 'trabajado' && puesto.guardia_original
                                ? "text-green-600 dark:text-green-400 font-medium" 
                                : "text-foreground"
                            )}>
                              {puesto.asignacion_real}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {puesto.cobertura_real ? (
                            <div className="flex items-center gap-2">
                              <UserPlus className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{puesto.cobertura_real}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin cobertura</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEstadoBadge(puesto)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {renderAcciones(puesto)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {puestosFiltrados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No se encontraron puestos que coincidan con los filtros
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Observaciones debajo de la tabla */}
              {puestosFiltrados.some(p => p.observaciones) && (
                <div className="p-4 border-t bg-muted/25">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Observaciones
                  </h4>
                  <div className="space-y-2">
                    {puestosFiltrados
                      .filter(p => p.observaciones)
                      .map((puesto) => (
                        <div key={puesto.puesto_id} className="text-sm">
                          <span className="font-medium text-blue-600">
                            {generarIdCortoPuesto(puesto.puesto_id)}:
                          </span>
                          <span className="ml-2">{puesto.observaciones}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
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