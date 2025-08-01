'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Eye, Upload, Trash2 } from 'lucide-react';

interface DocumentoGuardia {
  id: string;
  nombre: string;
  tipo: string;
  url: string;
  fecha_subida: string;
  estado: string;
}

interface DocumentosGuardiaProps {
  guardiaId: string;
}

export default function DocumentosGuardia({ guardiaId }: DocumentosGuardiaProps) {
  const [documentos, setDocumentos] = useState<DocumentoGuardia[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  useEffect(() => {
    cargarDocumentos();
  }, [guardiaId]);

  const cargarDocumentos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/documentos-guardias?guardia_id=${guardiaId}`);
      if (!response.ok) {
        throw new Error('Error al cargar documentos');
      }
      const data = await response.json();
      setDocumentos(data);
    } catch (err) {
      console.error('Error cargando documentos:', err);
      error('Error al cargar documentos del guardia');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDocumento = (documento: DocumentoGuardia) => {
    window.open(documento.url, '_blank');
  };

  const handleDescargarDocumento = async (documento: DocumentoGuardia) => {
    try {
      const response = await fetch(`/api/download-document?id=${documento.id}`);
      if (!response.ok) {
        throw new Error('Error al descargar documento');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documento.nombre;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      success('Documento descargado correctamente');
    } catch (err) {
      console.error('Error descargando documento:', err);
      error('Error al descargar documento');
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos del Guardia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <span className="ml-2">Cargando documentos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos del Guardia
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documentos.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {documentos.length} documento{documentos.length !== 1 ? 's' : ''} encontrado{documentos.length !== 1 ? 's' : ''}
              </p>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Cargar Nuevo Documento
              </Button>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha de Subida</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((documento) => (
                  <TableRow key={documento.id}>
                    <TableCell className="font-medium">{documento.nombre}</TableCell>
                    <TableCell>{documento.tipo}</TableCell>
                    <TableCell>{formatearFecha(documento.fecha_subida)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        documento.estado === 'activo' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {documento.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerDocumento(documento)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDescargarDocumento(documento)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No hay documentos cargados para este guardia</p>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Cargar Primer Documento
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 