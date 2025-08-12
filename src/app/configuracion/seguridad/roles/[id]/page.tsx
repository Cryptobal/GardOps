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
      const [rRes, aRes, cRes] = await Promise.all([
        rbacFetch(`/api/admin/rbac/roles/${id}`),
        rbacFetch(`/api/admin/rbac/roles/${id}/permisos`),
        rbacFetch(`/api/admin/rbac/permisos`),
      ]);

      const [rJ, aJ, cJ] = await Promise.all([
        rRes.json().catch(() => ({})),
        aRes.json().catch(() => ({})),
        cRes.json().catch(() => ({})),
      ]);

      if (!rRes.ok) throw new Error(rJ?.detail || rJ?.error || `HTTP ${rRes.status}`);
      if (!aRes.ok) throw new Error(aJ?.detail || aJ?.error || `HTTP ${aRes.status}`);
      if (!cRes.ok) throw new Error(cJ?.detail || cJ?.error || `HTTP ${cRes.status}`);

      setRol(rJ.item as Rol);
      setAsignados(Array.isArray(aJ.items) ? aJ.items : []);
      setCatalogo(Array.isArray(cJ.items) ? cJ.items : []);
    } catch (e: any) {
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
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Detalle de Rol</h1>
          <p className="text-sm text-muted-foreground">ID: {id}</p>
        </div>
        <Link href="/configuracion/seguridad/roles" className="inline-flex items-center gap-2 text-sm text-primary">
          ← Volver a Roles
        </Link>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600">{error}</div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{rol?.nombre ?? "Rol"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{rol?.descripcion || "Sin descripción"}</div>
          {rol?.tenant_id && (
            <div className="mt-2 text-xs text-muted-foreground">Tenant: {rol.tenant_id}</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Permisos asignados</CardTitle>
          </CardHeader>
          <CardContent>
            {busy ? (
              <div className="text-sm text-muted-foreground">Cargando...</div>
            ) : asignados.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay permisos asignados.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {asignados.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 border rounded-full px-3 py-1 text-sm">
                    <span className="font-mono">{p.clave}</span>
                    <span className="text-muted-foreground">— {p.descripcion || ""}</span>
                    {(canWrite) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-red-600"
                        onClick={() => updatePermisos({ remove: [p.id] })}
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agregar permisos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Combobox
                items={noAsignados.map((p) => ({ id: p.id, codigo: p.clave, nombre: p.descripcion || p.clave }))}
                value={selectedPerm}
                onChange={setSelectedPerm}
                placeholder="Selecciona un permiso..."
                disabled={!canWrite}
                searchPlaceholder="Buscar permiso..."
                emptyMessage="No hay permisos disponibles"
              />
              <Button
                onClick={() => selectedPerm && updatePermisos({ add: [selectedPerm] })}
                disabled={!canWrite || !selectedPerm}
              >
                Agregar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


