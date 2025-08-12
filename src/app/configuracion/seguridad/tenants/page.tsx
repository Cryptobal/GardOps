"use client";

import { useEffect, useState } from "react";
import { rbacFetch } from "@/lib/rbacClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import BackToSecurity from "@/components/BackToSecurity";
import { useCan } from "@/lib/permissions";
import Link from "next/link";

interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  activo?: boolean;
  created_at?: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState({ nombre: "", slug: "", owner_email: "", owner_nombre: "" });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const { addToast: toast, error: toastError, success: toastSuccess } = useToast();
  const { allowed: isPlatformAdmin, loading: loadingPerm } = useCan('rbac.platform_admin');

  async function loadTenants() {
    try {
      setLoading(true);
      const res = await rbacFetch('/api/admin/tenants', { cache: 'no-store' });
      if (res.status === 403) {
        const msg = "No tienes permisos suficientes.";
        toast ? toast({ title: 'Error', description: msg, type: 'error' }) : console.warn(msg);
        return;
      }
      if (!res.ok) throw new Error('Error al cargar tenants');
      const data = await res.json();
      setTenants(data?.data ?? []);
    } catch (e) {
      const msg = "Error al cargar tenants";
      toast ? toast({ title: 'Error', description: msg, type: 'error' }) : console.warn(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (isPlatformAdmin) loadTenants(); }, [isPlatformAdmin]);

  async function createTenant() {
    try {
      setSubmitting(true);
      const res = await rbacFetch('/api/admin/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.status === 403) {
        const msg = "No tienes permisos suficientes.";
        toast ? toast({ title: 'Error', description: msg, type: 'error' }) : console.warn(msg);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      toast ? toast({ title: 'Tenant creado', type: 'success' }) : console.warn('Tenant creado');
      setForm({ nombre: '', slug: '', owner_email: '', owner_nombre: '' });
      await loadTenants();
    } catch (e: any) {
      const msg = 'Error creando tenant';
      toast ? toast({ title: 'Error', description: msg, type: 'error' }) : console.warn(msg, e?.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingPerm) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6">
          <div className="text-sm text-muted-foreground">Verificando permisos...</div>
        </div>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6">
          <h2 className="text-lg font-semibold">Sin acceso</h2>
          <p className="text-sm text-muted-foreground mt-1">No tienes permisos para ver esta sección.</p>
          <Link href="/configuracion/seguridad" className="inline-flex mt-4 px-3 py-2 rounded-lg border">← Volver a Seguridad</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏢 Tenants</h1>
      </div>
      <BackToSecurity />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Crear Tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Input placeholder="Owner Email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
            <Input placeholder="Owner Nombre (opcional)" value={form.owner_nombre} onChange={(e) => setForm({ ...form, owner_nombre: e.target.value })} />
          </div>
          <div className="flex justify-end">
            <Button onClick={createTenant} disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando tenants...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs uppercase">Nombre</th>
                    <th className="px-4 py-2 text-left text-xs uppercase">Slug</th>
                    <th className="px-4 py-2 text-left text-xs uppercase">Activo</th>
                    <th className="px-4 py-2 text-left text-xs uppercase">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="px-4 py-2">{t.nombre}</td>
                      <td className="px-4 py-2">{t.slug}</td>
                      <td className="px-4 py-2">{t.activo ? 'Sí' : 'No'}</td>
                      <td className="px-4 py-2">{t.created_at ? new Date(t.created_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


