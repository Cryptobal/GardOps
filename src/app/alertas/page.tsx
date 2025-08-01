"use client";

import { useState, useEffect } from "react";
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
  const [filtroModulo, setFiltroModulo] = useState<string>("todos");
  const { toast } = useToast();

  const cargarAlertas = useCallback(async () => {
    try {
      setCargando(true);
      console.log('🔔 Cargando alertas de documentos...');
      
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/alertas-documentos?_t=${timestamp}`, {
        method: 'GET',
        credentials: 'include', // IMPORTANTE: Incluir cookies
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

  // Filtrar alertas según el módulo seleccionado
  useEffect(() => {
    if (filtroModulo === "todos") {
      setAlertasFiltradas(alertas);
    } else {
      setAlertasFiltradas(alertas.filter(alerta => alerta.modulo === filtroModulo));
    }
  }, [alertas, filtroModulo]);

  useEffect(() => {
    cargarAlertas();
    // Auto-refresh cada 30 segundos
    const interval = setInterval(cargarAlertas, 30000);
    return () => clearInterval(interval);
  }, [cargarAlertas]);

  // Calcular KPIs basados en alertas filtradas
  const vencidos = alertasFiltradas.filter(a => a.dias_restantes < 0).length;
  const vencenHoy = alertasFiltradas.filter(a => a.dias_restantes === 0).length;
  const criticos = alertasFiltradas.filter(a => a.dias_restantes > 0 && a.dias_restantes <= 7).length;
  const proximosVencer = alertasFiltradas.filter(a => a.dias_restantes > 7 && a.dias_restantes <= 30).length;

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
        default:
          toast.error("Módulo no soportado");
          return;
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fecha_vencimiento: nuevaFecha
        })
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
    if (diasRestantes < 0) return "bg-red-500 text-white";
    if (diasRestantes === 0) return "bg-red-500 text-white";
    if (diasRestantes <= 7) return "bg-orange-500 text-white";
    if (diasRestantes <= 30) return "bg-yellow-500 text-black";
    return "bg-green-500 text-white";
  };

  const getEstadoTexto = (diasRestantes: number) => {
    if (diasRestantes < 0) return `Vencido hace ${Math.abs(diasRestantes)} días`;
    if (diasRestantes === 0) return "Vence hoy";
    if (diasRestantes === 1) return "Vence mañana";
    return `${diasRestantes} días restantes`;
  };

  const getIconoEstado = (diasRestantes: number) => {
    if (diasRestantes < 0) return "❌";
    if (diasRestantes === 0) return "🚨";
    if (diasRestantes <= 7) return "⚠️";
    if (diasRestantes <= 30) return "📅";
    return "✅";
  };

  const getModuloIcono = (modulo: string) => {
    switch (modulo) {
      case 'clientes': return '🏢';
      case 'instalaciones': return '🏭';
      case 'guardias': return '👤';
      default: return '📄';
    }
  };

  const getModuloNombre = (modulo: string) => {
    switch (modulo) {
      case 'clientes': return 'Cliente';
      case 'instalaciones': return 'Instalación';
      case 'guardias': return 'Guardia';
      default: return 'Documento';
    }
  };

  if (cargando) {
    console.log('🔄 Renderizando estado de carga...');
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          <p className="text-white/60">Cargando alertas y KPIs...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 Renderizando página de alertas...');
  console.log('🎨 Estado alertas:', alertas);
  console.log('🎨 Número de alertas:', alertas.length);
  console.log('🎨 Cargando:', cargando);

  return (
    <div className="min-h-screen bg-[#0F172A] p-6 space-y-6">
      {/* Header con título y botón actualizar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alertas y KPIs</h1>
          <p className="text-white/60 mt-1">Monitoreo y indicadores</p>
          
        </div>
        
        <Button 
          onClick={cargarAlertas}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={cargando}
        >
          {cargando ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              Actualizando...
            </div>
          ) : (
            "Actualizar"
          )}
        </Button>
      </div>

      {/* Filtro por módulo */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            🔍 Filtro por Módulo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={filtroModulo} onValueChange={setFiltroModulo}>
              <SelectTrigger className="w-64 bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Seleccionar módulo" />
              </SelectTrigger>
              <SelectContent className="bg-[#1E293B] border-white/20">
                <SelectItem value="todos" className="text-white hover:bg-white/10">
                  📊 Todos los módulos ({alertas.length})
                </SelectItem>
                <SelectItem value="clientes" className="text-white hover:bg-white/10">
                  🏢 Clientes ({alertas.filter(a => a.modulo === 'clientes').length})
                </SelectItem>
                <SelectItem value="instalaciones" className="text-white hover:bg-white/10">
                  🏭 Instalaciones ({alertas.filter(a => a.modulo === 'instalaciones').length})
                </SelectItem>
                <SelectItem value="guardias" className="text-white hover:bg-white/10">
                  👤 Guardias ({alertas.filter(a => a.modulo === 'guardias').length})
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Badge className="bg-blue-600 text-white">
              {alertasFiltradas.length} {alertasFiltradas.length === 1 ? 'documento' : 'documentos'} filtrados
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-400 text-sm font-medium flex items-center gap-2">
              ❌ Documentos Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{vencidos}</div>
            <p className="text-xs text-red-400/60 mt-1">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-400 text-sm font-medium flex items-center gap-2">
              🚨 Vencen Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{vencenHoy}</div>
            <p className="text-xs text-orange-400/60 mt-1">Acción urgente requerida</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-400 text-sm font-medium flex items-center gap-2">
              ⚠️ Críticos ( ≤ 7 días )
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{criticos}</div>
            <p className="text-xs text-yellow-400/60 mt-1">Programar renovación</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-400 text-sm font-medium flex items-center gap-2">
              📅 Próximos ( ≤ 30 días )
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{proximosVencer}</div>
            <p className="text-xs text-blue-400/60 mt-1">Monitoreo preventivo</p>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Alertas de Vencimiento */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            🔔 Alertas de Vencimiento
            <Badge className="bg-blue-600 text-white ml-2">
              {alertasFiltradas.length} {alertasFiltradas.length === 1 ? 'documento' : 'documentos'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertasFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-white/60">No hay documentos próximos a vencer</p>
              <p className="text-white/40 text-sm mt-1">¡Todos los documentos están al día!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alertasFiltradas.map((alerta) => (
                <div
                  key={alerta.id}
                  className={`border rounded-xl p-5 transition-all hover:bg-white/[0.02] ${
                    alerta.leida 
                      ? 'border-white/5 bg-white/[0.01] opacity-75' 
                      : 'border-white/10 bg-white/[0.02] shadow-lg'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">{getIconoEstado(alerta.dias_restantes)}</span>
                        <h3 className={`font-semibold text-lg ${alerta.leida ? 'text-white/60' : 'text-white'}`}>
                          {alerta.documento_nombre}
                        </h3>
                        <Badge className={getBadgeColor(alerta.dias_restantes)}>
                          {getEstadoTexto(alerta.dias_restantes)}
                        </Badge>
                        {alerta.modulo && (
                          <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/20">
                            {getModuloIcono(alerta.modulo)} {getModuloNombre(alerta.modulo)}
                          </Badge>
                        )}
                        {!alerta.leida && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-white/40">
                            {alerta.modulo === 'clientes' ? '👤 Cliente:' :
                             alerta.modulo === 'instalaciones' ? '🏭 Instalación:' :
                             alerta.modulo === 'guardias' ? '👤 Guardia:' : '📄 Entidad:'}
                          </span>
                          <span className="text-white/80 font-medium">{alerta.entidad_nombre}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white/40">📄 Tipo:</span>
                          <span className="text-white/80">{alerta.tipo_documento_nombre}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white/40">📅 Vence:</span>
                          <span className={`font-medium ${
                            alerta.dias_restantes <= 0 ? 'text-red-400' :
                            alerta.dias_restantes <= 7 ? 'text-orange-400' : 'text-white/80'
                          }`}>
                            {alerta.fecha_vencimiento 
                              ? new Date(alerta.fecha_vencimiento).toLocaleDateString('es-ES', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: 'short',
                                  year: '2-digit'
                                })
                              : 'No especificado'
                            }
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-white/40 mt-3">
                        Alerta generada: {new Date(alerta.creada_en).toLocaleString('es-ES')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => abrirModalEditar(alerta)}
                        className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/20"
                        title="Actualizar fecha"
                      >
                        📅 Editar fecha
                      </Button>
                      
                      {!alerta.leida && (
                        <Button
                          size="sm"
                          onClick={() => marcarComoLeida(alerta.id)}
                          className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/20"
                          title="Marcar como leída"
                        >
                          ✅ Leída
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para editar fecha */}
      <Modal
        isOpen={modalEditar}
        onClose={cerrarModal}
        title="📅 Actualizar fecha de vencimiento"
      >
        <div className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-white/80 mb-2">
              <strong>Documento:</strong> {documentoEditando?.documento_nombre}
            </p>
            <p className="text-sm text-white/60">
              <strong>Entidad:</strong> {documentoEditando?.entidad_nombre}
            </p>
            {documentoEditando?.modulo && (
              <p className="text-sm text-white/60">
                <strong>Módulo:</strong> {getModuloIcono(documentoEditando.modulo)} {getModuloNombre(documentoEditando.modulo)}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Nueva fecha de vencimiento
            </label>
            <Input
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="w-full text-base"
              min={new Date().toISOString().split('T')[0]}
              disabled={actualizando}
              style={{ colorScheme: 'dark' }}
            />
            <p className="text-xs text-white/40 mt-2">
              💡 Esto actualizará las alertas automáticamente
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={actualizarFechaVencimiento}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={actualizando || !nuevaFecha}
            >
              {actualizando ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Actualizando...
                </div>
              ) : (
                "✅ Actualizar fecha"
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={cerrarModal}
              className="flex-1 border-white/20 text-white hover:bg-white/5"
              disabled={actualizando}
            >
              ❌ Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 