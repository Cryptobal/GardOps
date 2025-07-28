"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentoCliente } from "@/lib/schemas/clientes";
import { Upload } from "lucide-react";

interface DocumentListProps {
  modulo: string;
  entidadId: string;
  onDocumentDeleted?: () => void;
  onUploadClick?: () => void;
}

export default function DocumentList({ 
  modulo, 
  entidadId, 
  onDocumentDeleted,
  onUploadClick
}: DocumentListProps) {
  const [documentos, setDocumentos] = useState<DocumentoCliente[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarDocumentos = async () => {
    try {
      setCargando(true);
      
      let response;
      if (modulo === "clientes") {
        response = await fetch(`/api/documentos-clientes?cliente_id=${entidadId}`);
      } else {
        response = await fetch(`/api/documentos?modulo=${modulo}&entidad_id=${entidadId}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDocumentos(data.data);
      } else {
        console.error("Error cargando documentos:", data.error);
      }
    } catch (error) {
      console.error("Error cargando documentos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDocumentos();
  }, [entidadId]);

  const eliminarDocumento = async (documentoId: string) => {
    if (!confirm("¿Estás seguro de eliminar este documento?")) return;

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
        cargarDocumentos();
        onDocumentDeleted?.();
      } else {
        alert("Error al eliminar el documento");
      }
    } catch (error) {
      console.error("Error eliminando documento:", error);
      alert("Error al eliminar el documento");
    }
  };

  const descargarDocumento = (documento: DocumentoCliente) => {
    // Crear un enlace temporal para descargar
    const link = document.createElement('a');
    link.href = documento.archivo_url;
    link.download = documento.nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const verDocumento = (documento: DocumentoCliente) => {
    // Abrir el documento en una nueva pestaña
    window.open(documento.archivo_url, '_blank');
  };

  const formatearTamaño = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (cargando) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Cargando documentos...
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
            <CardTitle className="text-white">📄 Documentos (0)</CardTitle>
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
          <div className="text-center text-muted-foreground">
            No hay documentos subidos
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">📄 Documentos ({documentos.length})</CardTitle>
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
      <CardContent>
        <div className="space-y-3">
          {documentos.map((documento) => (
            <div
              key={documento.id}
              className="flex items-center justify-between p-4 border border-border/30 rounded-lg hover:bg-muted/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {documento.nombre.split('.').pop()?.toUpperCase() || 'DOC'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">
                      {documento.nombre}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {documento.tipo_documento_nombre && (
                        <Badge variant="outline" className="text-xs">
                          {documento.tipo_documento_nombre}
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {formatearTamaño(documento.tamaño)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatearFecha(documento.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => verDocumento(documento)}
                  className="h-8 px-2"
                  title="Ver documento"
                >
                  👁️
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => descargarDocumento(documento)}
                  className="h-8 px-2"
                  title="Descargar documento"
                >
                  📥
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => eliminarDocumento(documento.id)}
                  className="h-8 px-2 text-red-400"
                  title="Eliminar documento"
                >
                  🗑️
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 