"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

interface TipoDocumento {
  id: string;
  modulo: string;
  nombre: string;
  requiere_vencimiento: boolean;
  dias_antes_alarma: number;
  creado_en: string;
}

const MODULOS = [
  { value: "clientes", label: "Clientes" },
  { value: "guardias", label: "Guardias" },
  { value: "instalaciones", label: "Instalaciones" },
];

export default function TiposDocumentosPage() {
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [filtroModulo, setFiltroModulo] = useState<string>("");
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [tipoAEliminar, setTipoAEliminar] = useState<TipoDocumento | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<TipoDocumento | null>(null);
  const [formData, setFormData] = useState({ 
    modulo: "", 
    nombre: "", 
    requiere_vencimiento: false, 
    dias_antes_alarma: 30 
  });
  const { toast } = useToast();

  const cargarTipos = async () => {
    try {
      setCargando(true);
      console.log('🔄 Cargando tipos de documentos...');
      
      // Agregar timestamp para evitar caché
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/tipos-documentos?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const data = await response.json();
      console.log('📄 Respuesta del servidor:', data);
      
      if (data.success) {
        setTipos(data.data);
        console.log(`✅ ${data.data.length} tipos cargados exitosamente`);
      } else {
        console.error("❌ Error cargando tipos:", data.error);
        toast.error("Error al cargar tipos de documentos");
      }
    } catch (error) {
      console.error("❌ Error de conexión:", error);
      toast.error("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTipos();
  }, []);

  const tiposFiltrados = filtroModulo 
    ? tipos.filter(tipo => tipo.modulo === filtroModulo)
    : tipos;

  const abrirModal = (tipo?: TipoDocumento) => {
    if (tipo) {
      setEditando(tipo);
      setFormData({ 
        modulo: tipo.modulo, 
        nombre: tipo.nombre,
        requiere_vencimiento: tipo.requiere_vencimiento || false,
        dias_antes_alarma: tipo.dias_antes_alarma || 30
      });
      console.log('✏️ Editando tipo:', tipo);
    } else {
      setEditando(null);
      setFormData({ 
        modulo: "", 
        nombre: "", 
        requiere_vencimiento: false, 
        dias_antes_alarma: 30 
      });
      console.log('➕ Creando nuevo tipo');
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
    setGuardando(false);
    setFormData({ 
      modulo: "", 
      nombre: "", 
      requiere_vencimiento: false, 
      dias_antes_alarma: 30 
    });
  };

  const abrirModalEliminar = (tipo: TipoDocumento) => {
    setTipoAEliminar(tipo);
    setModalEliminarAbierto(true);
    console.log('🗑️ Preparando eliminación de:', tipo);
  };

  const cerrarModalEliminar = () => {
    setModalEliminarAbierto(false);
    setTipoAEliminar(null);
    setEliminando(false);
  };

  const guardarTipo = async () => {
    if (!formData.modulo || !formData.nombre) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    if (formData.requiere_vencimiento && formData.dias_antes_alarma < 1) {
      toast.error("Los días antes de alarma deben ser mayor a 0");
      return;
    }

    try {
      setGuardando(true);
      
      const url = editando 
        ? `/api/tipos-documentos?id=${editando.id}`
        : "/api/tipos-documentos";
      
      const method = editando ? "PUT" : "POST";
      
      console.log(`${editando ? '🔄' : '➕'} ${method} ${url}`, formData);
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('📄 Respuesta:', data);

      if (data.success) {
        toast.success(editando ? "Tipo actualizado exitosamente" : "Tipo creado exitosamente");
        cerrarModal();
        // Forzar recarga inmediata
        await cargarTipos();
      } else {
        toast.error(data.error || "Error al guardar");
        setGuardando(false);
      }
    } catch (error) {
      console.error("❌ Error guardando tipo:", error);
      toast.error("Error al guardar el tipo");
      setGuardando(false);
    }
  };

  const eliminarTipo = async () => {
    if (!tipoAEliminar) return;

    try {
      setEliminando(true);
      
      console.log('🗑️ Eliminando tipo:', tipoAEliminar.id);
      
      const response = await fetch(`/api/tipos-documentos?id=${tipoAEliminar.id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      console.log('📄 Respuesta eliminación:', data);

      if (data.success) {
        toast.success("Tipo eliminado exitosamente");
        cerrarModalEliminar();
        // Forzar recarga inmediata
        await cargarTipos();
      } else {
        toast.error(data.error || "Error al eliminar");
        setEliminando(false);
      }
    } catch (error) {
      console.error("❌ Error eliminando tipo:", error);
      toast.error("Error al eliminar el tipo");
      setEliminando(false);
    }
  };

  if (cargando) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          <p className="text-sm text-white/60">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header minimalista */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div>
          <h1 className="text-xl font-medium text-white">Tipos de Documentos</h1>
          <p className="text-sm text-white/60 mt-1">
            {tiposFiltrados.length} tipos {filtroModulo && `en ${MODULOS.find(m => m.value === filtroModulo)?.label}`}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Filtro simple */}
          <select
            value={filtroModulo}
            onChange={(e) => setFiltroModulo(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20"
          >
            <option value="">Todos los módulos</option>
            {MODULOS.map((modulo) => (
              <option key={modulo.value} value={modulo.value}>
                {modulo.label}
              </option>
            ))}
          </select>
          
          <Button 
            onClick={() => abrirModal()}
            className="bg-white text-black hover:bg-white/90 px-4 py-2 text-sm font-medium"
          >
            Nuevo tipo
          </Button>
        </div>
      </div>

      {/* Tabla minimalista */}
      <div className="flex-1 overflow-auto">
        {tiposFiltrados.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-white/40 text-sm">
                {filtroModulo ? "No hay tipos en este módulo" : "No hay tipos de documentos"}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-8 py-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-6 py-4 text-sm font-medium text-white/80">Nombre</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-white/80">Módulo</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-white/80">Vencimiento</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-white/80">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tiposFiltrados.map((tipo, index) => (
                    <tr
                      key={tipo.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        index !== tiposFiltrados.length - 1 ? 'border-b border-white/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-white text-sm font-medium">{tipo.nombre}</span>
                          {tipo.requiere_vencimiento && (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs px-2 py-0.5">
                              Vencimiento
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white/60 text-sm">
                          {MODULOS.find(m => m.value === tipo.modulo)?.label || tipo.modulo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {tipo.requiere_vencimiento ? (
                          <span className="text-white/60 text-sm">
                            {tipo.dias_antes_alarma} días antes
                          </span>
                        ) : (
                          <span className="text-white/30 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirModal(tipo)}
                            className="p-2 hover:bg-white/10 rounded-md transition-colors group"
                            title="Editar"
                          >
                            <svg className="w-4 h-4 text-white/40 group-hover:text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => abrirModalEliminar(tipo)}
                            className="p-2 hover:bg-red-500/10 rounded-md transition-colors group"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4 text-white/40 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal para crear/editar */}
      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        title={editando ? "Editar tipo" : "Nuevo tipo"}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Módulo
              </label>
              <Select
                value={formData.modulo}
                onValueChange={(value) => setFormData({ ...formData, modulo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {MODULOS.map((modulo) => (
                    <SelectItem key={modulo.value} value={modulo.value}>
                      {modulo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Nombre
              </label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre del tipo"
                disabled={guardando}
              />
            </div>
          </div>

          {/* Control de vencimiento simplificado */}
          <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-sm font-medium text-white">Vencimiento</span>
                <p className="text-xs text-white/60 mt-0.5">
                  Documentos con fecha de vencimiento
                </p>
              </div>
              <Switch
                checked={formData.requiere_vencimiento}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, requiere_vencimiento: checked })
                }
                disabled={guardando}
              />
            </div>

            {formData.requiere_vencimiento && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Alertar con
                </label>
                <Select
                  value={formData.dias_antes_alarma.toString()}
                  onValueChange={(value) => 
                    setFormData({ ...formData, dias_antes_alarma: parseInt(value) })
                  }
                  disabled={guardando}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 días de anticipación</SelectItem>
                    <SelectItem value="15">15 días de anticipación</SelectItem>
                    <SelectItem value="30">30 días de anticipación</SelectItem>
                    <SelectItem value="45">45 días de anticipación</SelectItem>
                    <SelectItem value="60">60 días de anticipación</SelectItem>
                    <SelectItem value="90">90 días de anticipación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              onClick={guardarTipo} 
              className="flex-1 bg-white text-black hover:bg-white/90"
              disabled={guardando}
            >
              {guardando ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                  {editando ? "Actualizando..." : "Creando..."}
                </div>
              ) : (
                editando ? "Actualizar" : "Crear"
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={cerrarModal} 
              className="flex-1 border-white/20 text-white hover:bg-white/5"
              disabled={guardando}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={modalEliminarAbierto}
        onClose={cerrarModalEliminar}
        title="Eliminar tipo de documento"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white mb-2">
                ¿Estás seguro?
              </h3>
              <p className="text-sm text-white/60 mb-4">
                Vas a eliminar el tipo de documento <span className="font-medium text-white">"{tipoAEliminar?.nombre}"</span> del módulo <span className="font-medium text-white">{MODULOS.find(m => m.value === tipoAEliminar?.modulo)?.label}</span>.
              </p>
              <p className="text-sm text-white/40">
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={cerrarModalEliminar}
              className="flex-1 border-white/20 text-white hover:bg-white/5"
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button 
              onClick={eliminarTipo}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              disabled={eliminando}
            >
              {eliminando ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Eliminando...
                </div>
              ) : (
                "Eliminar"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 