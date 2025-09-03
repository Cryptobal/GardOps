"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar,
  Building2,
  Search,
  RefreshCw,
  X,
  Eye,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Plus,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { DocumentViewer } from "@/components/shared/document-viewer";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";

interface DocumentoInstalacion {
  id: string;
  nombre: string;
  tamaño: number;
  created_at: string;
  fecha_vencimiento?: string;
  tipo_documento_nombre?: string;
  tipo_documento_id?: string;
  instalacion_nombre: string;
  instalacion_id: string;
  url: string;
  estado: 'vigente' | 'por_vencer' | 'vencido' | 'sin_vencimiento';
}

interface DocumentosStats {
  total: number;
  vigentes: number;
  por_vencer: number;
  vencidos: number;
  sin_vencimiento: number;
}

interface TipoDocumento {
  id: string;
  nombre: string;
  modulo: string;
  activo: boolean;
}

export default function DocumentosInstalacionesPage() {
  // Gate UI: requiere permiso para ver documentos
  const { useCan } = require("@/lib/permissions");
  const { allowed, loading: permLoading } = useCan('documentos.view');
  const router = useRouter();

  // Estados principales
  const [documentos, setDocumentos] = useState<DocumentoInstalacion[]>([]);
  const [stats, setStats] = useState<DocumentosStats>({
    total: 0,
    vigentes: 0,
    por_vencer: 0,
    vencidos: 0,
    sin_vencimiento: 0
  });
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const { toast } = useToast();

  // Estados para filtros
  const [filtros, setFiltros] = useState({
    tipoDocumento: 'todos',
    estado: 'todos',
    instalacion: 'todos',
    fechaDesde: '',
    fechaHasta: '',
    searchTerm: ''
  });

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Estados para el modal de visualización
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentoInstalacion | null>(null);

  // Verificar permisos
  if (permLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-32 w-32 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para ver esta página</p>
        </div>
      </div>
    );
  }

  // Cargar documentos de instalaciones
  const cargarDocumentos = async () => {
    try {
      setCargando(true);
      console.log('🔄 Cargando documentos de instalaciones...');
      
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value && value !== 'todos' && value !== '') {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/documentos-global?modulo=instalaciones&${params}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      const result = await response.json();

      if (result.success) {
        setDocumentos(result.data || []);
        setStats(result.stats || stats);
        console.log('✅ Documentos de instalaciones cargados:', { count: result.data?.length, stats: result.stats });
      } else {
        console.error('❌ Error en respuesta:', result.error);
        toast.error(result.error || "Error al cargar documentos", "Error");
      }
    } catch (error) {
      console.error('❌ Error cargando documentos:', error);
      toast.error("Error al cargar documentos", "Error");
    } finally {
      setCargando(false);
    }
  };

  // Cargar tipos de documentos
  const cargarTiposDocumentos = async () => {
    try {
      const response = await fetch('/api/tipos-documentos');
      const result = await response.json();
      
      if (result.success) {
        setTiposDocumentos(result.data || []);
      }
    } catch (error) {
      console.error('❌ Error cargando tipos de documentos:', error);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDocumentos();
    cargarTiposDocumentos();
  }, [refreshTrigger]);

  // Filtrar documentos por búsqueda de texto
  const documentosFiltrados = useMemo(() => {
    let filtered = documentos;

    // Filtro por término de búsqueda
    if (filtros.searchTerm) {
      const searchLower = filtros.searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.nombre.toLowerCase().includes(searchLower) ||
        doc.instalacion_nombre.toLowerCase().includes(searchLower) ||
        (doc.tipo_documento_nombre && doc.tipo_documento_nombre.toLowerCase().includes(searchLower))
      );
    }

    // Filtro por tipo de documento
    if (filtros.tipoDocumento !== 'todos') {
      filtered = filtered.filter(doc => doc.tipo_documento_id === filtros.tipoDocumento);
    }

    // Filtro por estado
    if (filtros.estado !== 'todos') {
      filtered = filtered.filter(doc => doc.estado === filtros.estado);
    }

    // Filtro por instalación
    if (filtros.instalacion !== 'todos') {
      filtered = filtered.filter(doc => doc.instalacion_id === filtros.instalacion);
    }

    // Filtro por fechas
    if (filtros.fechaDesde) {
      filtered = filtered.filter(doc => 
        doc.fecha_vencimiento && doc.fecha_vencimiento >= filtros.fechaDesde
      );
    }

    if (filtros.fechaHasta) {
      filtered = filtered.filter(doc => 
        doc.fecha_vencimiento && doc.fecha_vencimiento <= filtros.fechaHasta
      );
    }

    return filtered;
  }, [documentos, filtros]);

  // Paginación
  const totalPages = Math.ceil(documentosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const documentosPaginados = documentosFiltrados.slice(startIndex, endIndex);

  // Función para abrir el visualizador
  const abrirVisualizador = (documento: DocumentoInstalacion) => {
    setSelectedDocument(documento);
    setViewerOpen(true);
  };

  // Función para descargar documento
  const descargarDocumento = async (documento: DocumentoInstalacion) => {
    try {
      const response = await fetch(documento.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documento.nombre;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Documento descargado exitosamente');
    } catch (error) {
      console.error('Error descargando documento:', error);
      toast.error('Error al descargar documento');
    }
  };

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      tipoDocumento: 'todos',
      estado: 'todos',
      instalacion: 'todos',
      fechaDesde: '',
      fechaHasta: '',
      searchTerm: ''
    });
    setCurrentPage(1);
  };

  // Función para aplicar filtros
  const aplicarFiltros = () => {
    setCurrentPage(1);
    cargarDocumentos();
  };

  // Obtener color del estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'vigente':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'por_vencer':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'vencido':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'sin_vencimiento':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Obtener icono del estado
  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'vigente':
        return <CheckCircle className="h-4 w-4" />;
      case 'por_vencer':
        return <Clock className="h-4 w-4" />;
      case 'vencido':
        return <AlertTriangle className="h-4 w-4" />;
      case 'sin_vencimiento':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
            🏢 Documentos de Instalaciones
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Gestiona y visualiza todos los documentos de las instalaciones del sistema
          </p>
        </motion.div>

        {/* KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
        >
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vigentes</p>
                  <p className="text-2xl font-bold text-green-600">{stats.vigentes}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Por Vencer</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.por_vencer}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">{stats.vencidos}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sin Vencimiento</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.sin_vencimiento}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-blue-500" />
                  Filtros de Búsqueda
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
                  >
                    {filtrosAbiertos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {filtrosAbiertos ? 'Ocultar' : 'Mostrar'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={limpiarFiltros}>
                    <X className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                  <Button size="sm" onClick={aplicarFiltros}>
                    <Filter className="h-4 w-4 mr-2" />
                    Aplicar
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {filtrosAbiertos && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Búsqueda por texto */}
                  <div>
                    <label className="text-sm font-medium">Buscar</label>
                    <Input
                      placeholder="Buscar por nombre, instalación..."
                      value={filtros.searchTerm}
                      onChange={(e) => setFiltros(prev => ({ ...prev, searchTerm: e.target.value }))}
                    />
                  </div>

                  {/* Filtro por tipo de documento */}
                  <div>
                    <label className="text-sm font-medium">Tipo de Documento</label>
                    <Select
                      value={filtros.tipoDocumento}
                      onValueChange={(value) => setFiltros(prev => ({ ...prev, tipoDocumento: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los tipos</SelectItem>
                        {tiposDocumentos
                          .filter(tipo => tipo.modulo === 'instalaciones' && tipo.activo)
                          .map(tipo => (
                            <SelectItem key={tipo.id} value={tipo.id}>
                              {tipo.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por estado */}
                  <div>
                    <label className="text-sm font-medium">Estado</label>
                    <Select
                      value={filtros.estado}
                      onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los estados</SelectItem>
                        <SelectItem value="vigente">Vigente</SelectItem>
                        <SelectItem value="por_vencer">Por Vencer</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                        <SelectItem value="sin_vencimiento">Sin Vencimiento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por fecha desde */}
                  <div>
                    <label className="text-sm font-medium">Fecha Desde</label>
                    <Input
                      type="date"
                      value={filtros.fechaDesde}
                      onChange={(e) => setFiltros(prev => ({ ...prev, fechaDesde: e.target.value }))}
                    />
                  </div>

                  {/* Filtro por fecha hasta */}
                  <div>
                    <label className="text-sm font-medium">Fecha Hasta</label>
                    <Input
                      type="date"
                      value={filtros.fechaHasta}
                      onChange={(e) => setFiltros(prev => ({ ...prev, fechaHasta: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Tabla de documentos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Documentos ({documentosFiltrados.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                    disabled={cargando}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${cargando ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {cargando ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando documentos...</p>
                  </div>
                </div>
              ) : documentosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No se encontraron documentos</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Intenta ajustar los filtros o crear nuevos documentos
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Documento</TableHead>
                          <TableHead>Instalación</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha Vencimiento</TableHead>
                          <TableHead>Tamaño</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documentosPaginados.map((documento) => (
                          <TableRow key={documento.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="font-medium">{documento.nombre}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-500" />
                                <span>{documento.instalacion_nombre}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {documento.tipo_documento_nombre || 'Sin tipo'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getEstadoColor(documento.estado)}>
                                <div className="flex items-center gap-1">
                                  {getEstadoIcon(documento.estado)}
                                  {documento.estado.replace('_', ' ')}
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {documento.fecha_vencimiento ? (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <span>{formatDate(documento.fecha_vencimiento)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-500">Sin vencimiento</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {formatFileSize(documento.tamaño)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => abrirVisualizador(documento)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => descargarDocumento(documento)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Mostrando {startIndex + 1} a {Math.min(endIndex, documentosFiltrados.length)} de {documentosFiltrados.length} resultados
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Anterior
                        </Button>
                        <span className="flex items-center px-3 py-2 text-sm">
                          Página {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Modal de visualización de documentos */}
      <Modal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        size="4xl"
      >
        <div className="h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">
              Visualizando: {selectedDocument?.nombre}
            </h2>
            <Button
              variant="outline"
              onClick={() => setViewerOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 p-6">
            {selectedDocument && (
              <DocumentViewer
                documentId={selectedDocument.id}
                documentName={selectedDocument.nombre}
                documentUrl={selectedDocument.url}
                onClose={() => setViewerOpen(false)}
              />
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
