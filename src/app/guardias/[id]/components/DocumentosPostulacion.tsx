'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, FileText, Image, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentoPostulacion {
  id: string;
  nombre_archivo: string;
  url_archivo: string;
  formato: string;
  tamaño: number;
  created_at: string;
  tipo_documento: string;
}

interface DocumentosPostulacionProps {
  guardiaId: string;
}

export default function DocumentosPostulacion({ guardiaId }: DocumentosPostulacionProps) {
  const [documentos, setDocumentos] = useState<DocumentoPostulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    cargarDocumentos();
  }, [guardiaId]);

  const cargarDocumentos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/postulacion/documentos/${guardiaId}`);
      
      if (response.ok) {
        const data = await response.json();
        setDocumentos(data.documentos || []);
      } else {
        console.error('Error cargando documentos de postulación');
      }
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const descargarDocumento = async (documento: DocumentoPostulacion) => {
    try {
      const response = await fetch(`/api/postulacion/documento/${documento.nombre_archivo}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = documento.nombre_archivo;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Documento descargado",
          description: "El documento se ha descargado exitosamente",
        });
      } else {
        throw new Error('Error descargando documento');
      }
    } catch (error) {
      console.error('Error descargando documento:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el documento",
        variant: "destructive",
      });
    }
  };

  const obtenerIcono = (formato: string) => {
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(formato.toLowerCase())) {
      return <Image className="h-4 w-4" />;
    } else if (formato.toLowerCase() === 'pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const formatearTamaño = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-muted-foreground">Cargando documentos...</span>
      </div>
    );
  }

  if (documentos.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-2">No hay documentos de postulación</p>
        <p className="text-xs text-muted-foreground">
          Los documentos subidos durante la postulación aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {documentos.map((documento) => (
          <Card key={documento.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  {obtenerIcono(documento.formato)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">
                    {documento.tipo_documento}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {documento.nombre_archivo}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {documento.formato.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatearTamaño(documento.tamaño)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(documento.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => descargarDocumento(documento)}
                  className="h-8 px-3"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Descargar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
