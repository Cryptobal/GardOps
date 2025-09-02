"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Modal } from "../ui/modal";
import { DatePickerComponent } from "../ui/date-picker";
import { Upload, FileText, Download, Eye, Trash2, X, Calendar } from "lucide-react";
import { DocumentViewer } from "./document-viewer";
import "@/styles/date-input.css";

export interface Documento {
  id: string;
  nombre: string;
  tamaño: number;
  created_at: string;
  fecha_vencimiento?: string;
  tipo_documento_nombre?: string;
}

export interface TipoDocumento {
  id: string;
  modulo: string;
  nombre: string;
  requiere_vencimiento: boolean;
  dias_antes_alarma: number;
}

export interface DocumentManagerProps {
  modulo: string;
  entidadId: string;
  onDocumentDeleted?: () => void;
  onUploadSuccess?: () => void;
  refreshTrigger?: number;
  className?: string;
}

export function DocumentManager({ 
  modulo, 
  entidadId, 
  onDocumentDeleted,
  onUploadSuccess,
  refreshTrigger,
  className = ""
}: DocumentManagerProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tipoActivo, setTipoActivo] = useState<string>("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  
  // Estados para el visualizador de documentos
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [documentToView, setDocumentToView] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);
  
  // Estados para el modal de subida
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tipoDocumentoId, setTipoDocumentoId] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [loadingTipos, setLoadingTipos] = useState(true);

  // Estados para el modal de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentoToDelete, setDocumentoToDelete] = useState<Documento | null>(null);
  const [deletingDocument, setDeletingDocument] = useState(false);
  const [editingFechaId, setEditingFechaId] = useState<string | null>(null);
  const [nuevaFechaVencimiento, setNuevaFechaVencimiento] = useState<string>("");

  // Obtener el tipo seleccionado para verificar si requiere vencimiento
  const tipoSeleccionado = React.useMemo(() => 
    tiposDocumentos.find(tipo => tipo.id === tipoDocumentoId), 
    [tiposDocumentos, tipoDocumentoId]
  );

  const cargarDocumentos = useCallback(async (forceReload: boolean = false) => {
    const now = Date.now();
    
    // Caché de 10 segundos
    if (!forceReload && lastLoadTime && (now - lastLoadTime < 10000)) {
      return;
    }

    try {
      console.log('🔍 CARGANDO DOCUMENTOS:', { modulo, entidadId, forceReload });
      setCargando(true);
      
      // Usar endpoint específico según el módulo
      let apiUrl = '';
      if (modulo === 'clientes') {
        apiUrl = `/api/documentos-por-cliente?cliente_id=${entidadId}`;
      } else if (modulo === 'instalaciones') {
        apiUrl = `/api/documentos-instalaciones?instalacion_id=${entidadId}`;
      } else if (modulo === 'guardias') {
        apiUrl = `/api/documentos-guardias?guardia_id=${entidadId}`;
      } else {
        // Fallback al endpoint global
        apiUrl = `/api/documentos-global?modulo=${modulo}&entidad_id=${entidadId}`;
      }
      
      console.log('🌐 Llamando API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        cache: 'no-store'
      });
      
      console.log('📡 Respuesta API:', { status: response.status, ok: response.ok });
      
      const data = await response.json();
      console.log('📋 Datos recibidos:', data);
      
      if (data.success) {
        // Mapear los documentos según la estructura de la API
        let docsConTipo = [];
        if (modulo === 'clientes' && data.documentos) {
          docsConTipo = data.documentos.map((doc: any) => ({
            id: doc.id,
            nombre: doc.nombre_original,
            tamaño: doc.tamaño,
            created_at: doc.creado_en,
            fecha_vencimiento: doc.fecha_vencimiento,
            tipo_documento_nombre: doc.tipo_documento_nombre || "Sin categoría",
            url: doc.url,
            estado: doc.estado
          }));
        } else if (data.data) {
          // Para APIs que devuelven data (instalaciones y guardias)
          docsConTipo = data.data.map((doc: any) => ({
            id: doc.id,
            nombre: doc.nombre_original || doc.nombre,
            tamaño: doc.tamaño,
            created_at: doc.creado_en || doc.created_at,
            fecha_vencimiento: doc.fecha_vencimiento,
            tipo_documento_nombre: doc.tipo_documento_nombre || "Sin categoría",
            url: doc.url,
            estado: doc.estado
          }));
        }
        
        console.log('📄 Documentos mapeados:', docsConTipo);
        setDocumentos(docsConTipo);
        setLastLoadTime(now);
      } else {
        console.error("❌ Error cargando documentos:", data.error);
        setDocumentos([]);
      }
    } catch (error) {
      console.error("❌ Error en cargarDocumentos:", error);
      setDocumentos([]);
    } finally {
      setCargando(false);
    }
  }, [modulo, entidadId, lastLoadTime]);

  // Cargar tipos de documentos
  const cargarTiposDocumentos = useCallback(async () => {
    try {
      setLoadingTipos(true);
      
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/tipos-documentos?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Filtrar por módulo específico
        const tiposFiltrados = data.data.filter((tipo: TipoDocumento) => tipo.modulo === modulo);
        setTiposDocumentos(tiposFiltrados);
      } else {
        console.error('Error cargando tipos:', data.error);
        setTiposDocumentos([]);
      }
    } catch (error) {
      console.error("Error cargando tipos:", error);
      setTiposDocumentos([]);
    } finally {
      setLoadingTipos(false);
    }
  }, [modulo]);

  const handleUpload = useCallback(async () => {
    if (!file || !tipoDocumentoId) {
      setUploadStatus("error");
      return;
    }

    // Validar fecha de vencimiento si es requerida
    if (tipoSeleccionado?.requiere_vencimiento && !fechaVencimiento) {
      setUploadStatus("error");
      return;
    }
    
    setUploadStatus("uploading");

    try {
      // Crear FormData para la subida
      const formData = new FormData();
      formData.append('file', file);
      formData.append('modulo', modulo);
      formData.append('entidad_id', entidadId);
      formData.append('tipo_documento_id', tipoDocumentoId);
      if (fechaVencimiento) {
        formData.append('fecha_vencimiento', fechaVencimiento);
      }

      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Documento subido exitosamente:', result.data);
        setUploadStatus("success");
        
        // Limpiar formulario
        setFile(null);
        setTipoDocumentoId("");
        setFechaVencimiento("");
        
        // Cerrar modal después de un breve delay
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadStatus("idle");
        }, 1000);
        
        // Recargar documentos y notificar éxito
        await cargarDocumentos(true);
        onUploadSuccess?.();
        
        // Registrar log de acción
        try {
          await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modulo,
              entidadId,
              accion: `Subió documento: ${file.name}`,
              detalles: `Tipo: ${tipoSeleccionado?.nombre || 'Sin tipo'}`
            })
          });
        } catch (error) {
          console.error('Error registrando log:', error);
        }
        
      } else {
        console.error('❌ Error en subida:', result.error);
        setUploadStatus("error");
      }
    } catch (error) {
      console.error('❌ Error en subida:', error);
      setUploadStatus("error");
    }
  }, [file, tipoDocumentoId, fechaVencimiento, modulo, entidadId, tipoSeleccionado, onUploadSuccess, cargarDocumentos]);

  const eliminarDocumento = useCallback(async (documentoId: string) => {
    const documento = documentos.find(doc => doc.id === documentoId);
    if (documento) {
      setDocumentoToDelete(documento);
      setShowDeleteModal(true);
    }
  }, [documentos]);

  const confirmarEliminacion = useCallback(async () => {
    if (!documentoToDelete) return;

    setDeletingDocument(true);
    const nombreDocumento = documentoToDelete.nombre || "Documento";

    try {
      const response = await fetch(`/api/documentos?id=${documentoToDelete.id}&modulo=${modulo}`, {
        method: "DELETE",
      });

      const data = await response.json();
      
      if (data.success) {
        await cargarDocumentos(true);
        onDocumentDeleted?.();
        
        // Registrar log de eliminación
        try {
          await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modulo,
              entidadId,
              accion: `Eliminó documento: ${nombreDocumento}`,
              detalles: 'Eliminación manual'
            })
          });
        } catch (error) {
          console.error('Error registrando log:', error);
        }

        // Cerrar modal y limpiar estado
        setShowDeleteModal(false);
        setDocumentoToDelete(null);
      } else {
        alert("Error al eliminar el documento");
      }
    } catch (error) {
      console.error("Error eliminando documento:", error);
      alert("Error al eliminar el documento");
    } finally {
      setDeletingDocument(false);
    }
  }, [documentoToDelete, modulo, entidadId, onDocumentDeleted, cargarDocumentos]);

  const descargarDocumento = useCallback(async (documento: Documento) => {
    try {
      const response = await fetch(`/api/download-document?id=${documento.id}&modulo=${modulo}`, {
        method: 'GET'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = documento.nombre;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('❌ Error al descargar documento:', response.statusText);
        alert('Error al descargar el documento');
      }
    } catch (error) {
      console.error('❌ Error al descargar documento:', error);
      alert('Error al descargar el documento');
    }
  }, [modulo]);

  const actualizarFechaVencimiento = useCallback(async (documentoId: string) => {
    if (!nuevaFechaVencimiento) {
      alert('Por favor selecciona una fecha de vencimiento');
      return;
    }

    try {
      const response = await fetch(`/api/documentos/${documentoId}/fecha-vencimiento`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha_vencimiento: nuevaFechaVencimiento
        })
      });

      if (response.ok) {
        // Recargar documentos para mostrar la fecha actualizada
        await cargarDocumentos(true);
        setEditingFechaId(null);
        setNuevaFechaVencimiento("");
      } else {
        const error = await response.json();
        alert(`Error al actualizar fecha: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error actualizando fecha:', error);
      alert('Error al actualizar la fecha de vencimiento');
    }
  }, [nuevaFechaVencimiento, cargarDocumentos]);

  const verDocumento = useCallback(async (documento: Documento) => {
    try {
      // Abrir en nueva pestaña para ver
      const response = await fetch(`/api/download-document?id=${documento.id}&modulo=${modulo}`, {
        method: 'GET'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('❌ Error al ver documento:', response.statusText);
        alert('Error al abrir el documento');
      }
    } catch (error) {
      console.error('❌ Error al ver documento:', error);
      alert('Error al abrir el documento');
    }
  }, [modulo]);

  // Funciones para el nuevo visualizador premium
  const abrirVisualizador = useCallback((documento: Documento) => {
    // Detectar el tipo de archivo basado en la extensión
    const extension = documento.nombre.split('.').pop()?.toLowerCase();
    let documentType = 'application/octet-stream';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) {
      documentType = 'image';
    } else if (extension === 'pdf') {
      documentType = 'application/pdf';
    } else if (['doc', 'docx'].includes(extension || '')) {
      documentType = 'application/msword';
    } else if (['xls', 'xlsx'].includes(extension || '')) {
      documentType = 'application/vnd.ms-excel';
    }
    
    setDocumentToView({
      id: documento.id,
      name: documento.nombre,
      type: documentType
    });
    setDocumentViewerOpen(true);
  }, []);

  const cerrarVisualizador = useCallback(() => {
    setDocumentViewerOpen(false);
    setDocumentToView(null);
  }, []);

  const formatearTamaño = React.useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  const formatearFecha = React.useCallback((fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  }, []);

  const formatearFechaCompleta = React.useCallback((fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });
  }, []);

  const calcularDiasRestantes = React.useCallback((fechaVencimiento: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diferencia;
  }, []);

  const getEstadoVencimiento = React.useCallback((diasRestantes: number) => {
    if (diasRestantes < 0) return { estado: 'vencido', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
    if (diasRestantes === 0) return { estado: 'vence_hoy', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
    if (diasRestantes <= 7) return { estado: 'critico', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
    if (diasRestantes <= 30) return { estado: 'advertencia', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    return { estado: 'vigente', color: 'bg-green-500/10 text-green-400 border-green-500/20' };
  }, []);

  const getTextoEstado = React.useCallback((diasRestantes: number) => {
    if (diasRestantes < 0) return `Vencido hace ${Math.abs(diasRestantes)} días`;
    if (diasRestantes === 0) return 'Vence hoy';
    if (diasRestantes === 1) return 'Vence mañana';
    return `${diasRestantes} días`;
  }, []);

  // Agrupar documentos por tipo con useMemo para optimización
  const documentosAgrupados = React.useMemo(() => {
    return documentos.reduce((acc, doc) => {
      const tipo = doc.tipo_documento_nombre || 'Sin categoría';
      if (!acc[tipo]) {
        acc[tipo] = [];
      }
      acc[tipo].push(doc);
      return acc;
    }, {} as Record<string, Documento[]>);
  }, [documentos]);

  const tipos = React.useMemo(() => Object.keys(documentosAgrupados), [documentosAgrupados]);
  const documentosDelTipo = React.useMemo(() => 
    tipoActivo ? documentosAgrupados[tipoActivo] || [] : [], 
    [documentosAgrupados, tipoActivo]
  );

  // useEffect para cargar datos cuando cambia la entidad o refreshTrigger
  useEffect(() => {
    console.log('🔄 useEffect ejecutado:', { entidadId, refreshTrigger, modulo });
    
    // Solo cargar documentos si hay una entidad seleccionada
    if (entidadId && entidadId.trim() !== "") {
      console.log('✅ Entidad válida, cargando documentos...');
      cargarDocumentos(true);
      cargarTiposDocumentos();
    } else {
      console.log('❌ Entidad inválida o vacía, limpiando documentos');
      // Limpiar documentos si no hay entidad seleccionada
      setDocumentos([]);
      setCargando(false);
    }
  }, [entidadId, refreshTrigger, modulo]);

  // useEffect separado para manejar el cambio de tipoActivo
  useEffect(() => {
    if (documentos.length > 0 && !tipoActivo) {
      const tipos = Array.from(new Set(documentos.map((doc: Documento) => doc.tipo_documento_nombre))) as string[];
      if (tipos.length > 0) {
        setTipoActivo(tipos[0]);
      }
    }
  }, [documentos, tipoActivo]);

  // Validación: Mostrar mensaje si no hay entidad seleccionada
  if (!entidadId || entidadId.trim() === "") {
    return (
      <Card className={`bg-card/50 border-border/50 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-2">Seleccione un registro</p>
            <p className="text-sm">Para ver y gestionar documentos, primero seleccione un {modulo.slice(0, -1)} de la lista.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cargando && documentos.length === 0) {
    return (
      <Card className={`bg-card/50 border-border/50 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted/20 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-muted/20 rounded w-1/2 mx-auto"></div>
              <div className="h-4 bg-muted/20 rounded w-2/3 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`bg-card/50 border-border/50 h-full flex flex-col ${className}`}>
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Filtros de tipos */}
            <div className="flex flex-wrap gap-2">
              {tipos.map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setTipoActivo(tipo)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    tipoActivo === tipo
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  {tipo} ({documentosAgrupados[tipo].length})
                </button>
              ))}
            </div>
            
            {/* Botón de subida */}
            <Button
              size="sm"
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir Documento
            </Button>
          </div>
          
          {/* Indicador de carga */}
          {cargando && documentos.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-muted-foreground animate-pulse">
                Actualizando...
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          {/* Lista de documentos - Mobile-first */}
          <div className="h-full overflow-y-auto space-y-3">
            {documentosDelTipo.map((documento) => {
              const diasRestantes = documento.fecha_vencimiento ? calcularDiasRestantes(documento.fecha_vencimiento) : null;
              const estadoVencimiento = diasRestantes !== null ? getEstadoVencimiento(diasRestantes) : null;
              
              return (
                <div
                  key={documento.id}
                  className="group relative p-4 border border-border/30 rounded-lg hover:bg-muted/10 transition-colors bg-card/50"
                >
                  {/* Botón de eliminar - Siempre visible en móviles */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDocumentoToDelete(documento);
                      setShowDeleteModal(true);
                    }}
                    className="absolute top-3 right-3 h-8 w-8 p-0 hover:bg-red-600/20 text-red-400 opacity-100 transition-opacity"
                    title="Eliminar documento"
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  <div className="flex items-start gap-3 pr-12">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-white text-sm font-medium">
                          {documento.nombre.split('.').pop()?.toUpperCase().slice(0, 3) || 'DOC'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-white font-medium truncate text-sm">
                          {documento.nombre}
                        </p>
                        {estadoVencimiento && (
                          <Badge className={`text-xs px-2 py-1 ${estadoVencimiento.color}`}>
                            {getTextoEstado(diasRestantes!)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          📁 {formatearTamaño(documento.tamaño)}
                        </span>
                        <span className="flex items-center gap-1">
                          📅 {formatearFecha(documento.created_at)}
                        </span>
                        {documento.fecha_vencimiento && (
                          <span className={`flex items-center gap-1 ${diasRestantes! < 0 ? 'text-red-400' : diasRestantes! <= 7 ? 'text-orange-400' : 'text-white/60'}`}>
                            ⏰ {formatearFechaCompleta(documento.fecha_vencimiento)}
                          </span>
                        )}
                      </div>
                      
                      {/* Campo de edición de fecha */}
                      {editingFechaId === documento.id && (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="date"
                            value={nuevaFechaVencimiento}
                            onChange={(e) => setNuevaFechaVencimiento(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="px-2 py-1 text-xs border border-border rounded bg-background"
                          />
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => actualizarFechaVencimiento(documento.id)}
                            className="h-7 text-xs px-2"
                          >
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingFechaId(null);
                              setNuevaFechaVencimiento("");
                            }}
                            className="h-7 text-xs px-2"
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Botones de acción - Apilados verticalmente en móviles */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-border/20">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirVisualizador(documento)}
                      className="flex-1 sm:flex-none justify-center gap-2 text-xs h-9"
                      title="Ver documento"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => descargarDocumento(documento)}
                      className="flex-1 sm:flex-none justify-center gap-2 text-xs h-9"
                      title="Descargar"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar
                    </Button>
                    {/* Botón para editar fecha de vencimiento */}
                    {(!documento.fecha_vencimiento || documento.fecha_vencimiento === 'Invalid Date') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingFechaId(documento.id);
                          setNuevaFechaVencimiento(documento.fecha_vencimiento || "");
                        }}
                        className="flex-1 sm:flex-none justify-center gap-2 text-xs h-9"
                        title="Agregar fecha de vencimiento"
                      >
                        📅 Agregar Fecha
                      </Button>
                    )}
                    {documento.fecha_vencimiento && documento.fecha_vencimiento !== 'Invalid Date' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingFechaId(documento.id);
                          setNuevaFechaVencimiento(documento.fecha_vencimiento?.split('T')[0] || "");
                        }}
                        className="flex-1 sm:flex-none justify-center gap-2 text-xs h-9"
                        title="Editar fecha de vencimiento"
                      >
                        ✏️ Editar Fecha
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {documentos.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No hay documentos subidos</p>
              <p className="text-sm">Utiliza el botón "Subir Documento" para agregar archivos a este {modulo.slice(0, -1)}</p>
            </div>
          )}
          
          {documentos.length > 0 && documentosDelTipo.length === 0 && tipoActivo && (
            <div className="text-center text-muted-foreground py-6">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay documentos de tipo &quot;{tipoActivo}&quot;</p>
            </div>
          )}
        </CardContent>

        {/* Modal de visualización de documentos */}
        {selectedDocument && (
          <DocumentViewer
            open={viewerOpen}
            onClose={() => {
              setViewerOpen(false);
              setSelectedDocument(null);
            }}
            documentId={selectedDocument.id}
            documentName={selectedDocument.nombre}
            documentType={selectedDocument.tipo_documento_nombre || 'application/octet-stream'}
            modulo={modulo}
          />
        )}
      </Card>

      {/* Modal de subida de documentos */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setFile(null);
          setTipoDocumentoId("");
          setFechaVencimiento("");
          setUploadStatus("idle");
        }}
        title="Subir Documento"
        size="lg"
      >
        <div className="p-6 space-y-6">
          {/* Selección de archivo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Archivo *
            </label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              className="cursor-pointer"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                Archivo seleccionado: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Selección de tipo de documento */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Tipo de Documento *
            </label>
            {loadingTipos ? (
              <div className="text-sm text-muted-foreground">Cargando tipos...</div>
            ) : (
              <div className="space-y-2">
                <Select value={tipoDocumentoId} onValueChange={setTipoDocumentoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo de documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposDocumentos.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{tipo.nombre}</span>
                          {tipo.requiere_vencimiento && (
                            <Calendar className="h-3 w-3 text-orange-500 ml-2" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Indicador visual cuando se selecciona un tipo que requiere vencimiento */}
                {tipoSeleccionado?.requiere_vencimiento && (
                  <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-500">
                        {tipoSeleccionado.nombre} requiere fecha de vencimiento
                      </p>
                      <p className="text-xs text-orange-400">
                        Alarma configurada: {tipoSeleccionado.dias_antes_alarma} días antes
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fecha de vencimiento */}
          {tipoSeleccionado?.requiere_vencimiento && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Vencimiento *
              </label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground cursor-pointer hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={new Date().toISOString().split('T')[0]}
                placeholder="Seleccionar fecha"
                required={tipoSeleccionado?.requiere_vencimiento}
              />
              <p className="text-xs text-muted-foreground">
                Este tipo de documento requiere fecha de vencimiento
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false);
                setFile(null);
                setTipoDocumentoId("");
                setFechaVencimiento("");
                setUploadStatus("idle");
              }}
              disabled={uploadStatus === "uploading"}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !tipoDocumentoId || uploadStatus === "uploading" || (tipoSeleccionado?.requiere_vencimiento && !fechaVencimiento)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {uploadStatus === "uploading" ? "Subiendo..." : 
               uploadStatus === "success" ? "¡Subido!" : 
               "Subir Documento"}
            </Button>
          </div>

          {/* Mensajes de estado */}
          {uploadStatus === "error" && (
            <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-md">
              Error al subir el documento. Verifica que todos los campos estén completos.
            </div>
          )}
          {uploadStatus === "success" && (
            <div className="text-sm text-green-400 bg-green-500/10 p-3 rounded-md">
              Documento subido exitosamente.
            </div>
          )}
        </div>
      </Modal>

      {/* Visualizador Premium de Documentos */}
      {documentToView && (
        <DocumentViewer
          open={documentViewerOpen}
          onClose={cerrarVisualizador}
          documentId={documentToView.id}
          documentName={documentToView.name}
          documentType={documentToView.type}
          modulo={modulo}
        />
      )}

      {/* Modal de eliminación de documentos */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDocumentoToDelete(null);
        }}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Eliminar Documento</h3>
              <p className="text-sm text-muted-foreground">
                ¿Estás seguro de que quieres eliminar este documento?
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <p className="text-sm font-medium text-foreground">
              {documentoToDelete?.nombre || 'Documento'}
            </p>
            <p className="text-xs text-muted-foreground">
              Esta acción no se puede deshacer
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setDocumentoToDelete(null);
              }}
              disabled={deletingDocument}
              className="min-w-[100px]"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarEliminacion}
              disabled={deletingDocument}
              className="min-w-[100px]"
            >
              {deletingDocument ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
} 