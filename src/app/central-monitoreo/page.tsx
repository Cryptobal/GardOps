'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import DashboardEjecutivo from './components/DashboardEjecutivo';
import NotificacionesTiempoReal from './components/NotificacionesTiempoReal';
import { 
  Calendar, 
  Phone, 
  MessageSquare, 
  Clock, 
  Building, 
  User, 
  RefreshCw, 
  Play, 
  Pause,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Grid3X3,
  List,
  Filter,
  Search,
  Bell,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
  Settings,
  Maximize2,
  Minimize2,
  BarChart,
  Users,
  FileText
} from 'lucide-react';

interface ContactoMonitoreo {
  tipo: 'instalacion' | 'guardia' | 'turno_extra';
  id: string;
  nombre: string;
  telefono: string;
  instalacion_id: string;
  instalacion_nombre: string;
  puesto_nombre: string;
  rol_nombre: string;
  hora_inicio: string;
  hora_termino: string;
  es_turno_extra?: boolean;
  tipo_turno_extra?: string;
}

interface LlamadoProgramado {
  id: string;
  instalacion_id: string;
  instalacion_nombre: string;
  programado_para: string;
  contacto_tipo: string;
  contacto_nombre: string;
  contacto_telefono: string;
  estado: 'pendiente' | 'exitoso' | 'no_contesta' | 'ocupado' | 'incidente' | 'cancelado';
  observaciones?: string;
  canal?: string;
  registrado_en?: string;
  registrado_por_usuario_email?: string;
  categoria?: 'no_realizado' | 'actual' | 'proximo' | 'futuro' | 'completado';
  diferenciaMinutos?: number;
  urgencia?: number;
}

type VistaModo = 'grid' | 'list';
  type FiltroTiempo = 'actuales' | 'proximos' | 'completados' | 'no_realizados' | 'todos';
  type FiltroEstado = 'exitoso' | 'no_contesta' | 'ocupado' | 'incidente' | 'cancelado' | null;
  type ModoVista = 'operativo' | 'ejecutivo';

export default function CentralMonitoreoPage() {
  const [contactos, setContactos] = useState<ContactoMonitoreo[]>([]);
  const [llamados, setLlamados] = useState<LlamadoProgramado[]>([]);
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(() => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });
  const [selectedLlamado, setSelectedLlamado] = useState<LlamadoProgramado | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [observaciones, setObservaciones] = useState('');
  const [estadoLlamado, setEstadoLlamado] = useState<'exitoso' | 'no_contesta' | 'ocupado' | 'incidente' | 'cancelado'>('exitoso');
  const [vistaModo, setVistaModo] = useState<VistaModo>('grid');
      const [filtroTiempo, setFiltroTiempo] = useState<FiltroTiempo>('actuales');
    const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>(null);
    const [busqueda, setBusqueda] = useState('');
    const [mostrarSoloUrgentes, setMostrarSoloUrgentes] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notificaciones, setNotificaciones] = useState(true);
  const [modoVista, setModoVista] = useState<ModoVista>('operativo');
  const { toast } = useToast();

  // Handlers para notificaciones
  const handleDismissNotification = (id: string) => {
    console.log('Notificación descartada:', id);
  };

  const handleMarkAsReadNotification = (id: string) => {
    console.log('Notificación marcada como leída:', id);
  };

  // Hora actual para cálculos
  const horaActual = useMemo(() => new Date(), []);
  const horaActualString = horaActual.toLocaleTimeString('es-CL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      // Cargar contactos disponibles
      const contactosRes = await fetch(`/api/central-monitoring/contactos-disponibles?fecha=${fecha}`, { 
        cache: 'no-store' 
      });
      const contactosData = await contactosRes.json();
      if (contactosData.success) {
        setContactos(contactosData.data);
      }

      // Cargar agenda de llamados
      const agendaRes = await fetch(`/api/central-monitoring/agenda?fecha=${fecha}`, { 
        cache: 'no-store' 
      });
      const agendaData = await agendaRes.json();
      if (agendaData.success) {
        setLlamados(agendaData.data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de monitoreo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [fecha, toast]);

  // Efecto para cargar datos iniciales y polling
  useEffect(() => {
    // Usar setTimeout para evitar actualizaciones durante el render
    const timer = setTimeout(() => {
    cargarDatos();
    }, 0);
    
    return () => clearTimeout(timer);
  }, [cargarDatos]);

  // Efecto separado para el polling
  useEffect(() => {
    if (!autoRefresh) return;
    
    // Usar un timeout más largo para evitar violaciones de performance
    const interval = setInterval(() => {
      // Usar requestIdleCallback si está disponible para mejor performance
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => cargarDatos(), { timeout: 5000 });
      } else {
        setTimeout(cargarDatos, 100); // Pequeño delay para evitar bloqueos
      }
    }, 30000); // Actualizar cada 30 segundos
    
    return () => clearInterval(interval);
  }, [cargarDatos, autoRefresh]);



  // Abrir WhatsApp
  const abrirWhatsApp = (telefono: string, mensaje: string) => {
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // Registrar resultado de llamado
  const registrarLlamado = async () => {
    if (!selectedLlamado) return;

    try {
      // Para llamados no realizados, solo guardar observaciones
      const estadoFinal = selectedLlamado.categoria === 'no_realizado' ? 'no_realizado' : estadoLlamado;
      
      const res = await fetch(`/api/central-monitoring/llamado/${selectedLlamado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: estadoFinal,
          observaciones: observaciones,
          ejecutado_en: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (data.success) {
        toast({
          title: selectedLlamado.categoria === 'no_realizado' ? "Comentarios Guardados" : "Llamado Registrado",
          description: selectedLlamado.categoria === 'no_realizado' 
            ? "Los comentarios se han guardado correctamente"
            : `Estado: ${estadoLlamado}`,
        });
        setModalOpen(false);
        setSelectedLlamado(null);
        setObservaciones('');
        cargarDatos(); // Recargar datos
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error registrando llamado:', error);
      toast({
        title: "Error",
        description: selectedLlamado.categoria === 'no_realizado' 
          ? "No se pudieron guardar los comentarios"
          : "No se pudo registrar el llamado",
        variant: "destructive"
      });
    }
  };





  // Clasificar llamados por urgencia y tiempo
  const llamadosClasificados = useMemo(() => {
    const ahora = new Date();
    const fechaSeleccionada = fecha; // Usar la fecha seleccionada por el usuario
    const fechaActual = ahora.toISOString().split('T')[0]; // YYYY-MM-DD (hoy)
    const horaActual = ahora.getHours();
    const minutoActual = ahora.getMinutes();
    const tiempoActual = horaActual * 60 + minutoActual;

    return llamados.map(llamado => {
      const programado = new Date(llamado.programado_para);
      const fechaProgramada = programado.toISOString().split('T')[0]; // YYYY-MM-DD
      const horaProgramada = programado.getHours();
      const minutoProgramado = programado.getMinutes();
      const tiempoProgramado = horaProgramada * 60 + minutoProgramado;
      
      let categoria: 'no_realizado' | 'actual' | 'proximo' | 'futuro' | 'completado';
      let urgencia: number;

      // Si el llamado no está pendiente, es completado
      if (llamado.estado !== 'pendiente') {
        categoria = 'completado';
        urgencia = 0;
      } else {
        // Comparar la fecha seleccionada con la fecha actual del sistema
        if (fechaSeleccionada < fechaActual) {
          // Estamos viendo una fecha pasada: todos los llamados son históricos
          if (llamado.estado !== 'pendiente') {
            categoria = 'completado';
          } else {
            categoria = 'no_realizado';
          }
          urgencia = 0;
        } else if (fechaSeleccionada > fechaActual) {
          // Estamos viendo una fecha futura: todos los llamados son próximos
          categoria = 'proximo';
          urgencia = 0;
        } else {
          // Estamos viendo la fecha actual: usar lógica de hora
          const diferenciaMinutos = tiempoProgramado - tiempoActual;
          
          if (diferenciaMinutos < 0) { 
            // Llamados no realizados (infracción operativa)
            categoria = 'no_realizado';
            urgencia = Math.abs(diferenciaMinutos);
          } else if (diferenciaMinutos >= 0 && diferenciaMinutos < 60) { 
            // Llamados de la hora actual (ej: si son las 12:34, los de 1:00 son actuales)
            categoria = 'actual';
            urgencia = Math.abs(diferenciaMinutos);
          } else if (diferenciaMinutos >= 60) { 
            // Todos los llamados futuros del turno (más de 1 hora)
            categoria = 'proximo';
            urgencia = diferenciaMinutos;
          } else {
            categoria = 'futuro';
            urgencia = diferenciaMinutos;
          }
        }
      }

      return {
        ...llamado,
        categoria,
        urgencia,
        tiempoProgramado: tiempoProgramado,
        diferenciaMinutos: fechaProgramada === fechaSeleccionada ? tiempoProgramado - tiempoActual : 0
      };
    });
  }, [llamados, fecha]);

  // Filtrar llamados según criterios
  const llamadosFiltrados = useMemo(() => {
    let filtrados = llamadosClasificados;

    // Filtro por tiempo
    switch (filtroTiempo) {
      case 'actuales':
        filtrados = filtrados.filter(l => l.categoria === 'actual');
        break;
      case 'proximos':
        filtrados = filtrados.filter(l => l.categoria === 'proximo');
        break;
      case 'completados':
        filtrados = filtrados.filter(l => l.categoria === 'completado');
        break;
      case 'no_realizados':
        filtrados = filtrados.filter(l => l.categoria === 'no_realizado');
        break;
      case 'todos':
        filtrados = filtrados;
                break;
      }

      // Filtro por estado específico (solo para llamados completados)
      if (filtroEstado) {
        filtrados = filtrados.filter(l => l.categoria === 'completado' && l.estado === filtroEstado);
      }
  
      // Filtro de búsqueda
    if (busqueda) {
      filtrados = filtrados.filter(l =>
        l.instalacion_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        l.contacto_nombre.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filtro de solo actuales (solo cuando no hay filtro específico de KPI)
    if (mostrarSoloUrgentes && filtroTiempo === 'todos') {
      filtrados = filtrados.filter(l => l.categoria === 'actual');
    }

    // Ordenar por urgencia
    return filtrados.sort((a, b) => {
      if (a.categoria === 'no_realizado' && b.categoria !== 'no_realizado') return -1;
      if (b.categoria === 'no_realizado' && a.categoria !== 'no_realizado') return 1;
      return a.urgencia - b.urgencia;
    });
  }, [llamadosClasificados, filtroTiempo, filtroEstado, busqueda, mostrarSoloUrgentes]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const actuales = llamadosClasificados.filter(l => l.categoria === 'actual').length;
    const proximos = llamadosClasificados.filter(l => l.categoria === 'proximo').length;
    const completados = llamadosClasificados.filter(l => l.categoria === 'completado').length;
    const noRealizados = llamadosClasificados.filter(l => l.categoria === 'no_realizado').length;
    const total = llamadosClasificados.length;

    // KPIs específicos por estado (solo para llamados completados)
    const exitosos = llamadosClasificados.filter(l => l.categoria === 'completado' && l.estado === 'exitoso').length;
    const noContestan = llamadosClasificados.filter(l => l.categoria === 'completado' && l.estado === 'no_contesta').length;
    const ocupados = llamadosClasificados.filter(l => l.categoria === 'completado' && l.estado === 'ocupado').length;
    const incidentes = llamadosClasificados.filter(l => l.categoria === 'completado' && l.estado === 'incidente').length;
    const cancelados = llamadosClasificados.filter(l => l.categoria === 'completado' && l.estado === 'cancelado').length;

    return { 
      actuales, 
      proximos, 
      completados, 
      noRealizados, 
      total,
      exitosos,
      noContestan,
      ocupados,
      incidentes,
      cancelados
    };
  }, [llamadosClasificados]);

  // Obtener color y estilo del estado
  const getEstadoEstilo = (categoria: string, estado: string) => {
    // Para llamados completados, priorizar el color del estado específico
    if (categoria === 'completado') {
    switch (estado) {
        case 'exitoso': 
          return {
            bg: 'bg-green-500',
            text: 'text-white',
            border: 'border-green-500',
            pulse: ''
          };
        case 'no_contesta': 
          return {
            bg: 'bg-yellow-500',
            text: 'text-white',
            border: 'border-yellow-500',
            pulse: ''
          };
        case 'ocupado': 
          return {
            bg: 'bg-orange-500',
            text: 'text-white',
            border: 'border-orange-500',
            pulse: ''
          };
        case 'incidente': 
          return {
            bg: 'bg-red-600',
            text: 'text-white',
            border: 'border-red-600',
            pulse: 'animate-pulse'
          };
        case 'cancelado': 
          return {
            bg: 'bg-gray-500',
            text: 'text-white',
            border: 'border-gray-500',
            pulse: ''
          };
        default: 
          return {
            bg: 'bg-green-500',
            text: 'text-white',
            border: 'border-green-500',
            pulse: ''
          };
      }
    }
    
    // Para llamados pendientes, usar colores por categoría temporal
    switch (categoria) {
      case 'no_realizado':
        return {
          bg: 'bg-red-600',
          text: 'text-white',
          border: 'border-red-600',
          pulse: ''
        };
      case 'actual':
        return {
          bg: 'bg-yellow-500',
          text: 'text-white',
          border: 'border-yellow-500',
          pulse: ''
        };
      case 'proximo':
        return {
          bg: 'bg-blue-500',
          text: 'text-white',
          border: 'border-blue-500',
          pulse: ''
        };
      case 'futuro':
        return {
          bg: 'bg-slate-500',
          text: 'text-white',
          border: 'border-slate-500',
          pulse: ''
        };
      default:
        // Fallback para estados pendientes
        return {
          bg: 'bg-blue-500',
          text: 'text-white',
          border: 'border-blue-500',
          pulse: ''
        };
    }
  };

  // Obtener icono del tipo de contacto
  const getContactoIcon = (tipo: string) => {
    switch (tipo) {
      case 'instalacion': return <Building className="w-4 h-4" />;
      case 'guardia': return <User className="w-4 h-4" />;
      case 'turno_extra': return <Clock className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  // Componente de tarjeta de llamado
  const TarjetaLlamado = ({ llamado }: { llamado: any }) => {
    const estilo = getEstadoEstilo(llamado.categoria, llamado.estado);
    const horaProgramada = new Date(llamado.programado_para).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });

  return (
      <Card className={`bg-slate-700/80 backdrop-blur-sm border border-slate-600 hover:bg-slate-600/80 hover:shadow-xl hover:shadow-slate-900/50 transition-all duration-300 cursor-pointer ${estilo.pulse}`}>
        <CardContent className={`p-4 border-l-4 ${estilo.border} bg-gradient-to-r from-slate-700/50 to-slate-800/50`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getContactoIcon(llamado.contacto_tipo)}
              <div>
                <h3 className="font-semibold text-sm text-white">{llamado.instalacion_nombre}</h3>
                <p className="text-xs text-slate-300">{llamado.contacto_nombre}</p>
              </div>
            </div>
            <Badge className={`${estilo.bg} ${estilo.text} text-xs`}>
              {llamado.estado}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-sm font-medium text-white">{horaProgramada}</span>
            </div>
            {llamado.categoria === 'no_realizado' && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-xs text-red-300 font-medium">
                  {Math.abs(llamado.diferenciaMinutos)}m atrasado
                </span>
              </div>
            )}
          </div>

                <div className="flex gap-2">
            {llamado.categoria === 'no_realizado' ? (
              // Para llamados no realizados: solo botón de comentarios
          <Button 
            onClick={() => {
                  setSelectedLlamado(llamado);
                  setObservaciones('');
                  setModalOpen(true);
                }}
                size="sm"
                variant="outline"
                className="flex-1 text-xs border-red-500 text-red-300 hover:bg-red-600 hover:text-white"
              >
                <FileText className="w-3 h-3 mr-1" />
                Comentarios
              </Button>
            ) : llamado.categoria === 'actual' ? (
              // Para llamados actuales: WhatsApp y Registrar
              <>
                <Button
                  onClick={() => abrirWhatsApp(llamado.contacto_telefono, `Hola, llamada de monitoreo programada para las ${horaProgramada}`)}
                  size="sm"
            variant="outline"
                  className="flex-1 text-xs border-slate-500 text-slate-300 hover:bg-slate-600 hover:text-white"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  WhatsApp
                </Button>
                 <Button
                   onClick={() => {
                     setSelectedLlamado(llamado);
                     setObservaciones('');
                     setModalOpen(true);
                   }}
                   size="sm"
                   className={`flex-1 text-xs ${estilo.bg} hover:${estilo.bg.replace('500', '600')} shadow-lg`}
                 >
                   <CheckCircle className="w-3 h-3 mr-1" />
                   Registrar
                 </Button>
              </>
            ) : (
              // Para llamados próximos: solo WhatsApp (no se pueden registrar)
              <Button
                onClick={() => abrirWhatsApp(llamado.contacto_telefono, `Hola, llamada de monitoreo programada para las ${horaProgramada}`)}
                size="sm"
                variant="outline"
                className="flex-1 text-xs border-slate-500 text-slate-300 hover:bg-slate-600 hover:text-white"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                WhatsApp
              </Button>
            )}
          </div>

          {/* Información de registro para llamados completados */}
          {llamado.registrado_en && llamado.estado !== 'pendiente' && (
            <div className="mt-3 pt-3 border-t border-slate-600">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <User className="w-3 h-3" />
                <span>Registrado por {llamado.registrado_por_usuario_email || 'Usuario'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(llamado.registrado_en).toLocaleString('es-CL', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              {llamado.observaciones && (
                <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs text-slate-300">
                  <div className="flex items-center gap-1 mb-1">
                    <FileText className="w-3 h-3" />
                    <span className="font-medium">Observaciones:</span>
                  </div>
                  <p>{llamado.observaciones}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header Principal */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Target className="w-8 h-8 text-blue-400" />
                  Central de Monitoreo
                </h1>
                <p className="text-slate-300 mt-1">
                  Monitoreo en tiempo real • {horaActualString} • {fecha}
                </p>
              </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Toggle de modo de vista */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <Button
                  onClick={() => setModoVista('operativo')}
                  variant={modoVista === 'operativo' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Operativo
                </Button>
                <Button
                  onClick={() => setModoVista('ejecutivo')}
                  variant={modoVista === 'ejecutivo' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  <BarChart className="w-4 h-4 mr-1" />
                  Ejecutivo
          </Button>
              </div>
          

              

            </div>
          </div>
        </div>

        {/* Contenido según modo de vista */}
        {modoVista === 'ejecutivo' ? (
          <DashboardEjecutivo 
            llamados={llamados}
            contactos={contactos}
            fecha={fecha}
            onRefresh={cargarDatos}
          />
        ) : (
          <>
                         {/* Dashboard de KPIs Operativo - Clickables */}
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
               <Card 
                 className={`bg-yellow-50 border-yellow-200 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${filtroTiempo === 'actuales' ? 'ring-2 ring-yellow-500' : ''}`}
                 onClick={() => {
                   setFiltroTiempo('actuales');
                   setMostrarSoloUrgentes(false);
                 }}
               >
                 <CardContent className="p-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-yellow-700">🟡 Actuales</p>
                       <p className="text-2xl font-bold text-yellow-800">{estadisticas.actuales}</p>
                     </div>
                     <Clock className="w-8 h-8 text-yellow-600" />
      </div>
                 </CardContent>
               </Card>

               <Card 
                 className={`bg-blue-50 border-blue-200 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${filtroTiempo === 'proximos' ? 'ring-2 ring-blue-500' : ''}`}
                 onClick={() => {
                   setFiltroTiempo('proximos');
                   setMostrarSoloUrgentes(false);
                 }}
               >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                       <p className="text-sm font-medium text-blue-700">🔵 Próximos</p>
                       <p className="text-2xl font-bold text-blue-800">{estadisticas.proximos}</p>
              </div>
                     <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

               <Card 
                 className={`bg-green-50 border-green-200 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${filtroTiempo === 'completados' ? 'ring-2 ring-green-500' : ''}`}
                 onClick={() => {
                   setFiltroTiempo('completados');
                   setMostrarSoloUrgentes(false);
                 }}
               >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                       <p className="text-sm font-medium text-green-700">🟢 Completados</p>
                       <p className="text-2xl font-bold text-green-800">{estadisticas.completados}</p>
              </div>
                     <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

               <Card 
                 className={`bg-red-50 border-red-200 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${filtroTiempo === 'no_realizados' ? 'ring-2 ring-red-500' : ''}`}
                 onClick={() => {
                   setFiltroTiempo('no_realizados');
                   setMostrarSoloUrgentes(false);
                 }}
               >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                       <p className="text-sm font-medium text-red-700">🔴 No Realizados</p>
                       <p className="text-2xl font-bold text-red-800">{estadisticas.noRealizados}</p>
              </div>
                     <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

               <Card 
                 className={`bg-purple-50 border-purple-200 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${filtroTiempo === 'todos' ? 'ring-2 ring-purple-500' : ''}`}
                 onClick={() => {
                   setFiltroTiempo('todos');
                   setMostrarSoloUrgentes(false);
                 }}
               >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                       <p className="text-sm font-medium text-purple-700">📊 Total</p>
                       <p className="text-2xl font-bold text-purple-800">{estadisticas.total}</p>
              </div>
                     <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
             </div>

             {/* KPIs Específicos por Estado - Solo para Completados */}
             {estadisticas.completados > 0 && (
               <div className="mt-6">
                 <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                   <CheckCircle className="w-5 h-5 text-green-400" />
                   Estados de Llamados Completados
                 </h3>
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                   <Card 
                     className={`bg-green-50 border-green-200 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${filtroEstado === 'exitoso' ? 'ring-2 ring-green-500' : ''}`}
                     onClick={() => {
                       setFiltroTiempo('completados');
                       setFiltroEstado('exitoso');
                       setMostrarSoloUrgentes(false);
                     }}
                   >
                     <CardContent className="p-3">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="text-xs font-medium text-green-700">✅ Exitosos</p>
                           <p className="text-xl font-bold text-green-800">{estadisticas.exitosos}</p>
                         </div>
                         <CheckCircle className="w-6 h-6 text-green-600" />
                       </div>
                     </CardContent>
                   </Card>

                   <Card 
                     className={`bg-yellow-50 border-yellow-200 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${filtroEstado === 'no_contesta' ? 'ring-2 ring-yellow-500' : ''}`}
                     onClick={() => {
                       setFiltroTiempo('completados');
                       setFiltroEstado('no_contesta');
                       setMostrarSoloUrgentes(false);
                     }}
                   >
                     <CardContent className="p-3">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="text-xs font-medium text-yellow-700">📞 No Contesta</p>
                           <p className="text-xl font-bold text-yellow-800">{estadisticas.noContestan}</p>
                         </div>
                         <Phone className="w-6 h-6 text-yellow-600" />
                       </div>
                     </CardContent>
                   </Card>

                   <Card 
                     className={`bg-orange-50 border-orange-200 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${filtroEstado === 'ocupado' ? 'ring-2 ring-orange-500' : ''}`}
                     onClick={() => {
                       setFiltroTiempo('completados');
                       setFiltroEstado('ocupado');
                       setMostrarSoloUrgentes(false);
                     }}
                   >
                     <CardContent className="p-3">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="text-xs font-medium text-orange-700">⏳ Ocupado</p>
                           <p className="text-xl font-bold text-orange-800">{estadisticas.ocupados}</p>
                         </div>
                         <Clock className="w-6 h-6 text-orange-600" />
                       </div>
                     </CardContent>
                   </Card>

                   <Card 
                     className={`bg-red-50 border-red-200 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${filtroEstado === 'incidente' ? 'ring-2 ring-red-500' : ''}`}
                     onClick={() => {
                       setFiltroTiempo('completados');
                       setFiltroEstado('incidente');
                       setMostrarSoloUrgentes(false);
                     }}
                   >
                     <CardContent className="p-3">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="text-xs font-medium text-red-700">🚨 Incidente</p>
                           <p className="text-xl font-bold text-red-800">{estadisticas.incidentes}</p>
                         </div>
                         <AlertTriangle className="w-6 h-6 text-red-600" />
                       </div>
                     </CardContent>
                   </Card>

                   <Card 
                     className={`bg-gray-50 border-gray-200 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${filtroEstado === 'cancelado' ? 'ring-2 ring-gray-500' : ''}`}
                     onClick={() => {
                       setFiltroTiempo('completados');
                       setFiltroEstado('cancelado');
                       setMostrarSoloUrgentes(false);
                     }}
                   >
                     <CardContent className="p-3">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="text-xs font-medium text-gray-700">❌ Cancelado</p>
                           <p className="text-xl font-bold text-gray-800">{estadisticas.cancelados}</p>
                         </div>
                         <XCircle className="w-6 h-6 text-gray-600" />
                       </div>
                     </CardContent>
                   </Card>
                 </div>
               </div>
             )}

                         {/* Controles */}
             <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700 p-4">
               <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                {/* Controles adicionales */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Búsqueda */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar instalación..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-10 w-48"
                    />
                         </div>

                   {/* Botón para limpiar filtro por estado */}
                   {filtroEstado && (
                     <Button
                       onClick={() => {
                         setFiltroEstado(null);
                         setFiltroTiempo('actuales');
                       }}
                       variant="outline"
                       size="sm"
                       className="text-xs border-orange-500 text-orange-300 hover:bg-orange-600 hover:text-white"
                     >
                       <XCircle className="w-3 h-3 mr-1" />
                       Limpiar Filtro Estado
                     </Button>
                   )}

      {/* Selector de fecha */}
                   <div className="relative">
        <Input
          type="date"
          value={fecha}
                       onChange={(e) => {
                         setFecha(e.target.value);
                         cargarDatos(); // Recargar datos automáticamente
                       }}
                       className="w-auto bg-slate-700 border-slate-600 text-white"
                     />
                   </div>



                                {/* Toggle de vista */}
              <div className="flex items-center gap-2 bg-slate-700 rounded-lg p-1">
                    <Button
                      onClick={() => setVistaModo('grid')}
                      variant={vistaModo === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setVistaModo('list')}
                      variant={vistaModo === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

                               {/* Configuraciones adicionales */}
                 <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t">
                   <div className="flex items-center gap-2">
                  <Switch
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <Label className="text-sm">Auto-refresh</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={notificaciones}
                    onCheckedChange={setNotificaciones}
                  />
                  <Label className="text-sm">Notificaciones</Label>
                </div>
              </div>
      </div>

      {/* Contenido principal */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Cargando datos...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Lista de llamados */}
                {llamadosFiltrados.length === 0 ? (
                  <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700">
              <CardContent className="p-8 text-center">
                      <Phone className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No hay llamados para mostrar</h3>
                                             <p className="text-slate-300 mb-4">
                         {filtroEstado ? `No hay llamados ${filtroEstado} para mostrar` :
                          filtroTiempo === 'actuales' ? 'No hay llamados para la hora actual' :
                          filtroTiempo === 'proximos' ? 'No hay llamados próximos' :
                          filtroTiempo === 'completados' ? 'No hay llamados completados' :
                          filtroTiempo === 'no_realizados' ? 'No hay llamados no realizados' :
                          'No hay llamados para mostrar.'}
                       </p>
              </CardContent>
            </Card>
          ) : (
                  <div className={vistaModo === 'grid' 
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "space-y-2"
                  }>
                    {llamadosFiltrados.map((llamado) => (
                      <TarjetaLlamado key={llamado.id} llamado={llamado} />
              ))}
            </div>
          )}
        </div>
            )}
          </>
      )}

      {/* Modal para registrar llamado */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md bg-slate-800 border border-slate-700">
          <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                {selectedLlamado?.categoria === 'no_realizado' ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    Comentarios - Llamado No Realizado
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5" />
                    Registrar Llamado
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                {selectedLlamado?.categoria === 'no_realizado' 
                  ? 'Agrega comentarios sobre por qué no se realizó el llamado'
                  : 'Registra el resultado del llamado a la instalación'
                }
              </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
                <Label className="text-slate-200">Instalación</Label>
                <p className="text-sm text-slate-300 font-medium">{selectedLlamado?.instalacion_nombre}</p>
              </div>
              <div>
                <Label className="text-slate-200">Contacto</Label>
                <p className="text-sm text-slate-300">{selectedLlamado?.contacto_nombre}</p>
            </div>
            <div>
                <Label className="text-slate-200">Hora Programada</Label>
                <p className="text-sm text-slate-300 font-medium">
                {selectedLlamado ? new Date(selectedLlamado.programado_para).toLocaleTimeString('es-CL', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) : ''}
              </p>
            </div>
              {selectedLlamado?.categoria !== 'no_realizado' && (
            <div>
                  <Label className="text-slate-200">Estado</Label>
              <Select value={estadoLlamado} onValueChange={(value: any) => setEstadoLlamado(value)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="exitoso">✅ Exitoso</SelectItem>
                  <SelectItem value="no_contesta">📞 No Contesta</SelectItem>
                  <SelectItem value="ocupado">🚫 Ocupado</SelectItem>
                  <SelectItem value="incidente">⚠️ Incidente</SelectItem>
                  <SelectItem value="cancelado">❌ Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
              )}
            <div>
                <Label className="text-slate-200">Observaciones</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalles del llamado..."
                rows={3}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={registrarLlamado} className="flex-1">
                  {selectedLlamado?.categoria === 'no_realizado' ? (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Guardar Comentarios
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                Guardar
                    </>
                  )}
              </Button>
              <Button onClick={() => setModalOpen(false)} variant="outline">
                  <XCircle className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

         {/* Notificaciones en tiempo real */}
        {notificaciones && (
          <NotificacionesTiempoReal
            llamados={llamados}
            onDismiss={handleDismissNotification}
            onMarkAsRead={handleMarkAsReadNotification}
          />
        )}
      </div>
    </div>
  );
}

