"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";
import BackToSecurity from "@/components/BackToSecurity";
import { rbacFetch } from "@/lib/rbacClient";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type UsuarioRow = { id: string; email: string; nombre: string | null; activo: boolean; tenant_id: string | null };

export default function UsuariosPage() {
  const [rows, setRows] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function toggleActivo(id: string, current: boolean) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, activo: !current } : r)));
    try {
      const res = await rbacFetch(`/api/admin/rbac/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !current }),
      });
      if (res.status === 403) throw new Error("No tienes permisos suficientes (403)");
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok || (json as any)?.ok === false) {
        throw new Error((json as any)?.error || "No se pudo actualizar el estado");
      }
    } catch (e: any) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, activo: current } : r)));
      setError(e?.message || "Error al actualizar estado");
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await rbacFetch(`/api/admin/rbac/usuarios?page=1&limit=20`);
        const json = await res.json().catch(() => ({}));
        if (!isMounted) return;
        if (res.status === 403) {
          setError("No tienes permisos suficientes (403).");
          setRows([]);
        } else if (!res.ok) {
          setError((json as any)?.error || "Error al cargar usuarios.");
          setRows([]);
        } else {
          const items = (json as any)?.items;
          setRows(Array.isArray(items) ? (items as UsuarioRow[]) : []);
          setError(null);
        }
      } catch {
        if (!isMounted) return;
        setError("Error al cargar usuarios.");
        setRows([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

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
        <BackToSecurity />
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
        <div className="mt-4">
          <Button
            onClick={() => setShowNew(true)}
            aria-label="Abrir modal Nuevo Usuario"
          >
            Nuevo Usuario
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre, apellido o email..."
            className="pl-10"
          />
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Cargando usuarios…</p>
      )}

      {!loading && !error && (
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
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {row.nombre ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {row.email}
                      </td>
                      <td className="px-4 py-3 text-sm">—</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {row.activo ? "Activo" : "Inactivo"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">—</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActivo(row.id, row.activo)}
                          disabled={loading}
                          aria-label={row.activo ? "Desactivar usuario" : "Activar usuario"}
                        >
                          {row.activo ? "Desactivar" : "Activar"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No hay usuarios para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={showNew}
        onOpenChange={(open) => {
          setShowNew(open);
          if (!open) {
            setFormError(null);
            setEmail("");
            setNombre("");
            setTenantId("");
            setCreating(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Input
                type="email"
                placeholder="Correo electrónico"
                aria-label="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="Nombre (opcional)"
                aria-label="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="text"
                placeholder="Tenant ID (opcional)"
                aria-label="Tenant ID"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              />
            </div>
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNew(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                setFormError(null);
                const emailValid = /\S+@\S+\.\S+/.test(email);
                if (!email || !emailValid) {
                  setFormError("Email inválido o faltante");
                  return;
                }
                try {
                  setCreating(true);
                  const res = await rbacFetch(`/api/admin/rbac/usuarios`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email,
                      nombre: nombre || undefined,
                      tenant_id: tenantId || undefined,
                    }),
                  });
                  if (res.status === 403) {
                    setFormError("No tienes permisos suficientes (403)");
                  } else {
                    const json = await res.json().catch(() => ({} as any));
                    if (!res.ok || (json as any)?.ok === false) {
                      setFormError((json as any)?.error || "No se pudo crear el usuario");
                    } else {
                      const user = (json as any)?.user as UsuarioRow | undefined;
                      if (user) setRows((prev) => [user, ...prev]);
                      setShowNew(false);
                      setEmail("");
                      setNombre("");
                      setTenantId("");
                      setFormError(null);
                    }
                  }
                } catch {
                  setFormError("No se pudo crear el usuario");
                } finally {
                  setCreating(false);
                }
              }}
              disabled={creating}
              aria-label="Crear nuevo usuario"
            >
              {creating ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
