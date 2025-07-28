"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentoCliente } from "@/lib/schemas/clientes";
import { Upload, FileText, Download, Eye, Trash2 } from "lucide-react";
import DocumentViewer from "./DocumentViewer";
import { logDocumentoEliminado } from "@/lib/api/logs-clientes";

interface DocumentListTabsProps {
  modulo: string;
  entidadId: string;
  onDocumentDeleted?: () => void;
  onUploadClick?: () => void;
  refreshTrigger?: number; // Para forzar actualización
}

interface DocumentoAgrupado extends DocumentoCliente {
  tipo_documento_nombre: string;
  fecha_vencimiento?: string;
  estado_vencimiento?: string;
  dias_restantes?: number;
}

export default function DocumentListTabs({ 
  modulo, 
  entidadId, 
  onDocumentDeleted,
  onUploadClick,
  refreshTrigger
}: DocumentListTabsProps) {
  const [documentos, setDocumentos] = useState<DocumentoAgrupado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tipoActivo, setTipoActivo] = useState<string>("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentoAgrupado | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);

    const cargarDocumentos = async (forceReload: boolean = false) => {
    const now = Date.now();
    
    // Caché de 10 segundos - solo recargar si es forzado o han pasado 10s
    if (!forceReload && lastLoadTime && (now - lastLoadTime < 10000)) {
      return;
    }

    try {
      setCargando(true);
      
      let response;
      if (modulo === "clientes") {
        response = await fetch(`/api/documentos-clientes?cliente_id=${entidadId}`, {
          // Caché HTTP para navegador
          cache: 'no-store'
        });
      } else {
        response = await fetch(`/api/documentos?modulo=${modulo}&entidad_id=${entidadId}`, {
          cache: 'no-store'
        });
      }
      
      const data = await response.json();
      
      if (data.success) {
        const docsConTipo = data.data.map((doc: any) => ({
          ...doc,
          tipo_documento_nombre: doc.tipo_documento_nombre || "Sin categoría"
        }));
        setDocumentos(docsConTipo);
        setLastLoadTime(now);
        
        // Establecer el primer tipo como activo si no hay ninguno seleccionado
        if (!tipoActivo && docsConTipo.length > 0) {
          const tipos = Array.from(new Set(docsConTipo.map((doc: DocumentoAgrupado) => doc.tipo_documento_nombre))) as string[];
          setTipoActivo(tipos[0]);
        }
      }
    } catch (error) {
      console.error("Error cargando documentos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDocumentos(true); // Forzar carga en cambios de props
  }, [entidadId, refreshTrigger]);

  const eliminarDocumento = async (documentoId: string) => {
    if (!confirm("¿Estás seguro de eliminar este documento?")) return;

    // Encontrar el documento para obtener su nombre antes de eliminarlo
    const documento = documentos.find(doc => doc.id === documentoId);
    const nombreDocumento = documento?.nombre || "Documento";

    try {
      let response;
      if (modulo === "clientes") {
        response = await fetch(`/api/documentos-clientes?id=${documentoId}`, {
          method: "DELETE",
        });
      } else {
        response = await fetch(`/api/documentos?id=${documentoId}`, {
          method: "DELETE",
        });
      }

      const data = await response.json();
      
      if (data.success) {
        // Registrar log si es un documento de cliente
        if (modulo === "clientes") {
          await logDocumentoEliminado(entidadId, nombreDocumento);
        }
        
        await cargarDocumentos(true); // Forzar recarga después de eliminar
        onDocumentDeleted?.();
      } else {
        alert("Error al eliminar el documento");
      }
    } catch (error) {
      console.error("Error eliminando documento:", error);
      alert("Error al eliminar el documento");
    }
  };

  const descargarDocumento = async (documento: DocumentoAgrupado) => {
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
        alert("Este documento no está disponible para descarga. Los archivos subidos antes de la corrección de R2 no se pueden descargar.");
      }
    } catch (error) {
      alert("Error al descargar el documento");
    }
  };

  const verDocumento = (documento: DocumentoAgrupado) => {
    setSelectedDocument(documento);
    setViewerOpen(true);
  };

  const formatearTamaño = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const formatearFechaCompleta = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });
  };

  const calcularDiasRestantes = (fechaVencimiento: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diferencia;
  };

  const getEstadoVencimiento = (diasRestantes: number) => {
    if (diasRestantes < 0) return { estado: 'vencido', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
    if (diasRestantes === 0) return { estado: 'vence_hoy', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
    if (diasRestantes <= 7) return { estado: 'critico', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
    if (diasRestantes <= 30) return { estado: 'advertencia', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    return { estado: 'vigente', color: 'bg-green-500/10 text-green-400 border-green-500/20' };
  };

  const getTextoEstado = (diasRestantes: number) => {
    if (diasRestantes < 0) return `Vencido hace ${Math.abs(diasRestantes)} días`;
    if (diasRestantes === 0) return 'Vence hoy';
    if (diasRestantes === 1) return 'Vence mañana';
    return `${diasRestantes} días`;
  };

  // Agrupar documentos por tipo
  const documentosAgrupados = documentos.reduce((acc, doc) => {
    const tipo = doc.tipo_documento_nombre;
    if (!acc[tipo]) {
      acc[tipo] = [];
    }
    acc[tipo].push(doc);
    return acc;
  }, {} as Record<string, DocumentoAgrupado[]>);

  const tipos = Object.keys(documentosAgrupados);
  const documentosDelTipo = tipoActivo ? documentosAgrupados[tipoActivo] || [] : [];

  if (cargando && documentos.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
        </CardHeader>
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

  if (documentos.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
                      <div className="flex items-center justify-between">
              <CardTitle className="text-white">
              </CardTitle>
            {onUploadClick && (
              <Button
                size="sm"
                onClick={onUploadClick}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Subir Documento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay documentos subidos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
          <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            {/* Filtros de tipos alineados a la izquierda */}
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
            
            {/* Botón de subida alineado a la derecha */}
            {onUploadClick && (
              <Button
                size="sm"
                onClick={onUploadClick}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Subir Documento
              </Button>
            )}
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

      <CardContent>
        {/* Lista de documentos del tipo activo */}
        <div className="max-h-96 overflow-y-auto space-y-2">
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
                    onClick={() => verDocumento(documento)}
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

        {documentosDelTipo.length === 0 && tipoActivo && (
          <div className="text-center text-muted-foreground py-6">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay documentos de tipo "{tipoActivo}"</p>
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
  );
} 