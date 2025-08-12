"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCan } from "@/lib/permissions";
import { rbacFetch } from "@/lib/rbacClient";
import { Button } from "@/components/ui/button";

type Permiso = { id: string; clave: string; descripcion: string | null };

export default function PermisosPage() {
  const router = useRouter();
  const { allowed: canRead, loading } = useCan("rbac.permisos.read");
  const { allowed: isPlatformAdmin } = useCan("rbac.platform_admin");

  const [items, setItems] = useState<Permiso[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAccess = canRead || isPlatformAdmin;

  useEffect(() => {
    if (!hasAccess || loading) return;
    let done = false;
    (async () => {
      try {
        setBusy(true);
        setError(null);
        const res = await rbacFetch("/api/admin/rbac/permisos", { method: "GET" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(j?.detail || j?.error || `HTTP ${res.status}`);
          return;
        }
        if (!done) setItems(Array.isArray(j?.items) ? j.items : []);
      } catch (e: any) {
        if (!done) setError(e?.message || "Error inesperado");
      } finally {
        if (!done) setBusy(false);
      }
    })();
    return () => { done = true; };
  }, [hasAccess, loading]);

  if (loading) return <div className="p-6">Cargando…</div>;

  if (!hasAccess) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6">
          <h2 className="text-lg font-semibold">Sin acceso</h2>
          <p className="text-sm text-muted-foreground">No tienes permisos para ver esta sección.</p>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => router.push("/configuracion/seguridad")}> 
              ← Volver a Seguridad
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const total = items.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => router.push("/configuracion/seguridad")}>
          ← Volver a Seguridad
        </Button>
        <h1 className="text-2xl font-semibold">Catálogo de Permisos</h1>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">Total de Permisos</div>
          <div className="text-2xl font-bold">{busy ? "…" : total}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">Categorías</div>
          <div className="text-2xl font-bold">0</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">Permisos en Uso</div>
          <div className="text-2xl font-bold">0</div>
        </div>
      </div>

      <div className="rounded-xl border">
        <div className="p-4 border-b text-sm text-muted-foreground">
          {busy ? "Cargando permisos…" : total === 0 ? "No hay permisos disponibles" : `${total} permisos`}
        </div>
        {total > 0 && (
          <ul className="divide-y">
            {items.map(p => (
              <li key={p.id} className="p-4">
                <div className="font-mono text-sm">{p.clave}</div>
                {p.descripcion && <div className="text-sm text-muted-foreground">{p.descripcion}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
