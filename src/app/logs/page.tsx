import { Authorize, GuardButton, can } from '@/lib/authz-ui'
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Search, Filter, Download } from 'lucide-react';

interface Log {
  id: string;
  modulo: string;
  entidad_id: string;
  accion: string;
  usuario: string;
  tipo: string;
  contexto: any;
  datos_anteriores: any;
  datos_nuevos: any;
  fecha: string;
  tenant_id: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    modulo: 'todos',
    usuario: 'todos',
    accion: 'todos',
    fechaDesde: '',
    fechaHasta: '',
    search: ''
  });
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [modulos, setModulos] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<string[]>([]);

  // Cargar logs
  const cargarLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pagina: pagina.toString(),
        ...filtros
      });
      
      const response = await fetch(`/api/logs?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
        setTotalPaginas(data.totalPaginas);
      }
    } catch (error) {
      console.error('Error cargando logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar filtros disponibles
  const cargarFiltros = async () => {
    try {
      const response = await fetch('/api/logs/filtros');
      const data = await response.json();
      
      if (data.success) {
        // Filtrar valores vacíos o nulos
        const modulosFiltrados = data.modulos?.filter((modulo: string) => 
          modulo && modulo.trim() !== ''
        ) || [];
        const usuariosFiltrados = data.usuarios?.filter((usuario: string) => 
          usuario && usuario.trim() !== ''
        ) || [];
        
        setModulos(modulosFiltrados);
        setUsuarios(usuariosFiltrados);
      }
    } catch (error) {
      console.error('Error cargando filtros:', error);
    }
  };

  useEffect(() => {
    cargarFiltros();
  }, []);

  useEffect(() => {
    cargarLogs();
  }, [pagina, filtros]);

  const limpiarFiltros = () => {
    setFiltros({
      modulo: 'todos',
      usuario: 'todos',
      accion: 'todos',
      fechaDesde: '',
      fechaHasta: '',
      search: ''
    });
    setPagina(1);
  };

  const exportarLogs = async () => {
    try {
      const params = new URLSearchParams({
        ...filtros,
        exportar: 'true'
      });
      
      const response = await fetch(`/api/logs/exportar?${params}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exportando logs:', error);
    }
  };

  const getAccionColor = (accion: string) => {
    switch (accion) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'READ':
        return 'bg-blue-100 text-blue-800';
      case 'UPDATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getModuloColor = (modulo: string) => {
    const colores = {
      guardias: 'bg-blue-100 text-blue-800',
      pauta_mensual: 'bg-purple-100 text-purple-800',
      pauta_diaria: 'bg-orange-100 text-orange-800',
      turnos_extras: 'bg-green-100 text-green-800',
      instalaciones: 'bg-indigo-100 text-indigo-800',
      clientes: 'bg-pink-100 text-pink-800'
    };
    return colores[modulo as keyof typeof colores] || 'bg-gray-100 text-gray-800';
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const truncarTexto = (texto: string, maxLength: number = 50) => {
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sistema de Logs</h1>
        <Button onClick={exportarLogs} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Búsqueda general */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Búsqueda</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar en logs..."
                  value={filtros.search}
                  onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Módulo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Módulo</label>
              <Select value={filtros.modulo} onValueChange={(value) => setFiltros({ ...filtros, modulo: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los módulos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los módulos</SelectItem>
                  {modulos.map((modulo) => (
                    <SelectItem key={modulo} value={modulo}>
                      {modulo.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Usuario */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Usuario</label>
              <Select value={filtros.usuario} onValueChange={(value) => setFiltros({ ...filtros, usuario: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los usuarios</SelectItem>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario} value={usuario}>
                      {usuario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Acción */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Acción</label>
              <Select value={filtros.accion} onValueChange={(value) => setFiltros({ ...filtros, accion: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las acciones</SelectItem>
                  <SelectItem value="CREATE">CREATE</SelectItem>
                  <SelectItem value="READ">READ</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha desde */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha desde</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={filtros.fechaDesde}
                  onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Fecha hasta */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha hasta</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={filtros.fechaHasta}
                  onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={limpiarFiltros} variant="outline" className="mr-2">
              Limpiar filtros
            </Button>
            <Button onClick={cargarLogs}>
              Aplicar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Entidad ID</TableHead>
                      <TableHead>Contexto</TableHead>
                      <TableHead>Datos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {formatearFecha(log.fecha)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getModuloColor(log.modulo)}>
                            {log.modulo.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getAccionColor(log.accion)}>
                            {log.accion}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.usuario}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {truncarTexto(log.entidad_id, 20)}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="text-xs text-gray-600">
                            {log.contexto ? (
                              <details>
                                <summary className="cursor-pointer hover:text-gray-800">
                                  Ver contexto
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                                  {JSON.stringify(log.contexto, null, 2)}
                                </pre>
                              </details>
                            ) : (
                              <span className="text-gray-400">Sin contexto</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="text-xs text-gray-600">
                            {(log.datos_anteriores || log.datos_nuevos) ? (
                              <details>
                                <summary className="cursor-pointer hover:text-gray-800">
                                  Ver datos
                                </summary>
                                <div className="mt-2 space-y-2">
                                  {log.datos_anteriores && (
                                    <div>
                                      <div className="font-medium text-red-600">Antes:</div>
                                      <pre className="p-2 bg-red-50 rounded text-xs overflow-auto">
                                        {JSON.stringify(log.datos_anteriores, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.datos_nuevos && (
                                    <div>
                                      <div className="font-medium text-green-600">Después:</div>
                                      <pre className="p-2 bg-green-50 rounded text-xs overflow-auto">
                                        {JSON.stringify(log.datos_nuevos, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </details>
                            ) : (
                              <span className="text-gray-400">Sin datos</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">
                    Página {pagina} de {totalPaginas}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPagina(pagina - 1)}
                      disabled={pagina === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPagina(pagina + 1)}
                      disabled={pagina === totalPaginas}
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
    </div>
  );
} 