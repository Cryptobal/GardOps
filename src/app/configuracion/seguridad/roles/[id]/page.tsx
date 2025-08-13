"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCan } from "@/lib/permissions";
import { rbacFetch } from "@/lib/rbacClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";

type Rol = { id: string; nombre: string; descripcion: string | null; tenant_id: string | null };
type Permiso = { id: string; clave: string; descripcion: string | null };

export default function RolDetallePage() {
  const params = useParams();
  const id = String(params?.id || "");

  const { allowed, loading } = useCan("rbac.roles.read");
  const { allowed: allowedWrite } = useCan("rbac.roles.write");
  const { allowed: allowedAdmin } = useCan("rbac.platform_admin");
  const canWrite = allowedWrite || allowedAdmin;
  const { addToast: toast, success: toastSuccess, error: toastError } = useToast();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [asignados, setAsignados] = useState<Permiso[]>([]);
  const [catalogo, setCatalogo] = useState<Permiso[]>([]);
  const [selectedPerm, setSelectedPerm] = useState<string | undefined>(undefined);

  const noAsignados = useMemo(() => {
    const assignedIds = new Set(asignados.map(p => p.id));
    return catalogo.filter(p => !assignedIds.has(p.id));
  }, [asignados, catalogo]);

  async function loadAll() {
    setBusy(true);
    setError(null);
    try {
      console.log('🔄 Cargando datos del rol:', id);
      
      const [rRes, aRes, cRes] = await Promise.all([
        rbacFetch(`/api/admin/rbac/roles/${id}`),
        rbacFetch(`/api/admin/rbac/roles/${id}/permisos`),
        rbacFetch(`/api/admin/rbac/permisos`),
      ]);

      console.log('📡 Respuestas recibidas:', {
        rol: rRes.status,
        permisos: aRes.status,
        catalogo: cRes.status
      });

      const [rJ, aJ, cJ] = await Promise.all([
        rRes.json().catch(() => ({})),
        aRes.json().catch(() => ({})),
        cRes.json().catch(() => ({})),
      ]);

      console.log('📊 Datos parseados:', {
        rol: rJ,
        permisos: aJ,
        catalogo: cJ
      });

      if (!rRes.ok) throw new Error(rJ?.detail || rJ?.error || `HTTP ${rRes.status}`);
      if (!aRes.ok) throw new Error(aJ?.detail || aJ?.error || `HTTP ${aRes.status}`);
      if (!cRes.ok) throw new Error(cJ?.detail || cJ?.error || `HTTP ${cRes.status}`);

      const rolData = rJ.item as Rol;
      const asignadosData = Array.isArray(aJ.items) ? aJ.items : [];
      const catalogoData = Array.isArray(cJ.items) ? cJ.items : [];

      console.log('✅ Datos finales:', {
        rol: rolData,
        asignados: asignadosData.length,
        catalogo: catalogoData.length
      });

      setRol(rolData);
      setAsignados(asignadosData);
      setCatalogo(catalogoData);
    } catch (e: any) {
      console.error('❌ Error al cargar datos:', e);
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function updatePermisos({ add, remove }: { add?: string[]; remove?: string[] }) {
    try {
      const res = await rbacFetch(`/api/admin/rbac/roles/${id}/permisos`, {
        method: "PUT",
        body: JSON.stringify({ add, remove }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = j?.detail || j?.error || `HTTP ${res.status}`;
        toast ? toast({ title: "Error", description: msg, type: "error" }) : console.warn(msg);
        return;
      }
      if ((add?.length || 0) > 0) toastSuccess("Permiso agregado");
      if ((remove?.length || 0) > 0) toastSuccess("Permiso quitado");
      await reloadAsignados();
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      toast ? toast({ title: "Error", description: msg, type: "error" }) : console.warn(msg);
    }
  }

  async function reloadAsignados() {
    const res = await rbacFetch(`/api/admin/rbac/roles/${id}/permisos`);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = j?.detail || j?.error || `HTTP ${res.status}`;
      toast ? toast({ title: "Error", description: msg, type: "error" }) : console.warn(msg);
      return;
    }
    setAsignados(Array.isArray(j.items) ? j.items : []);
  }

  useEffect(() => {
    if (!id) return;
    if (allowed) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6">
          <h2 className="text-lg font-semibold">Sin acceso</h2>
          <p className="text-sm text-muted-foreground mt-1">No tienes permisos para ver esta sección.</p>
          <Link href="/configuracion/seguridad/roles" className="inline-flex mt-4 px-3 py-2 rounded-lg border">← Volver a Roles</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/configuracion/seguridad/roles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Volver a Roles
              </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{rol?.nombre ?? "Rol"}</h1>
            <p className="text-muted-foreground mt-1">
              {rol?.descripcion || "Sin descripción"}
            </p>
            {rol?.tenant_id && (
              <div className="text-xs text-muted-foreground mt-1">
                Tenant: {rol.tenant_id}
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            <div className="text-xs text-muted-foreground">ID: {id}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {/* Interfaz de Matriz - Siempre visible */}
      <div className="space-y-6">
        {/* Sección de Permisos Asignados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              🎯 Matriz de Permisos
              <span className="text-sm font-normal text-muted-foreground">
                ({asignados.length} asignados)
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Permisos actualmente asignados a este rol
            </p>
          </CardHeader>
          <CardContent>
            {busy ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Cargando permisos...</p>
                </div>
              </div>
            ) : asignados.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-2">🎯</div>
                <p className="text-sm text-muted-foreground">No hay permisos asignados a este rol.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {asignados.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded text-xs">
                          {p.clave}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {p.descripcion || "Sin descripción"}
                      </p>
                    </div>
                    {canWrite && (
                      <div className="flex-shrink-0 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => updatePermisos({ remove: [p.id] })}
                        >
                          Quitar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sección de Agregar Permisos */}
        {canWrite && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">➕ Agregar Permisos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecciona permisos para agregar al rol
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Combobox
                  items={noAsignados.map((p) => ({ 
                    id: p.id, 
                    codigo: p.clave, 
                    nombre: p.descripcion || p.clave 
                  }))}
                  value={selectedPerm}
                  onChange={setSelectedPerm}
                  placeholder="Buscar y seleccionar permiso..."
                  disabled={!canWrite}
                  searchPlaceholder="Buscar permiso..."
                  emptyMessage="No hay permisos disponibles para agregar"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => selectedPerm && updatePermisos({ add: [selectedPerm] })}
                    disabled={!canWrite || !selectedPerm}
                    className="w-full sm:w-auto"
                  >
                    ➕ Agregar Permiso
                  </Button>
                  {selectedPerm && (
                    <Button
                      variant="outline"
                      onClick={() => setSelectedPerm(undefined)}
                      className="w-full sm:w-auto"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información del Rol */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">ℹ️ Información del Rol</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <p className="text-sm text-muted-foreground mt-1">{rol?.nombre}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {rol?.descripcion || "Sin descripción"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {rol?.tenant_id ? "Tenant" : "Global"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">ID</label>
                <p className="text-sm text-muted-foreground font-mono mt-1">{id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


