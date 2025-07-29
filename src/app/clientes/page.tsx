'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Users, Plus, Search, Edit, Trash2, Mail, Phone, MapPin, Building } from "lucide-react";
import { getClientes, deleteCliente } from '../../lib/api/clientes';
import { ClientesListResponse, ClienteResponse } from '../../lib/schemas/clientes';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const loadClientes = async () => {
    try {
      setLoading(true);
      const response = await getClientes({
        page,
        limit,
        search: search.trim() || undefined
      });
      setClientes(response.clientes);
      setTotal(response.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando clientes');
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar al cliente "${nombre}"?`)) {
      return;
    }

    try {
      await deleteCliente(id);
      loadClientes();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error eliminando cliente');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold heading-gradient">Gestión de Clientes</h2>
          <p className="text-muted-foreground">
            Administra la información y contratos de tus clientes
          </p>
        </div>
        <Button className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Barra de búsqueda */}
      <Card className="card-elegant">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nombre, RUT, email..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de clientes */}
      <Card className="card-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Lista de Clientes ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-muted-foreground mt-2">Cargando clientes...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-700 mb-2">Error al cargar clientes</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadClientes} variant="outline">
                Reintentar
              </Button>
            </div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {search ? 'No se encontraron clientes' : 'No hay clientes registrados'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {search 
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Comienza agregando tu primer cliente'
                }
              </p>
              {!search && (
                <Button className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Cliente
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {clientes.map((clienteResponse) => {
                const cliente = clienteResponse.cliente;
                return (
                  <div
                    key={cliente.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {cliente.nombre}
                          </h3>
                          {!cliente.activo && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                              Inactivo
                            </span>
                          )}
                        </div>
                        
                        {cliente.razon_social && (
                          <p className="text-sm text-muted-foreground mb-1">
                            <Building className="h-4 w-4 inline mr-1" />
                            {cliente.razon_social}
                          </p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          {cliente.rut && (
                            <span>RUT: {cliente.rut}</span>
                          )}
                          {cliente.email && (
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {cliente.email}
                            </span>
                          )}
                          {cliente.telefono && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {cliente.telefono}
                            </span>
                          )}
                          {cliente.direccion && (
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {cliente.direccion}
                            </span>
                          )}
                          {clienteResponse.instalaciones_count !== undefined && (
                            <span>
                              Instalaciones: {clienteResponse.instalaciones_count}
                            </span>
                          )}
                        </div>
                        
                        {cliente.contacto_principal && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Contacto: {cliente.contacto_principal}
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
                          onClick={() => handleDelete(cliente.id, cliente.nombre)}
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
                    Página {page} de {totalPages} ({total} clientes total)
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