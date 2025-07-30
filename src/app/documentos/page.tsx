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
  Users,
  Building,
  Shield,
  Search,
  RefreshCw,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

interface DocumentoGlobal {
  id: string;
  nombre: string;
  tamaño: number;
  created_at: string;
  fecha_vencimiento?: string;
  tipo_documento_nombre?: string;
  tipo_documento_id?: string;
  modulo: 'clientes' | 'instalaciones' | 'guardias';
  entidad_nombre: string;
  entidad_id: string;
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
}

export default function DocumentosGlobalesPage() {
  const [documentos, setDocumentos] = useState<DocumentoGlobal[]>([]);
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
  const { addToast } = useToast();

  // Estados de filtros
  const [filtros, setFiltros] = useState({
    modulo: 'todos',
    tipo_documento: 'todos',
    estado: 'todos',
    entidad_filter: '',
    fecha_desde: '',
    fecha_hasta: '',
    search: ''
  });

  // Cargar documentos globales
  const cargarDocumentos = async () => {
    try {
      setCargando(true);
      console.log('🔄 Cargando documentos globales con filtros:', filtros);
      
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value && value !== 'todos' && value !== '') {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/documentos-global?${params}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      const result = await response.json();

      if (result.success) {
        setDocumentos(result.data || []);
        setStats(result.stats || stats);
        console.log('✅ Documentos cargados:', { count: result.data?.length, stats: result.stats });
      } else {
        console.error('❌ Error en respuesta:', result.error);
        addToast({
          type: "error",
          title: "Error",
          message: result.error || "Error al cargar documentos"
        });
      }
    } catch (error) {
      console.error('❌ Error cargando documentos:', error);
      addToast({
        type: "error",
        title: "Error",
        message: "Error al cargar documentos"
      });
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

  // Filtrar documentos por búsqueda de texto
  const documentosFiltrados = useMemo(() => {
    if (!filtros.search) return documentos;
    
    const searchLower = filtros.search.toLowerCase();
    return documentos.filter(doc => 
      doc.nombre.toLowerCase().includes(searchLower) ||
      doc.entidad_nombre.toLowerCase().includes(searchLower) ||
      doc.tipo_documento_nombre?.toLowerCase().includes(searchLower)
    );
  }, [documentos, filtros.search]);

  useEffect(() => {
    cargarDocumentos();
  }, [filtros.modulo, filtros.tipo_documento, filtros.estado, filtros.entidad_filter, filtros.fecha_desde, filtros.fecha_hasta, refreshTrigger]);

  useEffect(() => {
    cargarTiposDocumentos();
  }, []);

  // Resetear filtros
  const resetearFiltros = () => {
    setFiltros({
      modulo: 'todos',
      tipo_documento: 'todos',
      estado: 'todos',
      entidad_filter: '',
      fecha_desde: '',
      fecha_hasta: '',
      search: ''
    });
  };

  // Obtener icono del módulo
  const getModuloIcon = (modulo: string) => {
    switch (modulo) {
      case 'clientes': return Users;
      case 'instalaciones': return Building;
      case 'guardias': return Shield;
      default: return FileText;
    }
  };

  // Obtener color del estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'vigente': return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'por_vencer': return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
      case 'vencido': return 'bg-red-600/20 text-red-300 border-red-500/30';
      case 'sin_vencimiento': return 'bg-slate-600/20 text-slate-300 border-slate-500/30';
      default: return 'bg-muted/50 text-muted-foreground border-muted';
    }
  };

  // Formatear fecha
  const formatearFecha = (fecha: string | undefined) => {
    if (!fecha) return 'Sin vencimiento';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  // Formatear tamaño
  const formatearTamano = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
      <div className="flex items-center justify-between">
        <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-500" />
                Dashboard de Documentos
              </h1>
              <p className="text-muted-foreground mt-2">
                Gestión centralizada de documentos de clientes, instalaciones y guardias
          </p>
        </div>
            <Button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              variant="outline"
              size="sm"
              disabled={cargando}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${cargando ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
        >
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vigentes</p>
                  <p className="text-2xl font-bold text-green-400">{stats.vigentes.toLocaleString()}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Por Vencer</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.por_vencer.toLocaleString()}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vencidos</p>
                  <p className="text-2xl font-bold text-red-400">{stats.vencidos.toLocaleString()}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sin Vencimiento</p>
                  <p className="text-2xl font-bold text-slate-400">{stats.sin_vencimiento.toLocaleString()}</p>
                </div>
                <Calendar className="h-8 w-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primera fila de filtros */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Módulo</label>
                  <Select 
                    value={filtros.modulo} 
                    onValueChange={(value) => setFiltros(prev => ({ ...prev, modulo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los módulos</SelectItem>
                      <SelectItem value="clientes">Clientes</SelectItem>
                      <SelectItem value="instalaciones">Instalaciones</SelectItem>
                      <SelectItem value="guardias">Guardias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Tipo de Documento</label>
                  <Select 
                    value={filtros.tipo_documento} 
                    onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo_documento: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los tipos</SelectItem>
                      {tiposDocumentos.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <Select 
                    value={filtros.estado} 
                    onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los estados</SelectItem>
                      <SelectItem value="vigente">Vigente</SelectItem>
                      <SelectItem value="por_vencer">Por vencer</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                      <SelectItem value="sin_vencimiento">Sin vencimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Búsqueda</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar documentos..."
                      value={filtros.search}
                      onChange={(e) => setFiltros(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Segunda fila de filtros */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Fecha Desde</label>
                  <Input
                    type="date"
                    value={filtros.fecha_desde}
                    onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Fecha Hasta</label>
                  <Input
                    type="date"
                    value={filtros.fecha_hasta}
                    onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
                  />
      </div>

                <div className="flex items-end">
                  <Button 
                    onClick={resetearFiltros}
                    variant="outline"
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabla de documentos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card/50 border-border/50">
        <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Documentos ({documentosFiltrados.length})</span>
                {cargando && (
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
          </CardTitle>
        </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tamaño</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              {cargando ? 'Cargando documentos...' : 'No se encontraron documentos'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      documentosFiltrados.map((documento) => {
                        const ModuloIcon = getModuloIcon(documento.modulo);
                        return (
                          <TableRow key={documento.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{documento.nombre}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {documento.tipo_documento_nombre || 'Sin tipo'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ModuloIcon className="h-4 w-4" />
                                <span className="capitalize">{documento.modulo}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{documento.entidad_nombre}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{formatearFecha(documento.fecha_vencimiento)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={getEstadoColor(documento.estado)}>
                                {documento.estado.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {formatearTamano(documento.tamaño)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(documento.url, '_blank')}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
          </div>
        </CardContent>
      </Card>
        </motion.div>
      </div>
    </div>
  );
} 