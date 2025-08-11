"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useCan } from "@/lib/permissions";
import { Search, Users, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Rol {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
}

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol_legacy: string;
  activo: boolean;
  ultimo_acceso: string | null;
  created_at: string;
  roles_rbac: Rol[];
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [rolesDisponibles, setRolesDisponibles] = useState<Rol[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [editandoRoles, setEditandoRoles] = useState<string | null>(null);
  const [rolesSeleccionados, setRolesSeleccionados] = useState<Record<string, string[]>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { allowed: canAdminRbac, loading: permissionLoading } = useCan('rbac.admin');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!permissionLoading && !canAdminRbac) {
      toast.error("No tienes permisos para acceder a esta sección");
      router.push("/");
    }
  }, [canAdminRbac, permissionLoading, router, toast]);

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      const response = await fetch(`/api/admin/rbac/usuarios?q=${busqueda}&page=${page}&limit=20`);
      
      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      
      if (data.success) {
        setUsuarios(data.data);
        setTotalPages(data.pagination.totalPages);
        
        // Inicializar roles seleccionados
        const rolesMap: Record<string, string[]> = {};
        data.data.forEach((usuario: Usuario) => {
          rolesMap[usuario.id] = usuario.roles_rbac.map(r => r.id);
        });
        setRolesSeleccionados(rolesMap);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al cargar usuarios");
    } finally {
      setCargando(false);
    }
  };

  const cargarRoles = async () => {
    try {
      const response = await fetch('/api/admin/rbac/roles');
      const data = await response.json();
      
      if (data.success) {
        setRolesDisponibles(data.data);
      }
    } catch (error) {
      console.error('Error cargando roles:', error);
    }
  };

  useEffect(() => {
    if (canAdminRbac) {
      cargarUsuarios();
      cargarRoles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, page, canAdminRbac]);

  const toggleActivoUsuario = async (usuario: Usuario) => {
    try {
      setGuardando(usuario.id);
      
      const response = await fetch('/api/admin/rbac/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: usuario.id,
          activo: !usuario.activo
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Usuario ${!usuario.activo ? 'activado' : 'desactivado'} exitosamente`);
        await cargarUsuarios();
      } else {
        toast.error(data.error || 'Error al actualizar usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar usuario');
    } finally {
      setGuardando(null);
    }
  };

  const guardarRoles = async (usuarioId: string) => {
    try {
      setGuardando(usuarioId);
      
      const response = await fetch('/api/admin/rbac/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: usuarioId,
          roles: rolesSeleccionados[usuarioId] || []
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Roles actualizados exitosamente');
        setEditandoRoles(null);
        await cargarUsuarios();
      } else {
        toast.error(data.error || 'Error al actualizar roles');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar roles');
    } finally {
      setGuardando(null);
    }
  };

  const toggleRol = (usuarioId: string, rolId: string) => {
    setRolesSeleccionados(prev => {
      const roles = prev[usuarioId] || [];
      if (roles.includes(rolId)) {
        return {
          ...prev,
          [usuarioId]: roles.filter(r => r !== rolId)
        };
      } else {
        return {
          ...prev,
          [usuarioId]: [...roles, rolId]
        };
      }
    });
  };

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

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Gestión de Usuarios
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra usuarios, su estado y roles asignados
        </p>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre, apellido o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabla de usuarios */}
      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Cargando usuarios...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden border rounded-lg">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Roles
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Último Acceso
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {usuarios.map((usuario) => (
                      <tr key={usuario.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium">
                            {usuario.nombre} {usuario.apellido}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {usuario.rol_legacy}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {usuario.email}
                        </td>
                        <td className="px-4 py-3">
                          {editandoRoles === usuario.id ? (
                            <div className="space-y-2 max-w-xs">
                              {rolesDisponibles.map((rol) => (
                                <label
                                  key={rol.id}
                                  className="flex items-center space-x-2 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(rolesSeleccionados[usuario.id] || []).includes(rol.id)}
                                    onChange={() => toggleRol(usuario.id, rol.id)}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm">{rol.nombre}</span>
                                </label>
                              ))}
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  onClick={() => guardarRoles(usuario.id)}
                                  disabled={guardando === usuario.id}
                                >
                                  {guardando === usuario.id ? 'Guardando...' : 'Guardar'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditandoRoles(null);
                                    setRolesSeleccionados(prev => ({
                                      ...prev,
                                      [usuario.id]: usuario.roles_rbac.map(r => r.id)
                                    }));
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {usuario.roles_rbac.length > 0 ? (
                                usuario.roles_rbac.map((rol) => (
                                  <Badge key={rol.id} variant="secondary" className="text-xs">
                                    {rol.nombre}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">Sin roles RBAC</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Switch
                            checked={usuario.activo}
                            onCheckedChange={() => toggleActivoUsuario(usuario)}
                            disabled={guardando === usuario.id}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                          {usuario.ultimo_acceso 
                            ? new Date(usuario.ultimo_acceso).toLocaleDateString()
                            : 'Nunca'
                          }
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {editandoRoles !== usuario.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditandoRoles(usuario.id)}
                              className="flex items-center gap-1"
                            >
                              <Shield className="h-3 w-3" />
                              Editar Roles
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
