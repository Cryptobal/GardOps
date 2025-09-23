"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
import { marcarTurnoExtra } from '@/app/pauta-diaria-v2/apiAdapter';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useChileDate } from '@/hooks/useChileDate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, X, MapPin, Clock, User, Search, Filter, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ModalExitoAsignacion from '../ui/modal-exito-asignacion';
import ModalFechaInicioAsignacion from '../ui/modal-fecha-inicio-asignacion';
import ModalConflictoAsignacion from '../ui/modal-conflicto-asignacion';

interface PPC {
  id: string;
  tipo: 'ppc';
  instalacion: string;
  instalacion_id: string;
  rol: string;
  rol_id: string;
  horario: string;
  estado: string;
}


interface PPCModalProps {
  isOpen: boolean;
  onClose: () => void;
  guardia: {
    id: string;
    nombre: string;
    telefono: string;
    comuna: string;
    distancia: number;
  };
  instalacionId: string;
  onAsignacionExitosa: () => void;
  fechaInicial?: string; // Fecha inicial para el modal (opcional)
}

export default function PPCModal({ 
  isOpen, 
  onClose, 
  guardia, 
  instalacionId, 
  onAsignacionExitosa,
  fechaInicial 
}: PPCModalProps) {
  const { toast } = useToast();
  const { fechaHoy } = useChileDate();
  
  // Ref para el input de fecha
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [ppcs, setPpcs] = useState<PPC[]>([]);
  const [loading, setLoading] = useState(false);
  const [asignando, setAsignando] = useState<string | null>(null);
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTurno, setFiltroTurno] = useState<'todos' | 'dia' | 'noche'>('todos');
  const [filtroInstalacion, setFiltroInstalacion] = useState<string>('todas');
  const [instalaciones, setInstalaciones] = useState<Array<{id: string, nombre: string}>>([]);
  const [instalacionesConPPCs, setInstalacionesConPPCs] = useState<Array<{id: string, nombre: string}>>([]);
  const [ppcsCargados, setPpcsCargados] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const PPCsPorPagina = 9; // 3 filas de 3 columnas
  
  // Estado para selector de fecha
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(() => {
    // Usar fechaInicial si está disponible, sino usar fecha actual en zona horaria de Chile
    const fecha = fechaInicial || new Date().toLocaleString("en-CA", { timeZone: 'America/Santiago' }).split(',')[0];
    console.log('🔍 [PPCModal] Inicializando fechaSeleccionada:', { fechaInicial, fecha });
    return fecha;
  });
  
  // Estado para modal de éxito
  const [modalExito, setModalExito] = useState({
    isOpen: false,
    guardiaInfo: { nombre: '', rut: '' },
    ppcInfo: { instalacion: '', rol: '', horario: '' }
  });

  // Estado para modal de confirmación de tipo (solo para PPCs)
  const [modalTipo, setModalTipo] = useState({
    isOpen: false,
    ppc: null as PPC | null
  });

  // Estado para modal de fecha de inicio de asignación
  const [modalFechaInicio, setModalFechaInicio] = useState({
    isOpen: false,
    ppc: null as PPC | null
  });

  // Estado para modal de conflicto de asignación
  const [modalConflicto, setModalConflicto] = useState({
    isOpen: false,
    conflicto: null as any,
    fechaInicio: '',
    observaciones: ''
  });

  useEffect(() => {
    if (isOpen && instalacionId) {
      cargarInstalaciones();
      // Resetear filtros cuando se abre el modal
      setSearchTerm('');
      setFiltroTurno('todos');
      setFiltroInstalacion('todas');
      setPaginaActual(1);
      // Solo resetear ppcsCargados si no hay instalaciones cargadas
      if (instalaciones.length === 0) {
        setPpcsCargados(false);
      }
    }
  }, [isOpen, instalacionId, instalaciones.length]);

  // Cargar PPCs cuando se cargan las instalaciones (solo una vez)
  useEffect(() => {
    if (instalaciones.length > 0 && !ppcsCargados) {
      cargarPPCs();
    }
  }, [instalaciones.length, ppcsCargados]); // cargarPPCs está memoizada con useCallback

  // Función para determinar el turno basado en la hora (día = AM, noche = PM)
  const obtenerTurno = (horario: string): 'dia' | 'noche' => {
    if (!horario || !horario.includes('-')) return 'dia';
    
    const horaInicio = horario.split('-')[0].trim();
    const hora = parseInt(horaInicio.split(':')[0]);
    
    // Día: 06:00 - 11:59 (AM)
    // Noche: 12:00 - 05:59 (PM)
    if (hora >= 6 && hora < 12) return 'dia';
    return 'noche';
  };

  // Filtrar y buscar PPCs
  const ppcsFiltrados = useMemo(() => {
    let filtrados = ppcs;

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const termino = searchTerm.toLowerCase();
      filtrados = filtrados.filter(ppc => 
        ppc.instalacion.toLowerCase().includes(termino) ||
        ppc.rol.toLowerCase().includes(termino) ||
        ppc.horario.toLowerCase().includes(termino)
      );
    }

    // Filtrar por turno
    if (filtroTurno !== 'todos') {
      filtrados = filtrados.filter(ppc => obtenerTurno(ppc.horario) === filtroTurno);
    }

    // Filtrar por instalación
    if (filtroInstalacion !== 'todas') {
      filtrados = filtrados.filter(ppc => ppc.instalacion_id === filtroInstalacion);
    }

    return filtrados;
  }, [ppcs, searchTerm, filtroTurno, filtroInstalacion]);

  // Paginación
  const totalPaginas = Math.ceil(ppcsFiltrados.length / PPCsPorPagina);
  const ppcsPaginados = ppcsFiltrados.slice(
    (paginaActual - 1) * PPCsPorPagina,
    paginaActual * PPCsPorPagina
  );

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, filtroTurno, filtroInstalacion]);

  const cargarInstalaciones = async () => {
    try {
      const response = await fetch('/api/instalaciones?withCoords=true');
      if (response.ok) {
        const data = await response.json();
        setInstalaciones(data);
      }
    } catch (error) {
      logger.error('Error cargando instalaciones::', error);
    }
  };

  const cargarPPCs = useCallback(async () => {
    try {
      setLoading(true);
      
      logger.debug(`🔍 Cargando todos los PPCs activos (optimizado) para fecha: ${fechaSeleccionada}`);
      
      // Usar el endpoint que carga solo PPCs planificados para la fecha específica
      const response = await fetch(`/api/ppcs-todos?fecha=${fechaSeleccionada}`);
      if (!response.ok) {
        throw new Error('Error al cargar PPCs');
      }
      
      const result = await response.json();
      if (!result || !result.success) {
        throw new Error(result?.error || 'Error al cargar PPCs');
      }
      
      const allPPCs = result.data;
      
      // Debug: mostrar los primeros PPCs recibidos
      logger.debug(`📊 PPCs recibidos para ${fechaSeleccionada}:`, allPPCs.slice(0, 2).map(ppc => ({
        id: ppc.id,
        pauta_id: ppc.pauta_id,
        instalacion: ppc.instalacion_nombre
      })));
      
      // Obtener instalaciones únicas que tienen PPCs
      const instalacionesConPPCs = Array.from(
        new Map(
          allPPCs.map((ppc: any) => [
            ppc.instalacion_id, 
            { id: ppc.instalacion_id, nombre: ppc.instalacion_nombre }
          ])
        ).values()
      );
      
      logger.debug(`✅ PPCs activos cargados (optimizado):`, {
        total: allPPCs.length,
        instalacionesConPPCs: instalacionesConPPCs.length,
        ppcs: allPPCs.slice(0, 3) // Solo mostrar los primeros 3 para debug
      });
      
      // Actualizar la lista de instalaciones con PPCs para el selector
      setInstalacionesConPPCs(instalacionesConPPCs);
      
      // Convertir el formato de respuesta al formato esperado por el componente
      const ppcsFormateados = allPPCs.map((ppc: any) => ({
        id: ppc.id,
        pauta_id: ppc.pauta_id, // Agregar el ID del turno
        tipo: 'ppc' as const,
        instalacion: ppc.instalacion_nombre || ppc.nombre_puesto || 'Instalación',
        instalacion_id: ppc.instalacion_id,
        rol: ppc.rol_nombre || 'Rol',
        rol_id: ppc.rol_id || ppc.id,
        horario: `${ppc.hora_inicio || '08:00'} - ${ppc.hora_termino || '20:00'}`,
        estado: 'Pendiente'
      }));
      
      setPpcs(ppcsFormateados);
      setPpcsCargados(true); // Marcar como cargado para evitar recargas
      
    } catch (error) {
      logger.error('Error cargando PPCs activos::', error);
      if (toast?.error) {
        toast.error('Error de conexión al cargar PPCs', 'Error');
      } else {
        console.error('Error de conexión al cargar PPCs:', error);
      }
      setPpcs([]);
    } finally {
      setLoading(false);
    }
  }, [fechaSeleccionada]); // Incluir fechaSeleccionada como dependencia

  // Recargar PPCs cuando cambie la fecha
  useEffect(() => {
    if (isOpen) {
      cargarPPCs();
    }
  }, [fechaSeleccionada, isOpen, cargarPPCs]);

  // Funciones para manejar diferentes tipos de asignación
  const handleClickPPC = (ppc: PPC) => {
    // Para PPCs, mostrar modal de selección de tipo
    setModalTipo({
      isOpen: true,
      ppc: ppc
    });
  };

  const handleAsignarPermanente = (ppc: PPC) => {
    // Abrir modal de fecha de inicio en lugar de asignar directamente
    console.log('🔍 Debug PPCModal - Abriendo modal de fecha:', { ppc, guardia, fechaSeleccionada });
    setModalFechaInicio({
      isOpen: true,
      ppc: ppc
    });
  };

  const handleConfirmarAsignacionConFecha = async (fechaInicio: string, observaciones?: string) => {
    if (!modalFechaInicio.ppc) return;

    try {
      setAsignando(modalFechaInicio.ppc.id);
      logger.debug('🟦 Verificando conflicto antes de asignación permanente:', { 
        guardia_id: guardia.id, 
        puesto_operativo_id: modalFechaInicio.ppc.id,
        fecha_inicio: fechaInicio
      });

      // Verificar si hay conflicto de asignación
      const conflictoResponse = await fetch('/api/ppc/verificar-conflicto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puesto_operativo_id: modalFechaInicio.ppc.id,
          fecha_inicio: fechaInicio
        })
      });

      if (!conflictoResponse.ok) {
        throw new Error('Error verificando conflictos de asignación');
      }

      const conflictoData = await conflictoResponse.json();
      
      if (conflictoData.success && conflictoData.data.tieneConflicto) {
        // Hay conflicto, mostrar modal de confirmación
        setModalConflicto({
          isOpen: true,
          conflicto: conflictoData.data.conflicto,
          fechaInicio,
          observaciones: observaciones || ''
        });
        
        // Cerrar modal de fecha
        setModalFechaInicio({
          isOpen: false,
          ppc: null
        });
        
        setAsignando(null);
        return;
      }

      // No hay conflicto, proceder con la asignación
      await realizarAsignacionPermanente(fechaInicio, observaciones);
      
    } catch (error) {
      logger.error('Error verificando conflicto o asignando guardia permanente::', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`No se pudo asignar el guardia: ${errorMessage}`, 'Error');
      setAsignando(null);
    }
  };

  const realizarAsignacionPermanente = async (fechaInicio: string, observaciones?: string) => {
    if (!modalFechaInicio.ppc) return;

    try {
      // CORREGIR LA FECHA PARA EVITAR PROBLEMAS DE TIMEZONE
      const fechaCorregida = fechaInicio + 'T12:00:00';
      
      logger.debug('🟦 Realizando asignación permanente:', { 
        guardia_id: guardia.id, 
        puesto_operativo_id: modalFechaInicio.ppc.id,
        fecha_inicio_original: fechaInicio,
        fecha_inicio_corregida: fechaCorregida,
        fecha_parseada_original: new Date(fechaInicio),
        fecha_parseada_corregida: new Date(fechaCorregida),
        fecha_parseada_corregida_chile: new Date(fechaCorregida).toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
        fechaActualUTC: new Date().toISOString(),
        fechaActualChile: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
        fechaActualChileISO: new Date().toLocaleString('en-CA', { timeZone: 'America/Santiago' })
      });
      
      const response = await fetch('/api/ppc/asignar-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardia_id: guardia.id,
          puesto_operativo_id: modalFechaInicio.ppc.id,
          fecha_inicio: fechaCorregida,
          motivo_inicio: 'asignacion_buscador_ggss',
          observaciones
        })
      });

      if (!response.ok) {
        let errorMessage = 'Error al asignar guardia';
        try {
          const data = await response.json();
          errorMessage = data?.error || errorMessage;
        } catch (jsonError) {
          logger.error('Error parsing JSON response::', jsonError);
        }
        throw new Error(errorMessage);
      }

      // Cerrar modal de fecha
      setModalFechaInicio({
        isOpen: false,
        ppc: null
      });

      mostrarModalExito('permanente', guardia, modalFechaInicio.ppc);
      
    } catch (error) {
      logger.error('Error asignando guardia permanente::', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`No se pudo asignar el guardia: ${errorMessage}`, 'Error');
      throw error; // Re-lanzar para que sea manejado por el caller
    } finally {
      setAsignando(null);
    }
  };

  const handleConfirmarReasignacion = async () => {
    try {
      setAsignando(modalConflicto.conflicto.puesto_operativo_id || 'conflicto');
      
      await realizarAsignacionPermanente(modalConflicto.fechaInicio, modalConflicto.observaciones);
      
      // Cerrar modal de conflicto
      setModalConflicto({
        isOpen: false,
        conflicto: null,
        fechaInicio: '',
        observaciones: ''
      });
      
    } catch (error) {
      logger.error('Error en reasignación::', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`No se pudo realizar la reasignación: ${errorMessage}`, 'Error');
      setAsignando(null);
    }
  };

  const handleTurnoExtraPPC = async (ppc: PPC) => {
    try {
      setAsignando(ppc.id);
      logger.debug('🟨 Turno extra PPC - Buscando pauta_id para puesto:', { puesto_id: ppc.id, guardia_id: guardia.id });
      
      // Usar la fecha seleccionada por el usuario
      const fecha = fechaSeleccionada;
      
      // Debug de fechas
      logger.debug('🔍 Debug fechas:', {
        fechaSeleccionada,
        fechaHoy,
        fechaCalculada: new Date().toLocaleString("en-CA", { timeZone: 'America/Santiago' }).split(',')[0],
        fechaUTC: new Date().toISOString().split('T')[0],
        fechaFinal: fecha,
        timezone: new Date().getTimezoneOffset()
      });
      
      // Saltarse la búsqueda de pauta_id y ir directo a crear el PPC
      logger.debug('🔍 Saltándose búsqueda de pauta_id, creando PPC directamente:', ppc.id);
      
      try {
          // Crear el registro del PPC en as_turnos_pauta_mensual
          const [anio, mes, dia] = fecha.split('-').map(Number);
          
          const createPPCResponse = await fetch('/api/pauta-diaria-v2/create-ppc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puesto_id: ppc.id,
              anio: anio,
              mes: mes,
              dia: dia,
              guardia_id: null,
              estado: 'planificado'
            })
          });
          
          if (createPPCResponse.ok) {
            const createResult = await createPPCResponse.json();
            logger.debug('🔍 Respuesta de creación PPC:', createResult);
            
            if (createResult.success && createResult.pauta_id) {
              logger.debug('✅ PPC creado exitosamente:', createResult);
              
              // Ahora usar el endpoint que funciona para asignar el turno extra
              logger.debug('🔄 Llamando a /api/turnos/ppc/cubrir con:', {
                pauta_id: createResult.pauta_id,
                cobertura_guardia_id: guardia.id
              });
              
              try {
                // Crear AbortController para timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
                
                const cubrirResponse = await fetch('/api/turnos/ppc/cubrir', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    pauta_id: createResult.pauta_id,
                    cobertura_guardia_id: guardia.id
                  }),
                  signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                logger.debug('🔍 Respuesta de cubrir PPC:', {
                  ok: cubrirResponse.ok,
                  status: cubrirResponse.status,
                  statusText: cubrirResponse.statusText
                });
                
                if (cubrirResponse.ok) {
                  const cubrirResult = await cubrirResponse.json();
                  logger.debug('✅ Turno extra asignado exitosamente:', cubrirResult);
                  
                  // Log visible para confirmar éxito
                  console.log('🎉🎉🎉 ASIGNACIÓN EXITOSA 🎉🎉🎉');
                  console.log('🎉 Turno extra asignado correctamente');
                  console.log('🎉 PPC ID:', ppc.id);
                  console.log('🎉 Guardia ID:', guardia.id);
                  console.log('🎉 Fecha:', fecha);
                  console.log('🎉 Pauta ID:', createResult.pauta_id);
                  
                  mostrarModalExito('turno_extra_ppc', guardia, ppc);
                  
                  return; // Salir exitosamente
                } else {
                  const errorText = await cubrirResponse.text();
                  logger.warn('⚠️ Error cubriendo PPC:', errorText);
                }
              } catch (fetchError) {
                if (fetchError.name === 'AbortError') {
                  logger.error('❌ Timeout al cubrir PPC (10 segundos)');
                  throw new Error('La asignación tardó demasiado tiempo. Por favor, intenta nuevamente.');
                } else {
                  logger.error('❌ Error en fetch de cubrir PPC:', fetchError);
                  throw fetchError;
                }
              }
            } else {
              logger.warn('⚠️ PPC creado pero sin pauta_id válido:', createResult);
            }
          } else {
            const errorResult = await createPPCResponse.json();
            logger.warn('⚠️ Error creando PPC:', errorResult);
            
            // Manejar error específico de puesto libre
            if (errorResult.error && errorResult.error.includes('día libre')) {
              toast.error('No se puede asignar turno extra a un puesto que está marcado como día libre', 'Error');
              return;
            }
            
            toast.error(`Error: ${errorResult.error || 'Error desconocido'}`, 'Error');
          }
        } catch (createError) {
          logger.warn('⚠️ Error en creación de PPC:', createError);
          throw new Error(`No se encontró pauta_id para este PPC en la fecha ${fecha}. El PPC puede no estar planificado para esta fecha.`);
        }
      } catch (error) {
      logger.error('Error creando turno extra PPC::', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error en asignación de turno extra:', errorMessage);
      // Usar console.error en lugar de toast.error para evitar TypeError
      if (typeof toast?.error === 'function') {
        toast.error(`No se pudo crear el turno extra: ${errorMessage}`, 'Error');
      } else {
        alert(`Error: No se pudo crear el turno extra: ${errorMessage}`);
      }
    } finally {
      setAsignando(null);
    }
  };


  const mostrarModalExito = (tipo: string, guardia: Guard, ppc: PPC | null) => {
    let mensaje = '';
    let info = { instalacion: '', rol: '', horario: '' };
    
    if (tipo === 'permanente' && ppc) {
      mensaje = 'Asignación Permanente';
      info = { instalacion: ppc.instalacion, rol: ppc.rol, horario: ppc.horario };
    } else if (tipo === 'turno_extra_ppc' && ppc) {
      mensaje = 'Turno Extra - PPC';
      info = { instalacion: ppc.instalacion, rol: ppc.rol, horario: ppc.horario };
    }

    setModalExito({
      isOpen: true,
      guardiaInfo: { nombre: guardia.nombre, rut: '' },
      ppcInfo: info
    });
    
    // Llamar a onAsignacionExitosa de forma segura
    try {
      if (typeof onAsignacionExitosa === 'function') {
        onAsignacionExitosa();
      }
    } catch (error) {
      logger.error('Error en onAsignacionExitosa:', error);
    }
    
    // No cerrar el modal principal aquí, se cerrará cuando se cierre el modal de éxito
  };

  const cerrarModalExito = () => {
    setModalExito({
      isOpen: false,
      guardiaInfo: { nombre: '', rut: '' },
      ppcInfo: { instalacion: '', rol: '', horario: '' }
    });
    // Cerrar el modal principal también
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[85vh] overflow-hidden bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-white dark:bg-gray-900">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Asignar {guardia.nombre}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4 bg-white dark:bg-gray-900 overflow-y-auto max-h-[calc(85vh-120px)]">
          {/* Información del guardia */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">{guardia.nombre}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{guardia.comuna}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Distancia: {guardia.distancia.toFixed(1)} km</span>
            </div>
          </div>

          {/* Selector de fecha */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-900 dark:text-blue-100">Fecha para asignación</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="flex-1 text-sm border-blue-200 dark:border-blue-700 focus:border-blue-500 dark:focus:border-blue-400"
                ref={inputRef}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.showPicker?.()}
                className="px-2 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  // Usar la fecha actual en zona horaria de Chile
                  setFechaSeleccionada(new Date().toLocaleString("en-CA", { timeZone: 'America/Santiago' }).split(',')[0]);
                }}
                className="px-3 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                📅 Hoy
              </Button>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Selecciona la fecha para la cual quieres asignar el turno extra
            </p>
          </div>

          {/* PPCs Disponibles */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🟦 Puestos Pendientes por Cubrir (PPCs)
              </h3>
              <Badge variant="outline" className="text-xs">
                {ppcsFiltrados.length} de {ppcs.length}
              </Badge>
            </div>
            
            {/* Barra de búsqueda y filtros */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por instalación, rol o horario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              
              {/* Selector de instalaciones */}
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Instalación:</span>
                <select
                  value={filtroInstalacion}
                  onChange={(e) => setFiltroInstalacion(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todas">Todas las instalaciones</option>
                  {instalacionesConPPCs.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nombre}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filtros rápidos */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filtroTurno === 'todos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroTurno('todos')}
                  className="text-xs"
                >
                  Todos
                </Button>
                <Button
                  variant={filtroTurno === 'dia' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroTurno('dia')}
                  className="text-xs"
                >
                  ☀️ Día
                </Button>
                <Button
                  variant={filtroTurno === 'noche' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroTurno('noche')}
                  className="text-xs"
                >
                  🌙 Noche
                </Button>
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Cargando pauta del día...</span>
              </div>
            ) : ppcs.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>No hay PPCs disponibles hoy</p>
              </div>
            ) : ppcsFiltrados.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <Filter className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>No se encontraron PPCs con los filtros aplicados</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setFiltroTurno('todos');
                  }}
                  className="mt-2"
                >
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              <>
                {/* Lista de PPCs en Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ppcsPaginados.map((ppc) => (
                    <div key={ppc.id} className="border border-blue-200 dark:border-blue-700 rounded-lg p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors bg-white dark:bg-gray-900">
                      <div className="flex flex-col h-full">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs">
                              {ppc.rol}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {obtenerTurno(ppc.horario) === 'dia' ? '☀️' : '🌙'}
                            </Badge>
                            {ppc.pauta_id && (
                              <Badge variant="outline" className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                ID: {ppc.pauta_id}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">{ppc.instalacion}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Horario: {ppc.horario}</p>
                        </div>
                        <div className="mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleClickPPC(ppc)}
                            disabled={asignando === ppc.id}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {asignando === ppc.id ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Procesando...
                              </>
                            ) : (
                              'Seleccionar'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginación */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Página {paginaActual} de {totalPaginas}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                        disabled={paginaActual === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                        disabled={paginaActual === totalPaginas}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Modal de selección de tipo para PPCs */}
      {modalTipo.isOpen && modalTipo.ppc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <Card className="w-full max-w-md bg-white dark:bg-gray-900">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                ¿Cómo asignar a {modalTipo.ppc.instalacion}?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setModalTipo({ isOpen: false, ppc: null });
                    handleAsignarPermanente(modalTipo.ppc!);
                  }}
                  className="w-full justify-start text-left h-auto p-4 bg-blue-600 hover:bg-blue-700"
                  disabled={asignando === modalTipo.ppc.id}
                >
                  <div>
                    <div className="font-medium text-white">🟦 Asignar Permanente</div>
                    <div className="text-sm text-blue-100">Guardia fijo, PPC se cierra</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => {
                    setModalTipo({ isOpen: false, ppc: null });
                    handleTurnoExtraPPC(modalTipo.ppc!);
                  }}
                  className="w-full justify-start text-left h-auto p-4 bg-yellow-600 hover:bg-yellow-700"
                  disabled={asignando === modalTipo.ppc.id}
                >
                  <div>
                    <div className="font-medium text-white">🟨 Turno Extra</div>
                    <div className="text-sm text-yellow-100">Solo por hoy, PPC sigue abierto</div>
                  </div>
                </Button>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setModalTipo({ isOpen: false, ppc: null })}
                className="w-full mt-4"
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de fecha de inicio de asignación */}
      {modalFechaInicio.isOpen && modalFechaInicio.ppc && (
        <>
          {console.log('🔍 Debug PPCModal - Renderizando modal de fecha:', { modalFechaInicio, guardia, fechaSeleccionada })}
          <ModalFechaInicioAsignacion
            isOpen={modalFechaInicio.isOpen}
            onClose={() => setModalFechaInicio({ isOpen: false, ppc: null })}
            onConfirmar={handleConfirmarAsignacionConFecha}
            guardiaNombre={guardia.nombre}
            guardiaInstalacionActual=""
            nuevaInstalacionNombre={modalFechaInicio.ppc.instalacion}
            nuevoRolServicioNombre={modalFechaInicio.ppc.rol}
            esReasignacion={false}
            fechaInicial={fechaSeleccionada}
          />
        </>
      )}

      {/* Modal de conflicto de asignación */}
      {modalConflicto.isOpen && modalConflicto.conflicto && (
        <ModalConflictoAsignacion
          isOpen={modalConflicto.isOpen}
          onClose={() => setModalConflicto({
            isOpen: false,
            conflicto: null,
            fechaInicio: '',
            observaciones: ''
          })}
          onConfirmar={handleConfirmarReasignacion}
          nuevoGuardiaNombre={guardia.nombre}
          conflicto={modalConflicto.conflicto}
          loading={!!asignando}
        />
      )}

      {/* Modal de éxito de asignación */}
      <ModalExitoAsignacion
        isOpen={modalExito.isOpen}
        onClose={cerrarModalExito}
        guardiaInfo={modalExito.guardiaInfo}
        ppcInfo={modalExito.ppcInfo}
      />
    </div>
  );
}

