"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import Image from "next/image";

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  modulo: string;
}

export default function DocumentViewer({ 
  isOpen, 
  onClose, 
  documentId, 
  documentName, 
  modulo 
}: DocumentViewerProps) {
  const [documentUrl, setDocumentUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocument();
    }
  }, [isOpen, documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError("");
      
      const downloadUrl = `/api/download-document?id=${documentId}&modulo=${modulo}`;
      
      // Verificar que el documento esté disponible
      const response = await fetch(downloadUrl, { method: 'HEAD' });
      
      if (response.ok) {
        setDocumentUrl(downloadUrl);
      } else {
        setError("Este documento no está disponible para visualización.");
      }
    } catch (err) {
      setError("Error al cargar el documento");
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = () => {
    if (documentUrl) {
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = documentName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderDocumentContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Cargando documento...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-red-400">{error}</div>
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      );
    }

    // Detectar el tipo de archivo para mostrar apropiadamente
    const fileExtension = documentName.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'pdf') {
      return (
        <iframe
          src={documentUrl}
          className="w-full h-96 border border-border rounded"
          title={documentName}
        />
      );
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
      return (
        <div className="flex justify-center">
          <Image
            src={documentUrl}
            alt={documentName}
            width={800}
            height={600}
            className="max-w-full max-h-96 object-contain border border-border rounded"
            unoptimized
          />
        </div>
      );
    } else if (['txt', 'json', 'js', 'ts', 'md', 'html', 'css'].includes(fileExtension || '')) {
      return (
        <iframe
          src={documentUrl}
          className="w-full h-96 border border-border rounded bg-white"
          title={documentName}
        />
      );
    } else {
      // Para otros tipos de archivo, mostrar opción de descarga
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-muted-foreground text-center">
            <p>Este tipo de archivo no se puede visualizar en el navegador.</p>
            <p className="text-sm mt-2">Tipo: .{fileExtension}</p>
          </div>
          <Button onClick={downloadDocument} className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Descargar {documentName}
          </Button>
        </div>
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={documentName} size="xl">
      <div className="p-6">
        {/* Header con botones */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white truncate">{documentName}</h3>
          <div className="flex gap-2">
            <Button 
              onClick={downloadDocument} 
              size="sm" 
              variant="outline"
              disabled={!documentUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
            <Button onClick={onClose} size="sm" variant="outline">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Contenido del documento */}
        {renderDocumentContent()}
      </div>
    </Modal>
  );
} 