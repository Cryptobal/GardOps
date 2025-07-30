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

  // Obtener el tipo seleccionado para verificar si requiere vencimiento
  const tipoSeleccionado = React.useMemo(() => 
    tiposDocumentos.find(tipo => tipo.id === tipoDocumentoId), 
    [tiposDocumentos, tipoDocumentoId]
  );

  const cargarDocumentos = async (forceReload: boolean = false) => {
    const now = Date.now();
    
    // Caché de 10 segundos
    if (!forceReload && lastLoadTime && (now - lastLoadTime < 10000)) {
      return;
    }

    try {
      setCargando(true);
      
      // Usar endpoint unificado para todos los módulos
      const response = await fetch(`/api/documentos?modulo=${modulo}&entidad_id=${entidadId}`, {
        cache: 'no-store'
      });
      
      const data = await response.json();
      
      if (data.success) {
        const docsConTipo = data.data.map((doc: any) => ({
          ...doc,
          tipo_documento_nombre: doc.tipo_documento_nombre || "Sin categoría"
        }));
        setDocumentos(docsConTipo);
        setLastLoadTime(now);
        
        // No establecer tipoActivo aquí, se maneja en un useEffect separado
      } else {
        console.error("Error cargando documentos:", data.error);
        setDocumentos([]);
      }
    } catch (error) {
      console.error("Error en cargarDocumentos:", error);
      setDocumentos([]);
    } finally {
      setCargando(false);
    }
  };

  // Cargar tipos de documentos
  const cargarTiposDocumentos = async () => {
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
  };

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
  }, [file, tipoDocumentoId, fechaVencimiento, modulo, entidadId, tipoSeleccionado, onUploadSuccess]);

  const eliminarDocumento = useCallback(async (documentoId: string) => {
    if (!confirm("¿Estás seguro de eliminar este documento?")) return;

    const documento = documentos.find(doc => doc.id === documentoId);
    const nombreDocumento = documento?.nombre || "Documento";

    try {
      const response = await fetch(`/api/documentos?id=${documentoId}&modulo=${modulo}`, {
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
      } else {
        alert("Error al eliminar el documento");
      }
    } catch (error) {
      console.error("Error eliminando documento:", error);
      alert("Error al eliminar el documento");
    }
  }, [documentos, modulo, entidadId, onDocumentDeleted]);

  const descargarDocumento = useCallback(async (documento: Documento) => {
    try {
      const downloadUrl = `/api/download-document?id=${documento.id}&modulo=${modulo}`;
      const response = await fetch(downloadUrl, { method: 'HEAD' });
      
      if (response.ok) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = documento.nombre;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Este documento no está disponible para descarga.");
      }
    } catch (error) {
      alert("Error al descargar el documento");
    }
  }, [modulo]);

  const verDocumento = useCallback((documento: Documento) => {
    setSelectedDocument(documento);
    setViewerOpen(true);
  }, []);

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
    // Solo cargar documentos si hay una entidad seleccionada
    if (entidadId && entidadId.trim() !== "") {
      cargarDocumentos(true);
      cargarTiposDocumentos();
    } else {
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
          {/* Lista de documentos */}
          <div className="h-full overflow-y-auto space-y-2">
            {documentosDelTipo.map((documento) => {
              const diasRestantes = documento.fecha_vencimiento ? calcularDiasRestantes(documento.fecha_vencimiento) : null;
              const estadoVencimiento = diasRestantes !== null ? getEstadoVencimiento(diasRestantes) : null;
              
              return (
                <div
                  key={documento.id}
                  className="flex items-center justify-between p-3 border border-border/30 rounded-lg hover:bg-muted/10 transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {documento.nombre.split('.').pop()?.toUpperCase().slice(0, 3) || 'DOC'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium truncate text-sm">
                          {documento.nombre}
                        </p>
                        {estadoVencimiento && (
                          <Badge className={`text-xs px-2 py-0.5 ${estadoVencimiento.color}`}>
                            {getTextoEstado(diasRestantes!)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatearTamaño(documento.tamaño)}</span>
                        <span>Subido: {formatearFecha(documento.created_at)}</span>
                        {documento.fecha_vencimiento && (
                          <span className={`flex items-center gap-1 ${diasRestantes! < 0 ? 'text-red-400' : diasRestantes! <= 7 ? 'text-orange-400' : 'text-white/60'}`}>
                            📅 Vence: {formatearFechaCompleta(documento.fecha_vencimiento)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => abrirVisualizador(documento)}
                      className="h-7 w-7 p-0 hover:bg-blue-600/20"
                      title="Ver documento"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => descargarDocumento(documento)}
                      className="h-7 w-7 p-0 hover:bg-green-600/20"
                      title="Descargar"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => eliminarDocumento(documento.id)}
                      className="h-7 w-7 p-0 hover:bg-red-600/20 text-red-400"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
            isOpen={viewerOpen}
            onClose={() => {
              setViewerOpen(false);
              setSelectedDocument(null);
            }}
            documentId={selectedDocument.id}
            documentName={selectedDocument.nombre}
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
              <DatePickerComponent
                value={fechaVencimiento}
                onChange={setFechaVencimiento}
                placeholder="Seleccionar fecha de vencimiento"
                minDate={new Date()}
                showClearButton={true}
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
    </>
  );
} 