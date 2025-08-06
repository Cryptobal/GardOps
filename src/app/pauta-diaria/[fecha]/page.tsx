'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

  Clock, 
  User,
  Shield,
  Eye,
  EyeOff,
  RotateCcw,
  Plus,
  Minus,
  Filter,
  Search,
  FileDown,
  FileSpreadsheet,
  DollarSign
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
import { exportarPautaPDF, exportarPautaExcel } from '@/lib/export-utils';

interface Puesto {
  puesto_id: string;
  nombre_puesto: string;
  guardia_original: { id: string; nombre: string } | null;
  asignacion_real: string;
  cobertura_real: string | null;
  estado: string;
  observaciones: string | null;
  instalacion_id: string;
  instalacion_nombre: string; // Agregado para mostrar el nombre de la instalación
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
  const fechaInicial = params.fecha || format(new Date(), 'yyyy-MM-dd');

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(fechaInicial);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [pautaId, setPautaId] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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
  
  // Estado para controlar la visibilidad de los filtros
  const [showFiltros, setShowFiltros] = useState(false);
  
  // Estados para controlar popovers - Usando un objeto para mayor estabilidad
  const [openPopovers, setOpenPopovers] = useState<{
    observaciones: string | null;
    reemplazo: string | null;
    cobertura: string | null;
  }>({
    observaciones: null,
    reemplazo: null,
    cobertura: null
  });
  
  // Refs para prevenir cierres accidentales
  const popoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastOpenTimeRef = useRef<number>(0);
  
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
    nombre: p.instalacion_nombre || 'Sin nombre'
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
  const cargarPautaDiaria = async (fecha: string, isActionReload = false) => {
    if (!isActionReload) {
      setLoading(true);
    }
    try {
      // Corregir el problema de zona horaria
      const [anio, mes, dia] = fecha.split('-').map(Number);
      
      const response = await fetch(`/api/pauta-diaria?anio=${anio}&mes=${mes}&dia=${dia}`);
      if (response.ok) {
        const data = await response.json();
        setPuestos(data.puestos || data);
        // Obtener pauta_id si está disponible en la respuesta
        if (data.pauta_id) {
          setPautaId(data.pauta_id);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Error del servidor:', errorData);
        
        // Mejorar mensaje de error para conflictos
        let errorMessage = errorData.error || "Error al actualizar el estado";
        let errorTitle = "❌ Error";
        
        if (response.status === 409 && errorData.conflicto) {
          errorTitle = "⚠️ Conflicto de Asignación";
          errorMessage = `${errorData.error}\n\nEl guardia ya está asignado a:\n• Instalación: ${errorData.conflicto.instalacion}\n• Puesto: ${errorData.conflicto.puesto}`;
        } else if (response.status === 409) {
          errorTitle = "⚠️ Conflicto de Asignación";
        }
        
        addToast({
          title: errorTitle,
          description: errorMessage,
          type: "error"
        });
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

  // Funciones de exportación
  const handleExportarPDF = () => {
    try {
      exportarPautaPDF(puestos, fechaSeleccionada);
      addToast({
        title: "✅ PDF Generado",
        description: "La pauta diaria se ha exportado correctamente en PDF",
        type: "success"
      });
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      addToast({
        title: "❌ Error",
        description: "No se pudo generar el PDF. Inténtalo de nuevo.",
        type: "error"
      });
    }
  };

  const handleExportarExcel = () => {
    try {
      exportarPautaExcel(puestos, fechaSeleccionada);
      addToast({
        title: "✅ Excel Generado",
        description: "La pauta diaria se ha exportado correctamente en Excel",
        type: "success"
      });
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      addToast({
        title: "❌ Error",
        description: "No se pudo generar el Excel. Inténtalo de nuevo.",
        type: "error"
      });
    }
  };

  // Actualizar estado de asistencia - Memoizado para evitar re-renders
  const actualizarAsistencia = useCallback(async (
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
    
    setActionLoading(puesto.puesto_id);
    
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
        await cargarPautaDiaria(fechaSeleccionada, true);
        setCambiosPendientes(false);
        setPuestoEnEdicion(null);
        setObservaciones('');
        setMotivoInasistencia('');
        setSearchTerm('');
        console.log('✅ Pauta recargada exitosamente');
      } else {
        const errorData = await response.json();
        console.error('❌ Error del servidor:', errorData);
        
        // Mejorar mensaje de error para conflictos
        let errorMessage = errorData.error || "Error al actualizar el estado";
        let errorTitle = "❌ Error";
        
        if (response.status === 409 && errorData.conflicto) {
          errorTitle = "⚠️ Conflicto de Asignación";
          errorMessage = `${errorData.error}\n\nEl guardia ya está asignado a:\n• Instalación: ${errorData.conflicto.instalacion}\n• Puesto: ${errorData.conflicto.puesto}`;
        } else if (response.status === 409) {
          errorTitle = "⚠️ Conflicto de Asignación";
        }
        
        addToast({
          title: errorTitle,
          description: errorMessage,
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
    } finally {
      setActionLoading(null);
    }
  }, [fechaSeleccionada, addToast]);

  // Renderizar badge de estado
  const renderEstadoBadge = (puesto: Puesto) => {
    // Caso especial: PPC cubierto (trabajado con cobertura)
    if (puesto.es_ppc && puesto.estado === 'trabajado' && puesto.cobertura_real) {
      return (
        <Badge className="text-xs font-medium bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200">
          <span className="mr-1">🛡️</span>
          PPC Cubierto
        </Badge>
      );
    }

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

  // Renderizar acciones para un puesto - Memoizado para evitar re-renders
  const renderAcciones = useCallback((puesto: Puesto, viewType: 'desktop' | 'mobile' = 'desktop') => {
    // Crear un ID único para cada popover basado en el tipo de vista
    const popoverId = `${puesto.puesto_id}-${viewType}`;
    
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
                disabled={actionLoading === puesto.puesto_id}
                title="Marcar asistencia"
              >
                <Check className="h-3 w-3 mr-1" />
                {actionLoading === puesto.puesto_id ? 'Procesando...' : 'Asistió'}
              </Button>
            )}

            {/* Botón No Asistió - Solo mostrar si NO está ya marcado como trabajado */}
            {puesto.estado !== 'trabajado' && (
              <Popover 
                open={openPopovers.reemplazo === popoverId} 
                onOpenChange={(open) => {
                  const now = Date.now();
                  console.log('🔍 Popover Reemplazo onOpenChange:', { 
                    open, 
                    popoverId,
                    currentState: openPopovers.reemplazo,
                    timestamp: now,
                    timeSinceOpen: now - lastOpenTimeRef.current
                  });
                  
                  if (open) {
                    // Registrar el tiempo de apertura
                    lastOpenTimeRef.current = now;
                    setOpenPopovers(prev => ({ ...prev, reemplazo: popoverId, observaciones: null, cobertura: null }));
                    setPuestoEnEdicion(puesto);
                    setObservaciones('');
                    setMotivoInasistencia('');
                    setSearchTerm('');
                    searchGuardias('');
                  } else {
                    // Ignorar cierres que ocurren muy rápido después de abrir
                    const timeSinceOpen = now - lastOpenTimeRef.current;
                    if (timeSinceOpen < 500) {
                      console.log('🚫 Ignorando cierre accidental de Reemplazo (muy rápido):', timeSinceOpen, 'ms');
                      return;
                    }
                    
                    setOpenPopovers(prev => ({ ...prev, reemplazo: null }));
                    setPuestoEnEdicion(null);
                    setObservaciones('');
                    setMotivoInasistencia('');
                    setSearchTerm('');
                  }
                }}
                modal={true}>
                <PopoverTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs px-2 py-1 h-7 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300 hover:border-red-400"
                    disabled={actionLoading === puesto.puesto_id}
                    title="Marcar no asistió"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {actionLoading === puesto.puesto_id ? 'Procesando...' : 'No Asistió'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96">
                  <div className="space-y-4">
                    <h4 className="font-medium">❌ No Asistió</h4>
                    
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
                        disabled={!puestoEnEdicion?.guardia_original?.id}
                        onClick={() => {
                          actualizarAsistencia(puesto, 'reemplazo', puestoEnEdicion.guardia_original.id, '', observaciones);
                          setOpenPopovers(prev => ({ ...prev, reemplazo: null }));
                          setPuestoEnEdicion(null);
                          setObservaciones('');
                          setMotivoInasistencia('');
                          setSearchTerm('');
                        }}
                        className="flex-1"
                      >
                        Asignar Reemplazo
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => {
                          actualizarAsistencia(puesto, 'sin_cobertura', undefined, '', observaciones);
                          setOpenPopovers(prev => ({ ...prev, reemplazo: null }));
                          setPuestoEnEdicion(null);
                          setObservaciones('');
                          setMotivoInasistencia('');
                          setSearchTerm('');
                        }}
                        className="flex-1"
                      >
                        Sin Cobertura
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setOpenPopovers(prev => ({ ...prev, reemplazo: null }));
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
                disabled={actionLoading === puesto.puesto_id}
                title="Eliminar cobertura"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {actionLoading === puesto.puesto_id ? 'Procesando...' : 'Eliminar'}
              </Button>
            )}
          </>
        )}

        {/* Si es PPC */}
        {puesto.es_ppc && (
          <>
            {/* Botón Cobertura - solo para PPCs sin cobertura */}
            {(!puesto.cobertura_real && (puesto.estado === 'T' || puesto.estado === 'libre')) && (
              <Popover 
                open={openPopovers.cobertura === popoverId} 
                onOpenChange={(open) => {
                  const now = Date.now();
                  console.log('🔍 Popover Cobertura onOpenChange:', { 
                    open, 
                    popoverId, 
                    currentState: openPopovers.cobertura,
                    timestamp: now,
                    timeSinceOpen: now - lastOpenTimeRef.current
                  });
                  
                  if (open) {
                    // Registrar el tiempo de apertura
                    lastOpenTimeRef.current = now;
                    setOpenPopovers(prev => ({ ...prev, cobertura: popoverId, observaciones: null, reemplazo: null }));
                    setPuestoEnEdicion(puesto);
                    setObservaciones('');
                    setSearchTerm('');
                    searchGuardias('');
                  } else {
                    // Ignorar cierres que ocurren muy rápido después de abrir
                    const timeSinceOpen = now - lastOpenTimeRef.current;
                    if (timeSinceOpen < 500) {
                      console.log('🚫 Ignorando cierre accidental de Cobertura (muy rápido):', timeSinceOpen, 'ms');
                      return;
                    }
                    
                    setOpenPopovers(prev => ({ ...prev, cobertura: null }));
                    setPuestoEnEdicion(null);
                    setObservaciones('');
                    setSearchTerm('');
                  }
                }}
                modal={true}>
                <PopoverTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs px-2 py-1 h-7 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-300 hover:border-blue-400"
                    disabled={actionLoading === puesto.puesto_id}
                    title="Asignar cobertura"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {actionLoading === puesto.puesto_id ? 'Procesando...' : 'Cobertura'}
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
                          setOpenPopovers(prev => ({ ...prev, cobertura: null }));
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
                          setOpenPopovers(prev => ({ ...prev, cobertura: null }));
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

            {/* Botón Eliminar cobertura para PPC - aparece si tiene cobertura O está en estado sin_cobertura */}
            {((puesto.cobertura_real && (puesto.estado === 'trabajado' || puesto.estado === 'reemplazo')) || puesto.estado === 'sin_cobertura') && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 h-7 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20 border-gray-300 dark:border-gray-600"
                onClick={() => {
                  const titulo = puesto.estado === 'sin_cobertura' && !puesto.cobertura_real 
                    ? 'Eliminar Estado Sin Cobertura' 
                    : 'Eliminar Cobertura PPC';
                  
                  const mensaje = puesto.estado === 'sin_cobertura' && !puesto.cobertura_real
                    ? `¿Estás seguro de que quieres eliminar el estado "sin cobertura" del PPC "${generarIdCortoPuesto(puesto.puesto_id)}" y dejarlo disponible para asignar?`
                    : `¿Estás seguro de que quieres eliminar la cobertura del PPC "${generarIdCortoPuesto(puesto.puesto_id)}"?`;
                  
                  showConfirmModal(
                    titulo,
                    mensaje,
                    () => {
                      actualizarAsistencia(puesto, 'eliminar_cobertura', undefined, undefined, observaciones);
                    },
                    'Eliminar',
                    'Cancelar'
                  );
                }}
                disabled={actionLoading === puesto.puesto_id}
                title={puesto.estado === 'sin_cobertura' && !puesto.cobertura_real ? "Eliminar estado sin cobertura" : "Eliminar cobertura"}
              >
                <Minus className="h-3 w-3 mr-1" />
                {actionLoading === puesto.puesto_id ? 'Procesando...' : 'Eliminar'}
              </Button>
            )}
          </>
        )}

        {/* Botón Observaciones para todos */}
        <Popover 
          open={openPopovers.observaciones === popoverId} 
          onOpenChange={(open) => {
            const now = Date.now();
            console.log('🔍 Popover Observaciones onOpenChange:', { 
              open, 
              popoverId, 
              currentState: openPopovers.observaciones,
              timestamp: now,
              timeSinceOpen: now - lastOpenTimeRef.current
            });
            
            // Limpiar timeout anterior si existe
            if (popoverTimeoutRef.current) {
              clearTimeout(popoverTimeoutRef.current);
              popoverTimeoutRef.current = null;
            }
            
            if (open) {
              // Registrar el tiempo de apertura
              lastOpenTimeRef.current = now;
              // Abrir inmediatamente
              setOpenPopovers(prev => ({ ...prev, observaciones: popoverId, cobertura: null, reemplazo: null }));
              setPuestoEnEdicion(puesto);
              setObservaciones(puesto.observaciones || '');
            } else {
              // Ignorar cierres que ocurren muy rápido después de abrir (menos de 500ms)
              const timeSinceOpen = now - lastOpenTimeRef.current;
              if (timeSinceOpen < 500) {
                console.log('🚫 Ignorando cierre accidental (muy rápido):', timeSinceOpen, 'ms');
                return; // Ignorar este cierre
              }
              
              // Si ha pasado suficiente tiempo, permitir el cierre
              setOpenPopovers(prev => ({ ...prev, observaciones: null }));
              setPuestoEnEdicion(null);
              setObservaciones('');
            }
          }}
          modal={true}>
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
              disabled={actionLoading === puesto.puesto_id}
              title={puesto.observaciones ? "Ver/editar observaciones" : "Agregar observaciones"}
            >
              <FileText className="h-3 w-3 mr-1" />
              {actionLoading === puesto.puesto_id ? 'Procesando...' : 'Observaciones'}
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
                    setOpenPopovers(prev => ({ ...prev, observaciones: null }));
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
                          setOpenPopovers(prev => ({ ...prev, observaciones: null }));
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
                    setOpenPopovers(prev => ({ ...prev, observaciones: null }));
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
  }, [
    openPopovers,
    actionLoading,
    searchTerm,
    observaciones,
    motivoInasistencia,
    guardiasOptions,
    loadingGuardias,
    puestoEnEdicion,
    actualizarAsistencia,
    addToast,
    showConfirmModal,
    setOpenPopovers,
    setPuestoEnEdicion,
    setObservaciones,
    setMotivoInasistencia,
    setSearchTerm,
    searchGuardias
  ]);

  // Logs solo en desarrollo y en el primer render
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log("✅ Vista de pauta diaria operativa y refactorizada");
      console.log("Pauta diaria refactorizada con URL dinámica");
      console.log("Pauta diaria cargada correctamente para fecha dinámica");
    }
  }, []); // Solo ejecutar una vez

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
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/pauta-diaria/turnos-extras')}
              variant="outline"
              size="sm"
              className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Turnos Extras
            </Button>
          </div>
        </div>

        {/* Selector de fecha */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Seleccionar Fecha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Fecha actual en móvil */}
              {fechaSeleccionada && (
                <div className={cn(
                  "text-center p-2 rounded bg-muted/50",
                  fechaSeleccionada === format(new Date(), 'yyyy-MM-dd')
                    ? "text-green-600 font-medium bg-green-50 dark:bg-green-900/20" 
                    : "text-muted-foreground"
                )}>
                  {(() => {
                    const fechaConHora = new Date(fechaSeleccionada + 'T00:00:00');
                    const textoFormateado = format(fechaConHora, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es });
                    return textoFormateado;
                  })()}
                  {fechaSeleccionada === format(new Date(), 'yyyy-MM-dd') && (
                    <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full dark:bg-green-700 dark:text-green-200">
                      Hoy
                    </span>
                  )}
                </div>
              )}

              {/* Controles de fecha optimizados para móvil */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cambiarFecha(-1)}
                  className="h-10 w-10 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex-1">
                  <DatePickerComponent
                    value={fechaSeleccionada}
                    onChange={setFechaSeleccionada}
                    placeholder="Seleccionar fecha"
                    className="w-full"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cambiarFecha(1)}
                  className="h-10 w-10 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Botón Hoy centrado */}
              <div className="flex justify-center">
                <Button
                  variant="default"
                  size="sm"
                  onClick={irAHoy}
                  className="h-10 px-6 bg-green-600 hover:bg-green-700 text-white"
                  title="Ir al día de hoy"
                >
                  Hoy
                </Button>
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

        {/* Filtros y Resumen */}
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setShowFiltros(!showFiltros)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros y Resumen
                <span className="text-sm text-muted-foreground">
                  ({puestosFiltrados.length} resultados)
                </span>
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    limpiarFiltros();
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {showFiltros && (
            <CardContent className="pt-0">
              {/* KPIs - Siempre visibles en móvil */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {estadisticas.asignados}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">📋 Asignados</div>
                </div>
                <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {estadisticas.trabajados}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">✅ Trabajados</div>
                </div>
                <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">
                    {estadisticas.reemplazos}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">🔄 Reemplazos</div>
                </div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                  <div className="text-xl sm:text-2xl font-bold text-red-600">
                    {estadisticas.sin_cobertura}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">❌ Sin cobertura</div>
                </div>
              </div>

              {/* Filtros - Optimizados para móvil */}
              <div className="space-y-3">
                {/* Búsqueda - Siempre visible */}
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

                {/* Filtros en grid para móvil */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Instalación */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">🏢 Instalación</Label>
                    <Select
                      value={filtros.instalacion}
                      onValueChange={(value) => setFiltros(prev => ({ ...prev, instalacion: value }))}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Todas" />
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
                    <Label className="text-xs font-medium">🌅 Turno</Label>
                    <Select
                      value={filtros.tipoTurno}
                      onValueChange={(value) => setFiltros(prev => ({ ...prev, tipoTurno: value }))}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Todos" />
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
                    <Label className="text-xs font-medium">📊 Estado</Label>
                    <Select
                      value={filtros.estado}
                      onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Todos" />
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

                  {/* Botón Limpiar */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium opacity-0">Limpiar</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={limpiarFiltros}
                      className="w-full h-9 text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Limpiar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
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
          <>
            {/* Vista de escritorio - Tabla */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[200px]">Instalación / Puesto</TableHead>
                        <TableHead className="w-[180px]">Rol del Puesto</TableHead>
                        <TableHead className="w-[230px]">Asignación</TableHead>
                        <TableHead className="w-[230px]">Cobertura</TableHead>
                        <TableHead className="w-[120px]">Estado</TableHead>
                        <TableHead className="w-[300px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {puestosFiltrados.map((puesto) => (
                        <TableRow key={puesto.puesto_id} className="border-b">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">
                                  {puesto.instalacion_nombre}
                                </span>
                                <button
                                  onClick={() => navegarAInstalacion(puesto.instalacion_id)}
                                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                  title="Ver instalación"
                                >
                                  {generarIdCortoPuesto(puesto.puesto_id)}
                                </button>
                              </div>
                              {puesto.es_ppc && (
                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                  PPC
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          {/* Rol del Puesto */}
                          <TableCell>
                            <span className="text-sm text-foreground">
                              {puesto.nombre_puesto}
                            </span>
                          </TableCell>

                          {/* Asignación */}
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

                          {/* Cobertura */}
                          <TableCell>
                            {puesto.cobertura_real ? (
                              <div className="flex items-center gap-2">
                                {puesto.es_ppc && puesto.estado === 'trabajado' ? (
                                  <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                ) : (
                                  <UserPlus className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                )}
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
                              {renderAcciones(puesto, 'desktop')}
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

            {/* Vista móvil - Contenedores de dos en dos */}
            <div className="md:hidden space-y-4">
              {puestosFiltrados.map((puesto, index) => (
                <Card key={puesto.puesto_id} className="border-2 hover:border-blue-300 transition-colors">
                  <CardContent className="p-4">
                    {/* Header del puesto */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {puesto.instalacion_nombre}
                          </span>
                          {puesto.es_ppc && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              PPC
                            </Badge>
                          )}
                        </div>
                        <button
                          onClick={() => navegarAInstalacion(puesto.instalacion_id)}
                          className="font-bold text-lg text-blue-600 hover:text-blue-800"
                          title="Ver instalación"
                        >
                          {generarIdCortoPuesto(puesto.puesto_id)}
                        </button>
                      </div>
                      <div className="flex-shrink-0">
                        {renderEstadoBadge(puesto)}
                      </div>
                    </div>

                    {/* Información del guardia */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className={cn(
                          "text-sm font-medium",
                          puesto.estado === 'trabajado' && puesto.guardia_original
                            ? "text-green-600 dark:text-green-400" 
                            : "text-foreground"
                        )}>
                          {puesto.asignacion_real}
                        </span>
                      </div>
                      
                      {puesto.cobertura_real && (
                        <div className="flex items-center gap-2">
                          {puesto.es_ppc && puesto.estado === 'trabajado' ? (
                            <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <UserPlus className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            Cobertura: {puesto.cobertura_real}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botones de acción optimizados para móvil */}
                    <div className="grid grid-cols-2 gap-2">
                      {renderAcciones(puesto, 'mobile')}
                    </div>

                    {/* Observaciones visibles en móvil */}
                    {puesto.observaciones && (
                      <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-700">
                        <div className="text-xs text-orange-700 dark:text-orange-300">
                          <span className="font-medium">Observación:</span> {puesto.observaciones}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {puestosFiltrados.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8 text-muted-foreground">
                    No se encontraron puestos que coincidan con los filtros
                  </CardContent>
                </Card>
              )}
            </div>
          </>
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