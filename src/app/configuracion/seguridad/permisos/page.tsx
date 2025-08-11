"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useCan } from "@/lib/permissions";
import { Key, Search, Shield, Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import { rbacFetch } from "@/lib/rbacClient";

interface Permiso {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  created_at: string;
  roles_count: number;
}

export default function PermisosPage() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [permisosPorCategoria, setPermisosPorCategoria] = useState<Record<string, Permiso[]>>({});
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const { allowed: canAdminRbac, loading: permissionLoading } = useCan('rbac.admin');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!permissionLoading && !canAdminRbac) {
      toast.error("No tienes permisos para acceder a esta sección");
      router.push("/");
    }
  }, [canAdminRbac, permissionLoading, router, toast]);

  const cargarPermisos = async () => {
    try {
      setCargando(true);
      const response = await rbacFetch('/api/admin/rbac/permisos');
      if (response.status === 403) {
        toast.error("No tienes permisos suficientes.");
        return;
      }
      
      if (!response.ok) {
        throw new Error('Error al cargar permisos');
      }

      const data = await response.json();
      
      if (data.success) {
        setPermisos(data.data);
        setPermisosPorCategoria(data.byCategory || {});
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al cargar permisos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (canAdminRbac) {
      cargarPermisos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAdminRbac]);

  // Filtrar permisos según búsqueda
  const permisosFiltrados = busqueda
    ? permisos.filter(p => 
        p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : permisos;

  // Agrupar permisos filtrados por categoría
  const permisosFiltradosPorCategoria = permisosFiltrados.reduce((acc: Record<string, Permiso[]>, permiso) => {
    const categoria = permiso.categoria || 'Sin categoría';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(permiso);
    return acc;
  }, {});

  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!canAdminRbac) {
    return null;
  }

  const getCategoryIcon = (categoria: string) => {
    switch (categoria.toLowerCase()) {
      case 'seguridad':
      case 'rbac':
        return <Shield className="h-4 w-4" />;
      case 'sistema':
        return <Key className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (categoria: string): "default" | "secondary" | "outline" => {
    switch (categoria.toLowerCase()) {
      case 'seguridad':
      case 'rbac':
        return "default";
      case 'sistema':
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Key className="h-6 w-6" />
          Catálogo de Permisos
        </h1>
        <p className="text-muted-foreground mt-1">
          Vista de todos los permisos disponibles en el sistema (solo lectura)
        </p>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por código, nombre o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Total de Permisos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permisos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(permisosPorCategoria).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Permisos en Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {permisos.filter(p => p.roles_count > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de permisos */}
      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Cargando permisos...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(permisosFiltradosPorCategoria)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([categoria, permisosCategoria]) => (
              <Card key={categoria}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getCategoryIcon(categoria)}
                    {categoria}
                    <Badge variant={getCategoryColor(categoria)} className="ml-2">
                      {permisosCategoria.length} permisos
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Permisos relacionados con {categoria.toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">
                            Código
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">
                            Nombre
                          </th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">
                            Descripción
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase">
                            Roles
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {permisosCategoria
                          .sort((a, b) => a.codigo.localeCompare(b.codigo))
                          .map((permiso) => (
                            <tr key={permiso.id} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="py-2 px-3">
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {permiso.codigo}
                                </code>
                              </td>
                              <td className="py-2 px-3 text-sm font-medium">
                                {permiso.nombre}
                              </td>
                              <td className="py-2 px-3 text-sm text-muted-foreground hidden md:table-cell">
                                {permiso.descripcion || '-'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {permiso.roles_count > 0 ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {permiso.roles_count}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">0</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}

          {Object.keys(permisosFiltradosPorCategoria).length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  {busqueda 
                    ? `No se encontraron permisos que coincidan con "${busqueda}"`
                    : 'No hay permisos disponibles'
                  }
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
