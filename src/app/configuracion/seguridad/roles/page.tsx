"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useCan } from "@/lib/permissions";
import { Shield, Plus, Edit2, Trash2, Save, X, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface Permiso {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
}

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  es_sistema: boolean;
  activo: boolean;
  permisos: Permiso[];
  usuarios_count: number;
  created_at: string;
  updated_at: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisosDisponibles, setPermisosDisponibles] = useState<Record<string, Permiso[]>>({});
  const [cargando, setCargando] = useState(true);
  const [creandoRol, setCreandoRol] = useState(false);
  const [editandoRol, setEditandoRol] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    permisos: [] as string[]
  });
  const { allowed: canAdminRbac, loading: permissionLoading } = useCan('rbac.admin');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!permissionLoading && !canAdminRbac) {
      toast.error("No tienes permisos para acceder a esta sección");
      router.push("/");
    }
  }, [canAdminRbac, permissionLoading, router, toast]);

  const cargarRoles = async () => {
    try {
      setCargando(true);
      const response = await fetch('/api/admin/rbac/roles');
      
      if (!response.ok) {
        throw new Error('Error al cargar roles');
      }

      const data = await response.json();
      
      if (data.success) {
        setRoles(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al cargar roles");
    } finally {
      setCargando(false);
    }
  };

  const cargarPermisos = async () => {
    try {
      const response = await fetch('/api/admin/rbac/permisos');
      const data = await response.json();
      
      if (data.success) {
        setPermisosDisponibles(data.byCategory || {});
      }
    } catch (error) {
      console.error('Error cargando permisos:', error);
    }
  };

  useEffect(() => {
    if (canAdminRbac) {
      cargarRoles();
      cargarPermisos();
    }
  }, [canAdminRbac]);

  const iniciarCreacion = () => {
    setCreandoRol(true);
    setFormData({ nombre: "", descripcion: "", permisos: [] });
  };

  const iniciarEdicion = (rol: Rol) => {
    if (rol.es_sistema) {
      toast.error("No se pueden editar roles del sistema");
      return;
    }
    setEditandoRol(rol.id);
    setFormData({
      nombre: rol.nombre,
      descripcion: rol.descripcion || "",
      permisos: rol.permisos.map(p => p.id)
    });
  };

  const cancelarEdicion = () => {
    setCreandoRol(false);
    setEditandoRol(null);
    setFormData({ nombre: "", descripcion: "", permisos: [] });
  };

  const guardarRol = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre del rol es requerido");
      return;
    }

    try {
      setGuardando(true);
      
      const url = editandoRol ? '/api/admin/rbac/roles' : '/api/admin/rbac/roles';
      const method = editandoRol ? 'PUT' : 'POST';
      const body = editandoRol 
        ? { id: editandoRol, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(editandoRol ? 'Rol actualizado exitosamente' : 'Rol creado exitosamente');
        cancelarEdicion();
        await cargarRoles();
      } else {
        toast.error(data.error || 'Error al guardar rol');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar rol');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarRol = async (rol: Rol) => {
    if (rol.es_sistema) {
      toast.error("No se pueden eliminar roles del sistema");
      return;
    }

    if (rol.usuarios_count > 0) {
      toast.error(`Este rol tiene ${rol.usuarios_count} usuario(s) asignado(s)`);
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar el rol "${rol.nombre}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/rbac/roles?id=${rol.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Rol eliminado exitosamente');
        await cargarRoles();
      } else {
        toast.error(data.error || 'Error al eliminar rol');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar rol');
    }
  };

  const togglePermiso = (permisoId: string) => {
    setFormData(prev => ({
      ...prev,
      permisos: prev.permisos.includes(permisoId)
        ? prev.permisos.filter(p => p !== permisoId)
        : [...prev.permisos, permisoId]
    }));
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Gestión de Roles
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra roles y sus permisos asociados
          </p>
        </div>
        <Button onClick={iniciarCreacion} disabled={creandoRol}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Rol
        </Button>
      </div>

      {/* Formulario de creación/edición */}
      {(creandoRol || editandoRol) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {creandoRol ? 'Crear Nuevo Rol' : 'Editar Rol'}
            </CardTitle>
            <CardDescription>
              {creandoRol 
                ? 'Define el nombre, descripción y permisos del nuevo rol'
                : 'Modifica los datos y permisos del rol'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre del Rol</label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Supervisor de Operaciones"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Describe las responsabilidades de este rol..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Permisos</label>
              <div className="mt-2 space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4">
                {Object.entries(permisosDisponibles).map(([categoria, permisos]) => (
                  <div key={categoria}>
                    <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                      {categoria}
                    </h4>
                    <div className="space-y-2 ml-4">
                      {permisos.map((permiso) => (
                        <label
                          key={permiso.id}
                          className="flex items-start space-x-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permisos.includes(permiso.id)}
                            onChange={() => togglePermiso(permiso.id)}
                            className="mt-1 rounded border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{permiso.nombre}</div>
                            <div className="text-xs text-muted-foreground">
                              {permiso.codigo}
                              {permiso.descripcion && ` - ${permiso.descripcion}`}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={cancelarEdicion}
                disabled={guardando}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={guardarRol}
                disabled={guardando}
              >
                {guardando ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de roles */}
      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Cargando roles...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((rol) => (
            <Card key={rol.id} className={rol.es_sistema ? 'border-muted' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {rol.nombre}
                      {rol.es_sistema && (
                        <Badge variant="secondary" className="text-xs">
                          Sistema
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {rol.descripcion || 'Sin descripción'}
                    </CardDescription>
                  </div>
                  {!rol.es_sistema && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => iniciarEdicion(rol)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => eliminarRol(rol)}
                        disabled={rol.usuarios_count > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{rol.usuarios_count} usuario(s)</span>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-2">
                      Permisos ({rol.permisos.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rol.permisos.length > 0 ? (
                        rol.permisos.slice(0, 5).map((permiso) => (
                          <Badge key={permiso.id} variant="outline" className="text-xs">
                            {permiso.codigo}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin permisos</span>
                      )}
                      {rol.permisos.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{rol.permisos.length - 5} más
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
