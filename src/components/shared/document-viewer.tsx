"use client";

import { useState, useEffect } from "react";
import { Modal, ModalHeader } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Download, 
  Printer, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  FileText,
  Image as ImageIcon,
  File
} from "lucide-react";
import Image from "next/image";

interface DocumentViewerProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  documentType: string;
  modulo: string;
}

export function DocumentViewer({ 
  open, 
  onClose, 
  documentId, 
  documentName, 
  documentType, 
  modulo 
}: DocumentViewerProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isImage, setIsImage] = useState(false);

  // Determinar el tipo de contenido basado en el documentType o la extensión
  const getContentType = () => {
    if (documentType && documentType !== 'application/octet-stream') {
      return documentType;
    }
    
    // Intentar obtener la extensión del nombre del documento
    let extension = documentName.split('.').pop()?.toLowerCase();
    
    // Si no hay extensión en el nombre, intentar obtenerla de la URL cuando esté disponible
    if (!extension && documentUrl) {
      try {
        const url = new URL(documentUrl);
        const pathname = url.pathname;
        extension = pathname.split('.').pop()?.toLowerCase();
      } catch (e) {
        // Si la URL no es válida, continuar con el nombre del documento
      }
    }
    
    const extensionMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    return extensionMap[extension || ''] || 'application/octet-stream';
  };

  // Determinar si se puede previsualizar el contenido
  const canPreview = () => {
    const contentType = getContentType();
    return contentType.startsWith('image/') || contentType === 'application/pdf';
  };

  // Detectar si es una imagen basado en la extensión
  useEffect(() => {
    const contentType = getContentType();
    setIsImage(contentType.startsWith('image/'));
  }, [documentName, documentType, documentUrl]);

  // Cargar el documento cuando se abre el modal
  useEffect(() => {
    if (open && documentId) {
      loadDocument();
    }
  }, [open, documentId]);

  const loadDocument = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/download-document?id=${documentId}&modulo=${modulo}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar el documento');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDocumentUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (documentUrl) {
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = documentName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    if (documentUrl) {
      const printWindow = window.open(documentUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  // Limpiar URL cuando se cierra el modal
  useEffect(() => {
    return () => {
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [documentUrl]);

  return (
    <Modal 
      isOpen={open} 
      onClose={onClose}
      size="2xl"
      className="w-[95vw] h-[95vh] max-w-none p-0 bg-slate-900 border-slate-700 document-viewer-modal"
    >
      <div className="flex flex-col h-full">
        {/* Header personalizado */}
        <div className="flex flex-row items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3">
            {isImage ? (
              <ImageIcon className="h-5 w-5 text-blue-400" />
            ) : documentType === 'application/pdf' ? (
              <FileText className="h-5 w-5 text-red-400" />
            ) : (
              <File className="h-5 w-5 text-slate-400" />
            )}
            <h2 className="text-white text-lg font-medium">
              {documentName}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Controles de zoom y rotación */}
            <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1 document-zoom-controls">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-600"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-slate-300 text-sm px-2 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-600"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
                className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-600"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-600 text-xs"
              >
                Reset
              </Button>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={!documentUrl}
                className="h-8 px-3 text-slate-300 hover:text-white hover:bg-slate-600"
              >
                <Download className="h-4 w-4 mr-1" />
                Descargar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrint}
                disabled={!documentUrl}
                className="h-8 px-3 text-slate-300 hover:text-white hover:bg-slate-600"
              >
                <Printer className="h-4 w-4 mr-1" />
                Imprimir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-slate-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Contenido del documento */}
        <div className="flex-1 overflow-hidden bg-slate-900">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-300">Cargando documento...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <Card className="p-6 bg-red-900/20 border-red-700">
                <div className="text-center">
                  <p className="text-red-400 mb-2">Error al cargar el documento</p>
                  <p className="text-slate-400 text-sm">{error}</p>
                  <Button
                    onClick={loadDocument}
                    className="mt-4 bg-red-600 hover:bg-red-700"
                  >
                    Reintentar
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {documentUrl && !loading && !error && (
            <div className="h-full overflow-auto flex items-center justify-center p-4">
              <div 
                className="bg-white rounded-lg shadow-2xl overflow-hidden"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out'
                }}
              >
                {(() => {
                  const contentType = getContentType();
                  const isImageType = contentType.startsWith('image/');
                  const isPdfType = contentType === 'application/pdf';
                  
                  if (isImageType) {
                    return (
                      <Image 
                        src={documentUrl} 
                        alt={documentName}
                        width={800}
                        height={600}
                        className="max-w-none"
                        style={{ maxHeight: '80vh' }}
                        unoptimized
                      />
                    );
                  } else if (isPdfType) {
                    return (
                      <iframe
                        src={documentUrl}
                        className="w-full"
                        style={{ height: '80vh', minWidth: '800px' }}
                        title={documentName}
                      />
                    );
                  } else {
                    return (
                      <div className="flex items-center justify-center p-8" style={{ minHeight: '400px' }}>
                        <div className="text-center">
                          <File className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                          <p className="text-slate-600 mb-2">Vista previa no disponible</p>
                          <p className="text-slate-500 text-sm mb-4">
                            Este tipo de archivo no se puede previsualizar
                          </p>
                          <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
                            <Download className="h-4 w-4 mr-2" />
                            Descargar para ver
                          </Button>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
} 