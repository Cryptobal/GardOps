"use client";

import { useState, useEffect } from "react";
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
  // Permitir lectura de roles a usuarios con permiso de lectura
  const { allowed, loading, error } = useCan('rbac.roles.read');
  const { success: toastSuccess, error: toastError, addToast: toast } = useToast();

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
      })));
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button onClick={iniciarCreacion} disabled={creandoRol}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Rol
          </Button>
        </div>
      </div>

      {/* Formulario de creación */}
      {creandoRol && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Crear Nuevo Rol
            </CardTitle>
            <CardDescription>
              Define el nombre y la descripción del nuevo rol
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
            <Link
              key={rol.id}
              href={`/configuracion/seguridad/roles/${rol.id}`}
              role="link"
              tabIndex={0}
              className="block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {rol.nombre}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {rol.descripcion || 'Sin descripción'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">ID: {rol.id}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
