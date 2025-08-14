import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  Filter, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  CalendarDays,
  Eye,
  Download,
  FileText,
  Users,
  Building,
  Shield,
  Search,
  Clock,
  CheckCircle,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AlertaDocumento {
  id: string;
  documento_id: string;
  dias_restantes: number;
  mensaje: string;
  creada_en: string;
  leida: boolean;
  documento_nombre?: string;
  entidad_nombre?: string;
  entidad_id?: string;
  fecha_vencimiento?: string;
  tipo_documento_nombre?: string;
  modulo?: string;
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<AlertaDocumento[]>([]);
  const [alertasFiltradas, setAlertasFiltradas] = useState<AlertaDocumento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalEditar, setModalEditar] = useState(false);
  const [documentoEditando, setDocumentoEditando] = useState<AlertaDocumento | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [actualizando, setActualizando] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [filtros, setFiltros] = useState({
    modulo: 'todos',
    estado: 'todos',
    search: ''
  });
  const { toast } = useToast();

  const cargarAlertas = useCallback(async () => {
    try {
      setCargando(true);
      console.log('🔔 Cargando alertas de documentos...');
      
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/alertas-documentos?_t=${timestamp}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      const data = await response.json();
      console.log('📄 Respuesta alertas RAW:', data);
      console.log('📄 Data.success:', data.success);
      console.log('📄 Data.data:', data.data);
      console.log('📄 Data.data length:', data.data?.length);
      
      if (data.success) {
        const alertasArray = data.data || [];
        console.log('✅ Alertas array:', alertasArray);
        console.log('✅ Setting alertas to:', alertasArray);
        setAlertas(alertasArray);
        console.log(`✅ ${alertasArray.length} alertas cargadas y establecidas`);
      } else {
        console.error('❌ Error cargando alertas:', data.error);
        toast.error('Error al cargar alertas');
        setAlertas([]);
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      toast.error('Error de conexión');
      setAlertas([]);
    } finally {
      setCargando(false);
      console.log('🏁 Carga de alertas completada');
    }
  }, [toast]);

  // Filtrar alertas según los filtros aplicados
  useEffect(() => {
    let alertasFiltradas = alertas;

    // Filtro por módulo
    if (filtros.modulo !== 'todos') {
      alertasFiltradas = alertasFiltradas.filter(alerta => alerta.modulo === filtros.modulo);
    }

    // Filtro por estado (días restantes)
    if (filtros.estado !== 'todos') {
      switch (filtros.estado) {
        case 'vencidos':
          alertasFiltradas = alertasFiltradas.filter(a => a.dias_restantes < 0);
          break;
        case 'vencen_hoy':
          alertasFiltradas = alertasFiltradas.filter(a => a.dias_restantes === 0);
          break;
        case 'criticos':
          alertasFiltradas = alertasFiltradas.filter(a => a.dias_restantes > 0 && a.dias_restantes <= 7);
          break;
        case 'proximos':
          alertasFiltradas = alertasFiltradas.filter(a => a.dias_restantes > 7 && a.dias_restantes <= 30);
          break;
      }
    }

    // Filtro por búsqueda
    if (filtros.search) {
      const searchLower = filtros.search.toLowerCase();
      alertasFiltradas = alertasFiltradas.filter(alerta => 
        alerta.documento_nombre?.toLowerCase().includes(searchLower) ||
        alerta.entidad_nombre?.toLowerCase().includes(searchLower) ||
        alerta.tipo_documento_nombre?.toLowerCase().includes(searchLower)
      );
    }

    setAlertasFiltradas(alertasFiltradas);
  }, [alertas, filtros]);

  useEffect(() => {
    cargarAlertas();
    // Auto-refresh cada 30 segundos
    const interval = setInterval(cargarAlertas, 30000);
    return () => clearInterval(interval);
  }, [cargarAlertas]);

  // Calcular KPIs basados en todas las alertas (no filtradas)
  const vencidos = alertas.filter((a: AlertaDocumento) => a.dias_restantes < 0).length;
  const vencenHoy = alertas.filter((a: AlertaDocumento) => a.dias_restantes === 0).length;
  const criticos = alertas.filter((a: AlertaDocumento) => a.dias_restantes > 0 && a.dias_restantes <= 7).length;
  const proximosVencer = alertas.filter((a: AlertaDocumento) => a.dias_restantes > 7 && a.dias_restantes <= 30).length;

  const abrirModalEditar = (alerta: AlertaDocumento) => {
    setDocumentoEditando(alerta);
    // Convertir la fecha UTC a formato local para el input
    const fechaLocal = alerta.fecha_vencimiento ? new Date(alerta.fecha_vencimiento).toISOString().split('T')[0] : "";
    setNuevaFecha(fechaLocal);
    setModalEditar(true);
  };

  const cerrarModal = () => {
    setModalEditar(false);
    setDocumentoEditando(null);
    setNuevaFecha("");
    setActualizando(false);
  };

  const actualizarFechaVencimiento = async () => {
    if (!documentoEditando || !nuevaFecha) {
      toast.error("Fecha requerida");
      return;
    }

    try {
      setActualizando(true);
      
      console.log('🔄 Actualizando fecha de vencimiento:', {
        documento_id: documentoEditando.documento_id,
        nueva_fecha: nuevaFecha,
        modulo: documentoEditando.modulo
      });

      // Determinar el endpoint según el módulo
      let endpoint = '';
      switch (documentoEditando.modulo) {
        case 'clientes':
          endpoint = `/api/documentos-clientes?id=${documentoEditando.documento_id}`;
          break;
        case 'instalaciones':
          endpoint = `/api/documentos-instalaciones?id=${documentoEditando.documento_id}`;
          break;
        case 'guardias':
          endpoint = `/api/documentos-guardias?id=${documentoEditando.documento_id}`;
          break;
        case 'guardias_os10':
          endpoint = `/api/guardias/${documentoEditando.documento_id}/fecha-os10`;
          break;
        default:
          toast.error("Módulo no soportado");
          return;
      }

      const body = documentoEditando.modulo === 'guardias_os10' 
        ? { fecha_os10: nuevaFecha }
        : { fecha_vencimiento: nuevaFecha };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      console.log('📄 Respuesta actualización:', data);

      if (data.success) {
        toast.success("Fecha de vencimiento actualizada");
        cerrarModal();
        // Recargar alertas después de actualizar
        await cargarAlertas();
      } else {
        toast.error(data.error || "Error al actualizar");
        setActualizando(false);
      }
    } catch (error) {
      console.error('❌ Error actualizando fecha:', error);
      toast.error("Error al actualizar fecha");
      setActualizando(false);
    }
  };

  const marcarComoLeida = async (alertaId: string) => {
    try {
      console.log('✅ Marcando alerta como leída:', alertaId);
      
      const response = await fetch(`/api/alertas-documentos?id=${alertaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leida: true
        })
      });

      if (response.ok) {
        // Actualizar estado local
        setAlertas(prev => prev.map(alerta => 
          alerta.id === alertaId ? { ...alerta, leida: true } : alerta
        ));
        toast.success("Alerta marcada como leída");
      }
    } catch (error) {
      console.error('❌ Error marcando alerta:', error);
    }
  };

  const getBadgeColor = (diasRestantes: number) => {
    if (diasRestantes < 0) return "bg-red-600/20 text-red-300 border-red-500/30";
    if (diasRestantes === 0) return "bg-red-600/20 text-red-300 border-red-500/30";
    if (diasRestantes <= 7) return "bg-orange-600/20 text-orange-300 border-orange-500/30";
    if (diasRestantes <= 30) return "bg-yellow-600/20 text-yellow-300 border-yellow-500/30";
    return "bg-green-600/20 text-green-300 border-green-500/30";
  };

  const getEstadoTexto = (diasRestantes: number) => {
    if (diasRestantes < 0) return `Vencido hace ${Math.abs(diasRestantes)} días`;
    if (diasRestantes === 0) return "Vence hoy";
    if (diasRestantes === 1) return "Vence mañana";
    return `${diasRestantes} días restantes`;
  };

  const getIconoEstado = (diasRestantes: number) => {
    if (diasRestantes < 0) return AlertTriangle;
    if (diasRestantes === 0) return AlertTriangle;
    if (diasRestantes <= 7) return Clock;
    if (diasRestantes <= 30) return Calendar;
    return CheckCircle;
  };

  const getModuloIcon = (modulo: string) => {
    switch (modulo) {
      case 'clientes': return Users;
      case 'instalaciones': return Building;
      case 'guardias': return Shield;
      case 'guardias_os10': return AlertTriangle;
      default: return FileText;
    }
  };

  const getModuloNombre = (modulo: string) => {
    switch (modulo) {
      case 'clientes': return 'Cliente';
      case 'instalaciones': return 'Instalación';
      case 'guardias': return 'Guardia';
      case 'guardias_os10': return 'OS10';
      default: return 'Documento';
    }
  };

  const resetearFiltros = () => {
    setFiltros({
      modulo: 'todos',
      estado: 'todos',
      search: ''
    });
  };

  if (cargando) {
    console.log('🔄 Renderizando estado de carga...');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Cargando alertas y KPIs...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 Renderizando página de alertas...');
  console.log('🎨 Estado alertas:', alertas);
  console.log('🎨 Número de alertas:', alertas.length);
  console.log('🎨 Cargando:', cargando);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                Alertas y KPIs
              </h1>
              <p className="text-muted-foreground mt-2">
                Monitoreo y indicadores de documentos próximos a vencer
              </p>
            </div>
            <Button
              onClick={cargarAlertas}
              variant="outline"
              size="sm"
              disabled={cargando}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${cargando ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </motion.div>

        {/* KPIs - Optimizado para móviles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Vencidos</p>
                  <p className="text-lg md:text-2xl font-bold text-red-400">{vencidos.toLocaleString()}</p>
                </div>
                <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Vencen Hoy</p>
                  <p className="text-lg md:text-2xl font-bold text-orange-400">{vencenHoy.toLocaleString()}</p>
                </div>
                <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Críticos (≤7 días)</p>
                  <p className="text-lg md:text-2xl font-bold text-yellow-400">{criticos.toLocaleString()}</p>
                </div>
                <Clock className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Próximos (≤30 días)</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-400">{proximosVencer.toLocaleString()}</p>
                </div>
                <Calendar className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filtros - Colapsables por defecto */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card/50 border-border/50">
            <CardHeader 
              className="cursor-pointer"
              onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
            >
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </div>
                {filtrosAbiertos ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </CardTitle>
            </CardHeader>
            {filtrosAbiertos && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Módulo</label>
                    <Select 
                      value={filtros.modulo} 
                      onValueChange={(value) => setFiltros(prev => ({ ...prev, modulo: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los módulos</SelectItem>
                        <SelectItem value="clientes">Clientes</SelectItem>
                        <SelectItem value="instalaciones">Instalaciones</SelectItem>
                        <SelectItem value="guardias">Guardias</SelectItem>
                        <SelectItem value="guardias_os10">OS10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Estado</label>
                    <Select 
                      value={filtros.estado} 
                      onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los estados</SelectItem>
                        <SelectItem value="vencidos">Vencidos</SelectItem>
                        <SelectItem value="vencen_hoy">Vencen hoy</SelectItem>
                        <SelectItem value="criticos">Críticos (≤7 días)</SelectItem>
                        <SelectItem value="proximos">Próximos (≤30 días)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Búsqueda</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar alertas..."
                        value={filtros.search}
                        onChange={(e) => setFiltros(prev => ({ ...prev, search: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={resetearFiltros}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpiar Filtros
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Lista de Alertas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Alertas de Vencimiento ({alertasFiltradas.length})</span>
                {cargando && (
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertasFiltradas.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <p className="text-muted-foreground">
                      {cargando ? 'Cargando alertas...' : 'No hay documentos próximos a vencer'}
                    </p>
                    {!cargando && (
                      <p className="text-sm text-muted-foreground">¡Todos los documentos están al día!</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {alertasFiltradas.map((alerta) => {
                    const EstadoIcon = getIconoEstado(alerta.dias_restantes);
                    const ModuloIcon = getModuloIcon(alerta.modulo || '');
                    return (
                      <Card 
                        key={alerta.id} 
                        className={`bg-card/30 border-border/30 transition-all hover:bg-card/40 ${
                          alerta.leida ? 'opacity-75' : ''
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            {/* Header del documento */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-1">
                                  <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <p className={`text-xs font-medium truncate ${
                                    alerta.leida ? 'text-muted-foreground' : 'text-white'
                                  }`}>
                                    {alerta.documento_nombre}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {alerta.tipo_documento_nombre || 'Sin tipo'}
                                </p>
                              </div>
                              {!alerta.leida && (
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse flex-shrink-0"></div>
                              )}
                            </div>

                            {/* Información del módulo y entidad */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <ModuloIcon className="h-2.5 w-2.5 text-muted-foreground" />
                                <span className="text-xs capitalize text-muted-foreground">
                                  {getModuloNombre(alerta.modulo || '')}
                                </span>
                              </div>
                              <p className="text-xs text-white truncate">
                                {alerta.entidad_nombre}
                              </p>
                            </div>

                            {/* Estado y vencimiento */}
                            <div className="space-y-1">
                              <Badge className={`text-xs px-2 py-0.5 ${getBadgeColor(alerta.dias_restantes)}`}>
                                <EstadoIcon className="h-2.5 w-2.5 mr-1" />
                                {getEstadoTexto(alerta.dias_restantes)}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {alerta.fecha_vencimiento 
                                  ? new Date(alerta.fecha_vencimiento).toLocaleDateString('es-ES', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: '2-digit'
                                    })
                                  : 'No especificado'
                                }
                              </p>
                            </div>

                            {/* Fecha de alerta */}
                            <p className="text-xs text-muted-foreground">
                              {new Date(alerta.creada_en).toLocaleDateString('es-ES')}
                            </p>

                            {/* Acciones */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => abrirModalEditar(alerta)}
                                  title="Editar fecha"
                                  className="h-6 w-6 p-0 hover:bg-orange-600/20"
                                >
                                  <CalendarDays className="h-2.5 w-2.5" />
                                </Button>
                                {!alerta.leida && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => marcarComoLeida(alerta.id)}
                                    title="Marcar como leída"
                                    className="h-6 w-6 p-0 hover:bg-green-600/20"
                                  >
                                    <CheckCircle className="h-2.5 w-2.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Modal para editar fecha */}
      <Modal
        isOpen={modalEditar}
        onClose={cerrarModal}
        title="Editar Fecha de Vencimiento"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Documento
            </label>
            <p className="text-white font-medium">{documentoEditando?.documento_nombre}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Entidad
            </label>
            <p className="text-white">{documentoEditando?.entidad_nombre}</p>
          </div>

          {documentoEditando?.modulo && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Módulo
              </label>
              <p className="text-white">{getModuloNombre(documentoEditando.modulo)}</p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Nueva Fecha de Vencimiento
            </label>
            <Input
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="w-full"
              min={new Date().toISOString().split('T')[0]}
              disabled={actualizando}
            />
            <p className="text-xs text-muted-foreground mt-2">
              💡 Esto actualizará las alertas automáticamente
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={cerrarModal}
              disabled={actualizando}
            >
              Cancelar
            </Button>
            <Button
              onClick={actualizarFechaVencimiento}
              disabled={actualizando || !nuevaFecha}
            >
              {actualizando ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Actualizando...
                </div>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 