"use client";

import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCan } from "@/lib/permissions";
import { Shield, Plus, Save, X } from "lucide-react";
import Link from "next/link";
import { rbacFetch } from "@/lib/rbacClient";
import BackToSecurity from "@/components/BackToSecurity";

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creandoRol, setCreandoRol] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
  });
  const [effectivePermissions, setEffectivePermissions] = useState<Record<string, string[]>>({});
  // Permitir lectura de roles a usuarios con permiso de lectura
  const { allowed, loading, error } = useCan('rbac.roles.read');
  const { allowed: canWrite } = useCan('rbac.roles.write');
  const { allowed: isPlatformAdmin } = useCan('rbac.platform_admin');
  const { success: toastSuccess, error: toastError, addToast: toast } = useToast();

  // Cargar permisos del usuario
  const cargarPermisos = useCallback(async () => {
    try {
      const response = await fetch('/api/me/effective-permissions');
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.effective) {
          setEffectivePermissions(data.effective);
        }
      }
    } catch (error) {
      console.error('Error cargando permisos:', error);
    }
  }, []);

  // Cargar permisos al montar el componente
  useEffect(() => {
    cargarPermisos();
  }, [cargarPermisos]);

  // Cargar datos solo si está permitido

  const cargarRoles = async () => {
    try {
      setCargando(true);
      const response = await rbacFetch('/api/admin/rbac/roles?tenant_id=current');
      if (response.status === 403) {
        const msg = "No tienes permisos suficientes.";
        toast ? toast({ title: 'Error', description: msg, type: 'error' }) : console.warn(msg);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Error al cargar roles');
      }

      const data = await response.json();
      
      const items = Array.isArray(data.items) ? data.items : [];
      setRoles(items.map((r: any) => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion || '',
      })).sort((a, b) => {
        // Ordenar: Global primero, luego Tenant, alfabético
        const aIsGlobal = a.nombre.includes('(Global)');
        const bIsGlobal = b.nombre.includes('(Global)');
        if (aIsGlobal && !bIsGlobal) return -1;
        if (!aIsGlobal && bIsGlobal) return 1;
        return a.nombre.localeCompare(b.nombre);
      }));
    } catch (error) {
      console.error('Error:', error);
      const msg = "Error al cargar roles";
      toast ? toast({ title: 'Error', description: msg, type: 'error' }) : console.warn(msg);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (allowed) {
      cargarRoles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const iniciarCreacion = () => {
    setCreandoRol(true);
    setFormData({ nombre: "", descripcion: "" });
  };

  const cancelarEdicion = () => {
    setCreandoRol(false);
    setFormData({ nombre: "", descripcion: "" });
  };

  const createAdminRole = async () => {
    try {
      setGuardando(true);
      
      const response = await rbacFetch('/api/admin/rbac/create-admin-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.detail || 'Error al crear rol de administrador');
      }

      const data = await response.json();
      toastSuccess(`Rol de administrador creado exitosamente con ${data.rol.permisosAsignados} permisos`);
      
      // Recargar la lista de roles
      await cargarRoles();
      
    } catch (error: any) {
      console.error('Error:', error);
      toastError(error.message || 'Error al crear rol de administrador');
    } finally {
      setGuardando(false);
    }
  };

  const guardarRol = async () => {
    if (!formData.nombre.trim()) {
      toastError("El nombre del rol es requerido");
      return;
    }

    try {
      setGuardando(true);
      
      const url = '/api/admin/rbac/roles';
      const method = 'POST';
      const body = { nombre: formData.nombre, descripcion: formData.descripcion || undefined, permisos: [] as string[] };

      const response = await rbacFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const resBody = await response.json().catch(() => ({} as any));
      if (!response.ok) {
        console.error('roles.create error', { status: response.status, body: resBody });
        if (response.status === 409) {
          throw new Error('Ya existe un rol con ese nombre en este tenant.');
        }
        throw new Error(resBody?.detail || resBody?.error || `HTTP ${response.status}`);
      }

      toast ? toast({ title: 'Rol creado exitosamente', type: 'success' }) : console.warn('Rol creado exitosamente');
      cancelarEdicion();
      await cargarRoles();
    } catch (error) {
      console.error('Error:', error);
      toast ? toast({ title: 'Error', description: String((error as any)?.message ?? 'Error al guardar rol'), type: 'error' }) : console.warn('Error al guardar rol');
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
      const response = await rbacFetch(`/api/admin/rbac/roles?id=${rol.id}`, {
        method: 'DELETE'
      });
      if (response.status === 403) {
        toast.error("No tienes permisos suficientes.");
        return;
      }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6">
          <h2 className="text-lg font-semibold">Sin acceso</h2>
          <p className="text-sm text-muted-foreground mt-1">
            No tienes permisos para ver esta sección.
          </p>
          <Link href="/configuracion/seguridad" className="inline-flex mt-4 px-3 py-2 rounded-lg border">
            ← Volver a Seguridad
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Roles del Sistema</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona los roles y sus permisos asignados
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            {isPlatformAdmin && (
              <Authorize resource="configuracion" action="create" eff={effectivePermissions}>
  <GuardButton resource="configuracion" action="create" eff={effectivePermissions}  
                variant="outline" 
                onClick={createAdminRole}
                disabled={guardando}
                className="w-full sm:w-auto"
              >
                👑 Crear Rol Admin
              </GuardButton>
</Authorize>
            )}
            {canWrite && (
              <Button onClick={iniciarCreacion} disabled={creandoRol} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Rol
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Formulario de creación */}
      {creandoRol && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              Crear Nuevo Rol
            </CardTitle>
            <CardDescription>
              Define el nombre y la descripción del nuevo rol
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Rol</label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Supervisor de Operaciones"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Describe las responsabilidades de este rol..."
                className="w-full"
                rows={3}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={cancelarEdicion}
                disabled={guardando}
                className="w-full sm:w-auto"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={guardarRol}
                disabled={guardando}
                className="w-full sm:w-auto"
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
        <div className="space-y-2">
          {roles.map((rol) => (
            <Link
              key={rol.id}
              href={`/configuracion/seguridad/roles/${rol.id}/permisos`}
              role="link"
              tabIndex={0}
              className="block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h3 className="font-medium text-sm sm:text-base truncate">
                          {rol.nombre}
                        </h3>
                        {rol.nombre.includes('(Global)') && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">Global</Badge>
                        )}
                        {rol.nombre.includes('(Tenant)') && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">Tenant</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {rol.descripcion || 'Sin descripción'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <div className="text-xs text-muted-foreground hidden sm:block">
                        ID: {rol.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
