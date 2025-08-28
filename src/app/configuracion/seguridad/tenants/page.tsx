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
  rut: string;
  activo?: boolean;
  created_at?: string;
}

interface TenantWithAdmin extends Tenant {
  admin?: {
    id: string;
    email: string;
    nombre: string;
    role_id: string;
    role_nombre: string;
  };
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantWithAdmin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState({ 
    nombre: "", 
    rut: "", 
    admin_email: "", 
    admin_nombre: "", 
    admin_password: "" 
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const { addToast: toast, error: toastError, success: toastSuccess } = useToast();
  const { allowed: isPlatformAdmin } = useCan('rbac.platform_admin');
  const { allowed: canTenantsRead } = useCan('rbac.tenants.read');
  const loadingPerm = false; // useCan ya retorna allowed=true cuando perm es falsy y no flapea

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

  useEffect(() => { if (isPlatformAdmin || canTenantsRead) loadTenants(); }, [isPlatformAdmin, canTenantsRead]);

  async function createTenant() {
    try {
      setSubmitting(true);
      const res = await rbacFetch('/api/admin/tenants', {
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
      
      // Mostrar mensaje de éxito con información del admin creado
      const successMsg = data?.data?.admin 
        ? `Tenant creado exitosamente. Admin: ${data.data.admin.email}`
        : 'Tenant creado exitosamente';
      
      toast ? toast({ title: 'Éxito', description: successMsg, type: 'success' }) : console.warn(successMsg);
      setForm({ nombre: '', rut: '', admin_email: '', admin_nombre: '', admin_password: '' });
      await loadTenants();
    } catch (e: any) {
      const msg = 'Error creando tenant';
      toast ? toast({ title: 'Error', description: msg, type: 'error' }) : console.warn(msg, e?.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Validar si el formulario está completo
  const isFormValid = form.nombre && form.rut && form.admin_email;

  if (loadingPerm) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6">
          <div className="text-sm text-muted-foreground">Verificando permisos...</div>
        </div>
      </div>
    );
  }

  if (!(isPlatformAdmin || canTenantsRead)) {
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
    <div className="max-w-5xl">

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Crear Tenant con Administrador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Datos del Tenant</label>
              <Input 
                placeholder="Nombre de la empresa" 
                value={form.nombre} 
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} 
              />
              <Input 
                placeholder="RUT (ej: 12.345.678-9)" 
                value={form.rut} 
                onChange={(e) => setForm({ ...form, rut: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Datos del Administrador</label>
              <Input 
                placeholder="Email del administrador" 
                type="email"
                value={form.admin_email} 
                onChange={(e) => setForm({ ...form, admin_email: e.target.value })} 
              />
              <Input 
                placeholder="Nombre del administrador" 
                value={form.admin_nombre} 
                onChange={(e) => setForm({ ...form, admin_nombre: e.target.value })} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Contraseña del Administrador</label>
            <Input 
              placeholder="Contraseña (opcional, por defecto: admin123)" 
              type="password"
              value={form.admin_password} 
              onChange={(e) => setForm({ ...form, admin_password: e.target.value })} 
            />
            <p className="text-xs text-muted-foreground">
              Si no se especifica contraseña, se usará "admin123" por defecto
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={createTenant} disabled={submitting || !isFormValid}>
              {submitting ? 'Creando...' : 'Crear Tenant con Admin'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Listado de Tenants</CardTitle>
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
                    <th className="px-4 py-2 text-left text-xs uppercase">RUT</th>
                    <th className="px-4 py-2 text-left text-xs uppercase">Admin</th>
                    <th className="px-4 py-2 text-left text-xs uppercase">Activo</th>
                    <th className="px-4 py-2 text-left text-xs uppercase">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="px-4 py-2">{t.nombre}</td>
                      <td className="px-4 py-2">{t.rut}</td>
                      <td className="px-4 py-2">
                        {t.admin ? (
                          <div className="text-sm">
                            <div className="font-medium">{t.admin.email}</div>
                            <div className="text-muted-foreground">{t.admin.nombre}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
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


