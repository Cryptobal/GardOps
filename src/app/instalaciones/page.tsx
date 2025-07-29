'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Building2, Plus, Search, Edit, Trash2, Phone, MapPin, User, Hash, Tag } from "lucide-react";
import { getInstalaciones, deleteInstalacion } from '../../lib/api/instalaciones';
import { InstalacionesListResponse, InstalacionResponse } from '../../lib/schemas/instalaciones';

export default function InstalacionesPage() {
  const [instalaciones, setInstalaciones] = useState<InstalacionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tipoFilter, setTipoFilter] = useState('');
  const limit = 10;

  const loadInstalaciones = async () => {
    try {
      setLoading(true);
      const response = await getInstalaciones({
        page,
        limit,
        search: search.trim() || undefined,
        tipo: tipoFilter || undefined
      });
      setInstalaciones(response.instalaciones);
      setTotal(response.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando instalaciones');
      setInstalaciones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstalaciones();
  }, [page, search, tipoFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleTipoFilter = (value: string) => {
    setTipoFilter(value);
    setPage(1);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar la instalación "${nombre}"?`)) {
      return;
    }

    try {
      await deleteInstalacion(id);
      loadInstalaciones();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error eliminando instalación');
    }
  };

  const getTipoColor = (tipo: string) => {
    const colors = {
      residencial: 'bg-green-100 text-green-800',
      comercial: 'bg-blue-100 text-blue-800',
      industrial: 'bg-purple-100 text-purple-800',
      institucional: 'bg-orange-100 text-orange-800'
    };
    return colors[tipo as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold heading-gradient">Gestión de Instalaciones</h2>
          <p className="text-muted-foreground">
            Administra las ubicaciones y sitios bajo vigilancia
          </p>
        </div>
        <Button className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Instalación
        </Button>
      </div>

      {/* Filtros */}
      <Card className="card-elegant">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, dirección, código..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="lg:w-48">
              <select
                value={tipoFilter}
                onChange={(e) => handleTipoFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los tipos</option>
                <option value="residencial">Residencial</option>
                <option value="comercial">Comercial</option>
                <option value="industrial">Industrial</option>
                <option value="institucional">Institucional</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de instalaciones */}
      <Card className="card-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-500" />
            Lista de Instalaciones ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-muted-foreground mt-2">Cargando instalaciones...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-700 mb-2">Error al cargar instalaciones</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadInstalaciones} variant="outline">
                Reintentar
              </Button>
            </div>
          ) : instalaciones.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {search || tipoFilter ? 'No se encontraron instalaciones' : 'No hay instalaciones registradas'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {search || tipoFilter
                  ? 'Intenta con otros filtros de búsqueda'
                  : 'Comienza agregando tu primera instalación'
                }
              </p>
              {!search && !tipoFilter && (
                <Button className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Instalación
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {instalaciones.map((instalacionResponse) => {
                const instalacion = instalacionResponse.instalacion;
                return (
                  <div
                    key={instalacion.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {instalacion.nombre}
                          </h3>
                          {instalacion.tipo && (
                            <span className={`px-2 py-1 text-xs rounded-full ${getTipoColor(instalacion.tipo)}`}>
                              {instalacion.tipo.charAt(0).toUpperCase() + instalacion.tipo.slice(1)}
                            </span>
                          )}
                          {!instalacion.activo && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                              Inactivo
                            </span>
                          )}
                        </div>
                        
                        <div className="mb-2">
                          <p className="text-sm text-muted-foreground flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {instalacion.direccion}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-muted-foreground">
                          {instalacion.codigo && (
                            <span className="flex items-center">
                              <Hash className="h-3 w-3 mr-1" />
                              {instalacion.codigo}
                            </span>
                          )}
                          {instalacion.telefono && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {instalacion.telefono}
                            </span>
                          )}
                          {instalacionResponse.cliente && (
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {instalacionResponse.cliente.nombre}
                            </span>
                          )}
                          {instalacionResponse.guardias_count !== undefined && (
                            <span className="flex items-center">
                              <Tag className="h-3 w-3 mr-1" />
                              {instalacionResponse.guardias_count} guardias
                            </span>
                          )}
                        </div>
                        
                        {instalacion.observaciones && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <strong>Observaciones:</strong> {instalacion.observaciones}
                          </p>
                        )}

                        {(instalacion.coordenadas_lat && instalacion.coordenadas_lng) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📍 {instalacion.coordenadas_lat}, {instalacion.coordenadas_lng}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(instalacion.id, instalacion.nombre)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {totalPages} ({total} instalaciones total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 